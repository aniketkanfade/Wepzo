import { create } from 'zustand';

const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', AUD: 'A$' };

export const useSiteSettings = create(set => ({
  business: {},
  previewTheme: null,
  setBusiness: business => set(state => ({
    business: state.previewTheme ? {
      ...(business || {}),
      primaryColor: state.previewTheme.primaryColor || business?.primaryColor,
      themeColors: { ...(business?.themeColors || {}), ...(state.previewTheme.themeColors || {}) },
    } : business || {},
  })),
  setPreviewTheme: previewTheme => set(state => ({
    previewTheme,
    business: {
      ...state.business,
      primaryColor: previewTheme?.primaryColor || state.business.primaryColor,
      themeColors: { ...(state.business.themeColors || {}), ...(previewTheme?.themeColors || {}) },
    },
  })),
}));

export function formatMoney(value, business = useSiteSettings.getState().business) {
  const currency = business.currency || business.paymentCurrency || 'INR';
  const configuredSymbol = String(business.currencySymbol || '').trim();
  const symbol = /[\u00C3\u00C2\u00E2\u00EF\uFFFD]/.test(configuredSymbol) ? (CURRENCY_SYMBOLS[currency] || currency) : configuredSymbol || CURRENCY_SYMBOLS[currency] || currency;
  const digits = Math.min(4, Math.max(0, Number(business.decimalDigits) || 0));
  const amount = Number(value) || 0;
  const formatted = amount.toLocaleString('en-IN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return business.currencyPosition === 'right' ? `${formatted} ${symbol}` : `${symbol}${formatted}`;
}
