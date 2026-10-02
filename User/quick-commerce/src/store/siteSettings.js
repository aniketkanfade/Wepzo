import { create } from 'zustand';

const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', AUD: 'A$' };

export const useSiteSettings = create(set => ({
  business: {},
  setBusiness: business => set({ business: business || {} }),
}));

export function formatMoney(value, business = useSiteSettings.getState().business) {
  const currency = business.currency || business.paymentCurrency || 'INR';
  const symbol = business.currencySymbol || CURRENCY_SYMBOLS[currency] || currency;
  const digits = Math.min(4, Math.max(0, Number(business.decimalDigits) || 0));
  const amount = Number(value) || 0;
  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return business.currencyPosition === 'right' ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
}
