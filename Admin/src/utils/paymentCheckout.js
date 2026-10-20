const checkoutScripts = new Map();

function loadScript(src, name, ready) {
  if (ready()) return Promise.resolve(true);
  if (checkoutScripts.has(name)) return checkoutScripts.get(name);
  const promise = new Promise(resolve => {
    const selector = `script[data-wepzo-checkout="${name}"]`;
    const existing = document.querySelector(selector);
    const script = existing || document.createElement('script');
    const finish = loaded => {
      const available = loaded && ready();
      if (!available) {
        script.remove();
        checkoutScripts.delete(name);
      }
      resolve(available);
    };
    script.addEventListener('load', () => finish(true), { once: true });
    script.addEventListener('error', () => finish(false), { once: true });
    if (!existing) {
      script.src = src;
      script.async = true;
      script.dataset.wepzoCheckout = name;
      document.body.appendChild(script);
    }
  });
  checkoutScripts.set(name, promise);
  return promise;
}

export function paymentReturnUrl() {
  const url = new URL(window.location.href);
  ['wepzoOrderId', 'paymentGateway', 'paymentFlow', 'order_id'].forEach(key => url.searchParams.delete(key));
  return `${url.origin}${url.pathname}${url.search}${url.hash}`;
}

export function paymentReturnDetails() {
  const url = new URL(window.location.href);
  return {
    purchaseId: url.searchParams.get('wepzoOrderId') || '',
    gateway: url.searchParams.get('paymentGateway') || '',
    flow: url.searchParams.get('paymentFlow') || '',
  };
}

export function clearPaymentReturnDetails() {
  const url = new URL(window.location.href);
  ['wepzoOrderId', 'paymentGateway', 'paymentFlow', 'order_id'].forEach(key => url.searchParams.delete(key));
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
}

export async function launchPaymentCheckout(payment, { onVerified, onFailure, onDismiss, prefill = {} } = {}) {
  if (payment?.provider === 'phonepe' && payment.redirectUrl) {
    window.location.assign(payment.redirectUrl);
    return { redirecting: true };
  }

  if (payment?.provider === 'razorpay') {
    const loaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js', 'razorpay', () => !!window.Razorpay);
    if (!loaded || !payment.keyId || !payment.orderId || !payment.amount) throw new Error('Razorpay checkout is not configured correctly.');
    return new Promise((resolve, reject) => {
      const checkout = new window.Razorpay({
        key: payment.keyId,
        amount: payment.amount,
        currency: payment.currency,
        name: payment.name || 'WEPZO',
        description: payment.description || '',
        order_id: payment.orderId,
        prefill,
        theme: { color: '#1d4ed8' },
        modal: { ondismiss: () => { onDismiss?.(); resolve({ dismissed: true }); } },
        handler: async response => {
          try { resolve(await onVerified({ ...response, purchaseId: payment.purchaseId, orderId: payment.orderId })); }
          catch (error) { onFailure?.(error); reject(error); }
        },
      });
      checkout.on('payment.failed', event => {
        const error = new Error(event.error?.description || 'Payment failed. You can retry.');
        onFailure?.(error);
        reject(error);
      });
      checkout.open();
    });
  }

  if (payment?.provider === 'cashfree' && payment.paymentSessionId) {
    const loaded = await loadScript('https://sdk.cashfree.com/js/v3/cashfree.js', 'cashfree', () => typeof window.Cashfree === 'function');
    if (!loaded) throw new Error('Cashfree checkout could not be loaded. Please retry.');
    const cashfree = window.Cashfree({ mode: payment.environment || 'sandbox' });
    const result = await cashfree.checkout({ paymentSessionId: payment.paymentSessionId, redirectTarget: '_modal' });
    if (result?.error) throw new Error(result.error.message || 'Cashfree checkout failed.');
    return onVerified({ purchaseId: payment.purchaseId, orderId: payment.orderId });
  }

  throw new Error('The selected payment gateway returned an invalid checkout session.');
}
