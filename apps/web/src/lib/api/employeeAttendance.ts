import api, { type ApiResponse } from '../api';

export type EmployeeAttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE' | 'HOLIDAY';

export interface EmployeeAttendanceRecord {
  id: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: EmployeeAttendanceStatus;
  workHours?: string | number;
  remarks?: string;
  employee?: {
    id: string;
    employeeId: string;
    position: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
    department?: {
      id: string;
      name: string;
    };
  };
}

export interface DailyAttendanceItem {
  employee: {
    id: string;
    employeeId: string;
    name: string;
    email: string;
    department?: {
      id: string;
      name: string;
    };
  };
  attendance: EmployeeAttendanceRecord | null;
  status: EmployeeAttendanceStatus | 'ABSENT';
  checkIn: string | null;
  checkOut: string | null;
  workHours: string | number | null;
}

export interface EmployeeAttendanceSummary {
  employeeId: string;
  month: number;
  year: number;
  totalWorkingDays: number;
  present: number;
  absent: number;
  halfDay: number;
  onLeave: number;
  holiday: number;
  totalWorkHours: number;
  averageWorkHours: number;
  lateArrivals: number;
  attendancePercentage: number;
}

export interface MonthlyReport {
  month: number;
  year: number;
  departmentId?: string;
  totalEmployees: number;
  overallStatistics: {
    totalPresent: number;
    totalAbsent: number;
    totalLateArrivals: number;
    averageAttendancePercentage: number;
  };
  employees: Array<{
    employee: {
      id: string;
      employeeId: string;
      name: string;
      department?: string;
    };
    present: number;
    absent: number;
    halfDay: number;
    onLeave: number;
    holiday: number;
    totalWorkHours: number;
    averageWorkHours: number;
    lateArrivals: number;
    attendancePercentage: number;
  }>;
}

export interface LateArrival {
  employee: {
    id: string;
    employeeId: string;
    name: string;
    email: string;
    department?: string;
  };
  checkIn: string;
  lateBy: number; // minutes
}

export interface Absentee {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department?: string;
}

export interface ManualEntryInput {
  employeeId: string;
  date: string;
  checkIn: string;
  checkOut: string;
  status?: EmployeeAttendanceStatus;
  remarks?: string;
}

export interface MarkLeaveInput {
  employeeId: string;
  date: string;
  remarks?: string;
}

export interface MarkHolidayInput {
  date: string;
  departmentId?: string;
  remarks?: string;
}

export interface HolidayResult {
  date: string;
  employeesMarked: number;
  status: 'HOLIDAY';
}

export const employeeAttendanceApi = {
  // Check in
  checkIn: async (employeeId?: string): Promise<EmployeeAttendanceRecord> => {
    const response = await api.post<ApiResponse<EmployeeAttendanceRecord>>(
      '/api/v1/employee-attendance/check-in',
      { employeeId }
    );
    return response.data.data!;
  },

  // Check out
  checkOut: async (employeeId?: string): Promise<EmployeeAttendanceRecord> => {
    const response = await api.post<ApiResponse<EmployeeAttendanceRecord>>(
      '/api/v1/employee-attendance/check-out',
      { employeeId }
    );
    return response.data.data!;
  },

  // Manual entry
  manualEntry: async (data: ManualEntryInput): Promise<EmployeeAttendanceRecord> => {
    const response = await api.post<ApiResponse<EmployeeAttendanceRecord>>(
      '/api/v1/employee-attendance/manual',
      data
    );
    return response.data.data!;
  },

  // Get employee attendance for a month
  getEmployeeAttendance: async (
    employeeId: string,
    month: number,
    year: number
  ): Promise<EmployeeAttendanceRecord[]> => {
    const response = await api.get<ApiResponse<EmployeeAttendanceRecord[]>>(
      `/api/v1/employee-attendance/employee/${employeeId}?month=${month}&year=${year}`
    );
    return response.data.data!;
  },

  // Get employee attendance summary
  getEmployeeSummary: async (
    employeeId: string,
    month: number,
    year: number
  ): Promise<EmployeeAttendanceSummary> => {
    const response = await api.get<ApiResponse<EmployeeAttendanceSummary>>(
      `/api/v1/employee-attendance/employee/${employeeId}/summary?month=${month}&year=${year}`
    );
    return response.data.data!;
  },

  // Get daily attendance for all employees
  getDailyAttendance: async (date?: string, departmentId?: string): Promise<DailyAttendanceItem[]> => {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (departmentId) params.append('departmentId', departmentId);

    const response = await api.get<ApiResponse<DailyAttendanceItem[]>>(
      `/api/v1/employee-attendance/daily?${params.toString()}`
    );
    return response.data.data!;
  },

  // Get today's attendance
  getTodayAttendance: async (departmentId?: string): Promise<DailyAttendanceItem[]> => {
    const params = departmentId ? `?departmentId=${departmentId}` : '';
    const response = await api.get<ApiResponse<DailyAttendanceItem[]>>(
      `/api/v1/employee-attendance/today${params}`
    );
    return response.data.data!;
  },

  // Generate monthly report
  getMonthlyReport: async (month: number, year: number, departmentId?: string): Promise<MonthlyReport> => {
    const params = new URLSearchParams();
    params.append('month', month.toString());
    params.append('year', year.toString());
    if (departmentId) params.append('departmentId', departmentId);

    const response = await api.get<ApiResponse<MonthlyReport>>(
      `/api/v1/employee-attendance/report?${params.toString()}`
    );
    return response.data.data!;
  },

  // Get late arrivals
  getLateArrivals: async (date: string, graceMinutes?: number): Promise<LateArrival[]> => {
    const params = new URLSearchParams();
    params.append('date', date);
    if (graceMinutes !== undefined) params.append('graceMinutes', graceMinutes.toString());

    const response = await api.get<ApiResponse<LateArrival[]>>(
      `/api/v1/employee-attendance/late-arrivals?${params.toString()}`
    );
    return response.data.data!;
  },

  // Get absentees
  getAbsentees: async (date: string, departmentId?: string): Promise<Absentee[]> => {
    const params = new URLSearchParams();
    params.append('date', date);
    if (departmentId) params.append('departmentId', departmentId);

    const response = await api.get<ApiResponse<Absentee[]>>(
      `/api/v1/employee-attendance/absentees?${params.toString()}`
    );
    return response.data.data!;
  },

  // Mark employee on leave
  markOnLeave: async (data: MarkLeaveInput): Promise<EmployeeAttendanceRecord> => {
    const response = await api.post<ApiResponse<EmployeeAttendanceRecord>>(
      '/api/v1/employee-attendance/mark-leave',
      data
    );
    return response.data.data!;
  },

  // Mark holiday
  markHoliday: async (data: MarkHolidayInput): Promise<HolidayResult> => {
    const response = await api.post<ApiResponse<HolidayResult>>(
      '/api/v1/employee-attendance/mark-holiday',
      data
    );
    return response.data.data!;
  },
};
