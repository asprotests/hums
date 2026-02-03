// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Phone validation (Somali format)
export const isValidPhone = (phone: string): boolean => {
  // Somali phone numbers: +252 XX XXXXXXX
  const phoneRegex = /^\+?252?\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

// Password validation
export const isValidPassword = (password: string): boolean => {
  // Minimum 8 characters, at least one letter and one number
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  return passwordRegex.test(password);
};

// Student ID validation (e.g., HU-2024-0001)
export const isValidStudentId = (studentId: string): boolean => {
  const studentIdRegex = /^HU-\d{4}-\d{4}$/;
  return studentIdRegex.test(studentId);
};

// Employee ID validation (e.g., EMP-0001)
export const isValidEmployeeId = (employeeId: string): boolean => {
  const employeeIdRegex = /^EMP-\d{4}$/;
  return employeeIdRegex.test(employeeId);
};
