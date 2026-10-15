const dns = require('dns').promises;
const net = require('net');
const tls = require('tls');

class SmtpSession {
  constructor(socket) {
    this.socket = socket;
    this.buffer = '';
    this.lines = [];
    this.responses = [];
    this.waiters = [];
    this.failure = null;
    this.onData = chunk => {
      this.buffer += chunk.toString('utf8');
      let newline;
      while ((newline = this.buffer.indexOf('\n')) !== -1) {
        const line = this.buffer.slice(0, newline).replace(/\r$/, '');
        this.buffer = this.buffer.slice(newline + 1);
        this.lines.push(line);
        if (/^\d{3} /.test(line)) this.responses.push(this.lines.splice(0).join('\n'));
      }
      this.flush();
    };
    this.onError = error => {
      this.failure = error;
      this.flush();
    };
    socket.on('data', this.onData);
    socket.on('error', this.onError);
  }

  flush() {
    while (this.waiters.length && (this.failure || this.responses.length)) {
      const waiter = this.waiters.shift();
      if (this.failure) waiter.reject(this.failure);
      else waiter.resolve(this.responses.shift());
    }
  }

  response() {
    if (this.failure) return Promise.reject(this.failure);
    if (this.responses.length) return Promise.resolve(this.responses.shift());
    return new Promise((resolve, reject) => this.waiters.push({ resolve, reject }));
  }

  async command(value, acceptedCodes) {
    this.socket.write(`${value}\r\n`);
    const response = await this.response();
    const code = Number(response.slice(0, 3));
    if (!acceptedCodes.includes(code)) throw new Error(`SMTP server rejected a command (${code}).`);
    return response;
  }

  detach() {
    this.socket.removeListener('data', this.onData);
    this.socket.removeListener('error', this.onError);
  }
}

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

async function publicIpv4ForHost(host) {
  if (net.isIP(host)) {
    if (net.isIP(host) !== 4 || isPrivateIpv4(host)) throw new Error('SMTP host must resolve to a public server address.');
    return host;
  }
  const records = await dns.lookup(host, { all: true, family: 4, verbatim: true });
  const addresses = records.map(record => record.address);
  if (!addresses.length || addresses.some(isPrivateIpv4)) throw new Error('SMTP host must resolve only to public server addresses.');
  return addresses[0];
}

function openSocket({ host, address, port, encryption }) {
  return new Promise((resolve, reject) => {
    const socket = encryption === 'ssl'
      ? tls.connect({ host: address, port, servername: host }, () => resolve(socket))
      : net.connect({ host: address, port }, () => resolve(socket));
    socket.setTimeout(20000, () => socket.destroy(new Error('SMTP connection timed out.')));
    socket.once('error', reject);
  });
}

function upgradeToTls(socket, host) {
  return new Promise((resolve, reject) => {
    const secureSocket = tls.connect({ socket, servername: host }, () => resolve(secureSocket));
    secureSocket.once('error', reject);
  });
}

function assertAddress(address, label) {
  if (!/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(address)) {
    throw Object.assign(new Error(`${label} is not a valid email address.`), { status: 400 });
  }
  return address;
}

async function sendEmail({ host, port, encryption, username, password, from, fromName, to, subject, text }) {
  const smtpHost = String(host || '').trim();
  const smtpPort = Number(port);
  const security = String(encryption || 'tls').toLowerCase();
  if (!smtpHost || !Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) {
    throw Object.assign(new Error('Enter a valid SMTP host and port.'), { status: 400 });
  }
  if (!['tls', 'ssl'].includes(security)) throw Object.assign(new Error('Choose TLS or SSL SMTP encryption.'), { status: 400 });
  const sender = assertAddress(String(from || '').trim(), 'Sender email');
  const recipient = assertAddress(String(to || '').trim(), 'Recipient email');
  if (!username || !password) throw Object.assign(new Error('SMTP username and password are required.'), { status: 400 });
  if ((security === 'ssl' && smtpPort !== 465) || (security === 'tls' && ![587, 2525].includes(smtpPort))) {
    throw Object.assign(new Error('Use port 465 for SSL or port 587/2525 for STARTTLS.'), { status: 400 });
  }
  const address = await publicIpv4ForHost(smtpHost);
  let socket = await openSocket({ host: smtpHost, address, port: smtpPort, encryption: security });
  let session = new SmtpSession(socket);
  try {
    const greeting = await session.response();
    if (Number(greeting.slice(0, 3)) !== 220) throw new Error('SMTP server did not accept the connection.');
    await session.command('EHLO wepzo.local', [250]);
    if (security === 'tls') {
      await session.command('STARTTLS', [220]);
      session.detach();
      socket = await upgradeToTls(socket, smtpHost);
      session = new SmtpSession(socket);
      await session.command('EHLO wepzo.local', [250]);
    }

    await session.command('AUTH LOGIN', [334]);
    await session.command(Buffer.from(String(username)).toString('base64'), [334]);
    await session.command(Buffer.from(String(password)).toString('base64'), [235]);
    await session.command(`MAIL FROM:<${sender}>`, [250]);
    await session.command(`RCPT TO:<${recipient}>`, [250, 251]);
    await session.command('DATA', [354]);

    const cleanName = String(fromName || 'WEPZO').replace(/[\r\n"]/g, '').trim();
    const cleanSubject = String(subject || '').replace(/[\r\n]/g, ' ').trim();
    if (!cleanSubject) throw Object.assign(new Error('Email subject is required.'), { status: 400 });
    if (typeof text !== 'string' || !text.trim()) throw Object.assign(new Error('Email message is required.'), { status: 400 });
    const message = [
      `From: "${cleanName}" <${sender}>`,
      `To: <${recipient}>`,
      `Subject: ${cleanSubject}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${Date.now()}.${Math.random().toString(16).slice(2)}@wepzo.local>`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: 8bit',
      '',
      text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n/g, '\r\n'),
    ].join('\r\n').replace(/(^|\r\n)\./g, '$1..');
    socket.write(`${message}\r\n.\r\n`);
    await session.response().then(response => {
      if (Number(response.slice(0, 3)) !== 250) throw new Error('SMTP server did not accept the message.');
    });
    socket.write('QUIT\r\n');
  } finally {
    session.detach();
    socket.destroy();
  }
}

async function sendTestEmail(settings) {
  return sendEmail({
    ...settings,
    subject: 'WEPZO SMTP test email',
    text: 'This is a test email from your WEPZO mail configuration.',
  });
}

module.exports = { sendEmail, sendTestEmail };
