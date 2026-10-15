const dns = require('dns').promises;
const https = require('https');
const net = require('net');
const { URL } = require('url');

const templateDefinitions = {
  customer_registration_otp: ['smsTemplateCustomerRegistrationOtp', 'smsMessageCustomerRegistrationOtp'],
  customer_login_otp: ['smsTemplateCustomerLoginOtp', 'smsMessageCustomerLoginOtp'],
  customer_forgot_password_otp: ['smsTemplateCustomerForgotPassword', 'smsMessageCustomerForgotPassword'],
  admin_forgot_password_otp: ['smsTemplateAdminForgotPassword', 'smsMessageAdminForgotPassword'],
  deliveryman_forgot_password_otp: ['smsTemplateDeliverymanForgotPassword', 'smsMessageDeliverymanForgotPassword'],
  customer_delivery_verification_otp: ['smsTemplateDeliveryVerificationOtp', 'smsMessageDeliveryVerificationOtp'],
  store_order_received: ['smsTemplateStoreOrderReceived', 'smsMessageStoreOrderReceived'],
  customer_order_delivered: ['smsTemplateCustomerOrderDelivered', 'smsMessageCustomerOrderDelivered'],
  customer_password_reset: ['smsTemplateCustomerPasswordReset', 'smsMessageCustomerPasswordReset'],
  admin_password_reset: ['smsTemplateAdminPasswordReset', 'smsMessageAdminPasswordReset'],
  deliveryman_password_reset: ['smsTemplateDeliverymanPasswordReset', 'smsMessageDeliverymanPasswordReset'],
};

const demoValues = {
  OTP: '000000',
  ORDER_ID: 'TEST-ORDER',
  STORE_NAME: 'WEPZO Test Store',
  CUSTOMER_NAME: 'WEPZO Test Customer',
  ORDER_AMOUNT: '100',
};

function isPrivateIpv4(address) {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some(value => !Number.isInteger(value) || value < 0 || value > 255)) return true;
  const [a, b] = octets;
  return a === 0 || a === 10 || a === 127 || a >= 224
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && (b === 0 || b === 168))
    || (a === 198 && (b === 18 || b === 19));
}

async function publicIpv4ForHost(hostname) {
  if (net.isIP(hostname)) {
    if (net.isIP(hostname) !== 4 || isPrivateIpv4(hostname)) throw new Error('Custom SMS API host must resolve to a public HTTPS address.');
    return hostname;
  }
  const records = await dns.lookup(hostname, { all: true, family: 4, verbatim: true });
  const addresses = records.map(record => record.address);
  if (!addresses.length || addresses.some(isPrivateIpv4)) throw new Error('Custom SMS API host must resolve only to public IP addresses.');
  return addresses[0];
}

function postHttps(urlValue, { headers, body, pinHost = false }) {
  return new Promise(async (resolve, reject) => {
    let url;
    try {
      url = new URL(urlValue);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('SMS provider URL must use HTTPS and must not include credentials.');
      const pinnedAddress = pinHost ? await publicIpv4ForHost(url.hostname) : undefined;
      const request = https.request(url, {
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
        timeout: 15000,
        ...(pinnedAddress ? {
          servername: url.hostname,
          lookup: (_hostname, _options, callback) => callback(null, pinnedAddress, 4),
        } : {}),
      }, response => {
        const chunks = [];
        let size = 0;
        response.on('data', chunk => {
          size += chunk.length;
          if (size <= 16 * 1024) chunks.push(chunk);
        });
        response.on('end', () => resolve({ status: response.statusCode || 0, body: Buffer.concat(chunks).toString('utf8') }));
      });
      request.on('timeout', () => request.destroy(new Error('SMS provider request timed out.')));
      request.on('error', reject);
      request.end(body);
    } catch (error) {
      reject(error);
    }
  });
}

