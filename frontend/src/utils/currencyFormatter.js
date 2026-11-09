/**
 * Arthivex Centralized Currency Formatting Utility
 * Standardizes INR (₹) formatting using the 'en-IN' locale,
 * while authoritatively preserving underlying account currency denominations (USD, EUR).
 */

export function getCurrencySymbol(currency = 'INR') {
  const curr = (currency || 'INR').toUpperCase().trim();
  switch (curr) {
    case 'INR':
      return '₹';
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    default:
      return curr;
  }
}

export function formatCurrency(amount, currency = 'INR', options = {}) {
  const num = typeof amount === 'number' ? amount : parseFloat(amount) || 0;
  const curr = (currency || 'INR').toUpperCase().trim();

  let minFrac = options.minimumFractionDigits;
  let maxFrac = options.maximumFractionDigits;

  if (maxFrac !== undefined && minFrac === undefined) {
    minFrac = Math.min(2, maxFrac);
  } else if (minFrac === undefined) {
    minFrac = 2;
  }

  if (maxFrac === undefined) {
    maxFrac = Math.max(minFrac, 2);
  }

  // Strict ECMAScript constraint: minimumFractionDigits <= maximumFractionDigits
  if (minFrac > maxFrac) {
    minFrac = maxFrac;
  }

  const showCode = Boolean(options.showCode);

  let locale = 'en-IN';
  if (curr === 'USD') {
    locale = 'en-US';
  } else if (curr === 'EUR') {
    locale = 'de-DE';
  }

  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: curr,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: minFrac,
      maximumFractionDigits: maxFrac
    });
    const formatted = formatter.format(num);
    return showCode ? `${formatted} ${curr}` : formatted;
  } catch {
    const symbol = getCurrencySymbol(curr);
    try {
      return `${symbol}${num.toLocaleString(locale, { minimumFractionDigits: minFrac, maximumFractionDigits: maxFrac })}`;
    } catch {
      return `${symbol}${num.toFixed(maxFrac)}`;
    }
  }
}

