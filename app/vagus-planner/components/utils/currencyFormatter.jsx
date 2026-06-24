export const formatCurrency = (amount, currencyCode = 'USD', locale = 'en-US') => {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  } catch (error) {
    // Fallback if currency code is invalid
    return `${amount.toFixed(2)}`;
  }
};

export const formatDate = (dateString, format = 'MM/DD/YYYY', locale = 'en-US') => {
  const date = new Date(dateString);
  
  if (format === 'DD/MM/YYYY') {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
  
  return date.toLocaleDateString(locale, { month: '2-digit', day: '2-digit', year: 'numeric' });
};

export const getCurrencySymbol = (currencyCode) => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(0).replace(/\d/g, '').trim();
  } catch {
    return '$';
  }
};