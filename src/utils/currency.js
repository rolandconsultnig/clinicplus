/**
 * Currency formatting utilities - Multi-currency support
 * Supports: NGN (Primary), USD, EUR, RUB, GBP
 */

const CURRENCY_CONFIG = {
  'NGN': { symbol: '₦', locale: 'en-NG', code: 'NGN' },
  'USD': { symbol: '$', locale: 'en-US', code: 'USD' },
  'EUR': { symbol: '€', locale: 'en-EU', code: 'EUR' },
  'RUB': { symbol: '₽', locale: 'ru-RU', code: 'RUB' },
  'GBP': { symbol: '£', locale: 'en-GB', code: 'GBP' }
};

export const formatCurrency = (amount, options = {}) => {
  const {
    showSymbol = true,
    decimals = 2,
    currency = 'NGN', // Default to NGN (Primary)
    locale = CURRENCY_CONFIG[currency]?.locale || 'en-NG'
  } = options;

  const currencyInfo = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG['NGN'];

  if (amount === null || amount === undefined || isNaN(amount)) {
    return `${currencyInfo.symbol}0.00`;
  }

  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyInfo.code,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  // Replace currency code with symbol if needed
  return formatted.replace(currencyInfo.code, currencyInfo.symbol);
};

export const formatCurrencySimple = (amount, decimals = 0, currency = 'NGN') => {
  const currencyInfo = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG['NGN'];
  
  if (amount === null || amount === undefined || isNaN(amount)) {
    return `${currencyInfo.symbol}0`;
  }

  return `${currencyInfo.symbol}${amount.toLocaleString(currencyInfo.locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
};

export const CURRENCY_SYMBOL = '₦'; // Default: NGN (Primary)
export const CURRENCY_CODE = 'NGN'; // Default: NGN (Primary)
export const SUPPORTED_CURRENCIES = ['NGN', 'USD', 'EUR', 'RUB', 'GBP'];
export const getCurrencySymbol = (currency = 'NGN') => {
  return CURRENCY_CONFIG[currency]?.symbol || '₦';
};