function renderTemplate(template, otp) {
  return String(template).replace(/#([A-Z0-9_]+)#/g, (_match, name) => name === 'OTP' ? otp : (demoValues[name] || 'TEST'));
}

async function sendSmsTest({ settings, templateId, phone, otp }) {
  if (!settings.smsGatewayEnabled) throw Object.assign(new Error('Enable the SMS Gateway before sending a test SMS.'), { status: 400 });
  const normalizedPhone = String(phone || '').replace(/\D/g, '');
  if (!/^[6-9]\d{9}$/.test(normalizedPhone)) throw Object.assign(new Error('Enter a valid 10-digit Indian mobile number.'), { status: 400 });
  const definition = templateDefinitions[String(templateId || '')];
  if (!definition) throw Object.assign(new Error('Select a supported SMS template.'), { status: 400 });

  const [templateIdKey, messageKey] = definition;
  const providerTemplateId = String(settings[templateIdKey] || '').trim();
  const configuredMessage = String(settings[messageKey] || '').trim();
  const message = renderTemplate(configuredMessage || 'WEPZO test OTP: #OTP#', otp);
  const provider = String(settings.smsGateway || 'MSG91').trim().toLowerCase();
  const phoneWithCountryCode = `91${normalizedPhone}`;
  let result;

  if (provider === 'msg91') {
    if (!settings.smsApiKey) throw Object.assign(new Error('Configure the MSG91 API key first.'), { status: 400 });
    if (!providerTemplateId) throw Object.assign(new Error('Add the selected template ID before testing MSG91.'), { status: 400 });
    const variables = {};
    let index = 1;
    String(configuredMessage || '#OTP#').replace(/#([A-Z0-9_]+)#/g, (_match, name) => {
      variables[`var${index++}`] = name === 'OTP' ? otp : (demoValues[name] || 'TEST');
      return _match;
    });
    const body = JSON.stringify({
      template_id: providerTemplateId,
      recipients: [{ mobiles: phoneWithCountryCode, ...variables }],
    });
    result = await postHttps('https://control.msg91.com/api/v5/flow/', {
      headers: { authkey: settings.smsApiKey, 'Content-Type': 'application/json' },
      body,
    });
  } else if (provider === 'textlocal') {
    if (!settings.smsApiKey || !settings.smsSenderId) {
      throw Object.assign(new Error('Configure the Textlocal API key and sender ID first.'), { status: 400 });
    }
    const body = new URLSearchParams({
      apikey: settings.smsApiKey,
      numbers: phoneWithCountryCode,
      sender: settings.smsSenderId,
      message,
    }).toString();
    result = await postHttps('https://api.textlocal.in/send/', {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  } else if (provider === 'twilio') {
    if (!settings.twilioAccountSid || !settings.twilioAuthToken || !settings.smsSenderId) {
      throw Object.assign(new Error('Configure the Twilio Account SID, Auth Token, and sender number first.'), { status: 400 });
    }
    const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(settings.twilioAccountSid)}/Messages.json`;
    const body = new URLSearchParams({ To: `+${phoneWithCountryCode}`, From: settings.smsSenderId, Body: message }).toString();
    const auth = Buffer.from(`${settings.twilioAccountSid}:${settings.twilioAuthToken}`).toString('base64');
    result = await postHttps(endpoint, { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  } else if (provider === 'custom') {
    if (!settings.smsApiKey || !settings.smsApiUrl) throw Object.assign(new Error('Configure the custom SMS API URL and API key first.'), { status: 400 });
    result = await postHttps(settings.smsApiUrl, {
      headers: { Authorization: `Bearer ${settings.smsApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: `+${phoneWithCountryCode}`, sender: settings.smsSenderId || '', message, templateId: providerTemplateId }),
      pinHost: true,
    });
  } else {
    throw Object.assign(new Error('The selected SMS provider is not supported.'), { status: 400 });
  }

  if (result.status < 200 || result.status >= 300) throw new Error(`SMS provider rejected the request (HTTP ${result.status}).`);
  const responseText = result.body.trim();
  if (/^[\[{]/.test(responseText)) {
    let response;
    try {
      response = JSON.parse(responseText);
    } catch (error) {
      throw new Error(`SMS provider returned invalid JSON (${error.message}).`);
    }
    if (response && (String(response.type || response.status || '').toLowerCase() === 'error'
      || String(response.status || '').toLowerCase() === 'failure')) {
      throw new Error('SMS provider rejected the message. Check the provider credentials and template.');
    }
  }
  return { provider: settings.smsGateway || 'MSG91' };
}

module.exports = { sendSmsTest };
