/**
 * Date and number formatting utilities
 */

// Date format patterns
const DATE_FORMATS: Record<string, Intl.DateTimeFormatOptions> = {
  'DD/MM/YYYY': { day: '2-digit', month: '2-digit', year: 'numeric' },
  'MM/DD/YYYY': { month: '2-digit', day: '2-digit', year: 'numeric' },
  'YYYY-MM-DD': { year: 'numeric', month: '2-digit', day: '2-digit' },
  'DD-MM-YYYY': { day: '2-digit', month: '2-digit', year: 'numeric' },
};

/**
 * Format a date according to the specified format
 */
export function formatDate(
  date: Date | string | null | undefined,
  format: string = 'DD/MM/YYYY'
): string {
  if (!date) return 'N/A';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return 'Invalid date';

  const options = DATE_FORMATS[format] || DATE_FORMATS['DD/MM/YYYY'];

  // Handle special formats
  if (format === 'YYYY-MM-DD') {
    return d.toISOString().split('T')[0];
  }

  return d.toLocaleDateString('en-GB', options);
}

/**
 * Format a date with time
 */
export function formatDateTime(
  date: Date | string | null | undefined,
  format: string = 'DD/MM/YYYY'
): string {
  if (!date) return 'N/A';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return 'Invalid date';

  const dateStr = formatDate(d, format);
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return `${dateStr} ${timeStr}`;
}

/**
 * Format currency amount
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = 'USD'
): string {
  if (amount === null || amount === undefined) return 'N/A';

  const num = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(num)) return 'N/A';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Format a number with thousand separators
 */
export function formatNumber(
  value: number | string | null | undefined,
  decimals: number = 0
): string {
  if (value === null || value === undefined) return 'N/A';

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return 'N/A';

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num);
}

/**
 * Format a percentage
 */
export function formatPercentage(
  value: number | string | null | undefined,
  decimals: number = 1
): string {
  if (value === null || value === undefined) return 'N/A';

  const num = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(num)) return 'N/A';

  return `${num.toFixed(decimals)}%`;
}

/**
 * Format a time string (HH:MM to 12-hour format)
 */
export function formatTime(time: string | null | undefined): string {
  if (!time) return 'N/A';

  const [hours, minutes] = time.split(':').map(Number);

  if (isNaN(hours) || isNaN(minutes)) return time;

  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;

  return `${hour12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return 'N/A';

  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return 'Invalid date';

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return formatDate(d);
}
