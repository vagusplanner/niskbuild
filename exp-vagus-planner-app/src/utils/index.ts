export const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatCurrency = (amount: number) => {
  return `$${amount.toFixed(2)}`;
};

export const createPageUrl = (path: string) => {
  return `/${path.replace(/^\/+/, '')}`;
};

export const formatTime = (time: string | Date) => {
  const d = typeof time === 'string' ? new Date(time) : time;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

export const formatDateShort = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
