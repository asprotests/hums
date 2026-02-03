// Name formatting
export const formatFullName = (firstName: string, lastName: string): string => {
  return `${firstName} ${lastName}`.trim();
};

// Date formatting
export const formatDate = (date: Date | string, locale: string = 'en-US'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatDateTime = (date: Date | string, locale: string = 'en-US'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Currency formatting
export const formatCurrency = (
  amount: number,
  currency: string = 'USD',
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount);
};

// GPA formatting
export const formatGPA = (gpa: number): string => {
  return gpa.toFixed(2);
};

// Phone formatting
export const formatPhone = (phone: string): string => {
  // Format as +252 XX XXX XXXX
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 9) {
    return `+252 ${cleaned.slice(0, 2)} ${cleaned.slice(2, 5)} ${cleaned.slice(5)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('252')) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
  }
  return phone;
};

// Student ID generation
export const generateStudentId = (year: number, sequence: number): string => {
  return `HU-${year}-${sequence.toString().padStart(4, '0')}`;
};

// Employee ID generation
export const generateEmployeeId = (sequence: number): string => {
  return `EMP-${sequence.toString().padStart(4, '0')}`;
};
