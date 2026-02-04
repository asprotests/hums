import api, { type ApiResponse } from '../api';

// Types for Student Portal

export interface StudentProfile {
  id: string;
  studentId: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    phone?: string;
    avatar?: string;
    isActive: boolean;
  };
  program: {
    id: string;
    name: string;
    code: string;
    type: string;
    department?: {
      id: string;
      name: string;
      code: string;
      faculty?: {
        id: string;
        name: string;
      };
    };
  };
  personalInfo: {
    dateOfBirth?: string;
    gender?: string;
    nationality?: string;
    address?: string;
  };
  emergencyContact: {
    name?: string;
    phone?: string;
  };
  admissionDate: string;
  expectedGraduation?: string;
  status: 'ACTIVE' | 'GRADUATED' | 'SUSPENDED' | 'WITHDRAWN';
  currentSemester: number;
  stats: {
    enrollments: number;
    payments: number;
    borrowings: number;
  };
}

export interface ProgramDetails {
  id: string;
  code: string;
  name: string;
  nameLocal?: string;
  type: string;
  durationYears: number;
  totalCredits: number;
  department?: {
    id: string;
    name: string;
    code: string;
    faculty?: {
      id: string;
      name: string;
    };
  };
  curriculum: Array<{
    semester: number;
    isRequired: boolean;
    course: {
      id: string;
      code: string;
      name: string;
      credits: number;
    };
  }>;
}

export interface Enrollment {
  id: string;
  status: string;
  semester: {
    id: string;
    name: string;
  };
  class: {
    id: string;
    name: string;
    course: {
      id: string;
      code: string;
      name: string;
      credits: number;
    };
    lecturer?: {
      id: string;
      name: string;
    };
  };
  grades: Array<{
    id: string;
    type: string;
    score: number;
    maxScore: number;
    weight: number;
    isFinalized: boolean;
  }>;
  createdAt: string;
}

export interface CurrentGrade {
  enrollmentId: string;
  course: {
    id: string;
    code: string;
    name: string;
    credits: number;
  };
  grades: Array<{
    id: string;
    type: string;
    score: number;
    maxScore: number;
    weight: number;
    percentage: number;
    isFinalized: boolean;
    gradedAt: string;
  }>;
  currentScore: number | null;
  status: string;
}

export interface GradeHistory {
  semester: string;
  course: {
    code: string;
    name: string;
    credits: number;
  };
  finalScore: number;
  letterGrade: string;
  gradePoints: number;
}

export interface GPAInfo {
  semesters: Array<{
    name: string;
    credits: number;
    gpa: number;
  }>;
  totalCredits: number;
  cumulativeGPA: number;
}

export interface AttendanceSummary {
  summary: {
    totalClasses: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    attendanceRate: number;
  };
  byClass: Array<{
    class: {
      id: string;
      name: string;
      course: {
        code: string;
        name: string;
      };
      semester: string;
    } | null;
    stats: {
      present: number;
      absent: number;
      late: number;
      excused: number;
      total: number;
      attendanceRate: number;
    };
  }>;
}

export interface ScheduleItem {
  day: string;
  startTime: string;
  endTime: string;
  room?: string;
  course: {
    id: string;
    code: string;
    name: string;
  };
  class: {
    id: string;
    name: string;
  };
  lecturer?: {
    id: string;
    name: string;
  };
}

export interface BalanceInfo {
  totalInvoiced: number;
  totalPaid: number;
  outstandingBalance: number;
  nextPayment?: {
    amount: number;
    dueDate: string;
  };
}

export interface StudentInvoice {
  id: string;
  invoiceNo: string;
  amount: number;
  totalPaid: number;
  balance: number;
  status: string;
  dueDate: string;
  description?: string;
  semester?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

export interface StudentPayment {
  id: string;
  receiptNo: string;
  amount: number;
  method: string;
  reference?: string;
  invoice?: {
    id: string;
    invoiceNo: string;
  };
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: string;
  priority: string;
  author?: string;
  publishedAt: string;
  expiresAt?: string;
}

export interface Transcript {
  student: {
    studentId: string;
    name: string;
    email: string;
    dateOfBirth?: string;
    admissionDate: string;
    status: string;
  };
  program: {
    name: string;
    code: string;
    department?: string;
    faculty?: string;
  };
  academicRecord: {
    semesters: Array<{
      name: string;
      courses: Array<{
        courseCode: string;
        courseName: string;
        credits: number;
        finalScore: number;
        letterGrade: string;
        gradePoints: number;
      }>;
      semesterCredits: number;
      semesterGPA: number;
    }>;
    totalCredits: number;
    cumulativeGPA: number;
  };
  isOfficial: boolean;
  disclaimer: string;
  generatedAt: string;
}

export interface DashboardData {
  student: {
    id: string;
    studentId: string;
    name: string;
    avatar?: string;
    program: {
      id: string;
      code: string;
      name: string;
    };
    currentSemester: number;
    status: string;
  };
  semester?: {
    id: string;
    name: string;
  };
  stats: {
    enrolledCourses: number;
    cumulativeGPA: number;
    totalCredits: number;
    attendanceRate: number;
    outstandingBalance: number;
  };
  todayClasses: Array<{
    startTime: string;
    endTime: string;
    room?: string;
    course: {
      code: string;
      name: string;
    };
    lecturer?: string;
  }>;
  recentAnnouncements: Array<{
    id: string;
    title: string;
    type: string;
    publishedAt: string;
  }>;
}

export interface FeeStructure {
  id: string;
  programId: string;
  program: {
    id: string;
    code: string;
    name: string;
  };
  academicYear: string;
  tuitionFee: number;
  registrationFee: number;
  libraryFee: number;
  labFee: number;
  otherFees?: Array<{ name: string; amount: number }>;
  totalFee: number;
}

// API Functions

export const studentPortalApi = {
  // Dashboard
  getDashboard: async (): Promise<ApiResponse<DashboardData>> => {
    const response = await api.get<ApiResponse<DashboardData>>('/api/v1/student/dashboard');
    return response.data;
  },

  // Profile
  getProfile: async (): Promise<ApiResponse<StudentProfile>> => {
    const response = await api.get<ApiResponse<StudentProfile>>('/api/v1/student/profile');
    return response.data;
  },

  updateProfile: async (data: {
    phone?: string;
    address?: string;
    emergencyContact?: string;
    emergencyContactPhone?: string;
  }): Promise<ApiResponse<StudentProfile>> => {
    const response = await api.patch<ApiResponse<StudentProfile>>('/api/v1/student/profile', data);
    return response.data;
  },

  uploadPhoto: async (file: File): Promise<ApiResponse<{ avatarUrl: string }>> => {
    const formData = new FormData();
    formData.append('photo', file);
    const response = await api.post<ApiResponse<{ avatarUrl: string }>>('/api/v1/student/profile/photo', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  deletePhoto: async (): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>('/api/v1/student/profile/photo');
    return response.data;
  },

  getProgram: async (): Promise<ApiResponse<ProgramDetails>> => {
    const response = await api.get<ApiResponse<ProgramDetails>>('/api/v1/student/program');
    return response.data;
  },

  // Academic
  getEnrollments: async (): Promise<ApiResponse<{ semester: { id: string; name: string } | null; enrollments: Enrollment[] }>> => {
    const response = await api.get<ApiResponse<{ semester: { id: string; name: string } | null; enrollments: Enrollment[] }>>('/api/v1/student/enrollments');
    return response.data;
  },

  getEnrollmentHistory: async (): Promise<ApiResponse<Enrollment[]>> => {
    const response = await api.get<ApiResponse<Enrollment[]>>('/api/v1/student/enrollments/history');
    return response.data;
  },

  getGrades: async (): Promise<ApiResponse<{ semester: { id: string; name: string } | null; grades: CurrentGrade[] }>> => {
    const response = await api.get<ApiResponse<{ semester: { id: string; name: string } | null; grades: CurrentGrade[] }>>('/api/v1/student/grades');
    return response.data;
  },

  getGradeHistory: async (): Promise<ApiResponse<GradeHistory[]>> => {
    const response = await api.get<ApiResponse<GradeHistory[]>>('/api/v1/student/grades/history');
    return response.data;
  },

  getGPA: async (): Promise<ApiResponse<GPAInfo>> => {
    const response = await api.get<ApiResponse<GPAInfo>>('/api/v1/student/grades/gpa');
    return response.data;
  },

  getTranscript: async (): Promise<ApiResponse<Transcript>> => {
    const response = await api.get<ApiResponse<Transcript>>('/api/v1/student/transcript');
    return response.data;
  },

  getAttendance: async (semesterId?: string): Promise<ApiResponse<AttendanceSummary>> => {
    const params = semesterId ? `?semesterId=${semesterId}` : '';
    const response = await api.get<ApiResponse<AttendanceSummary>>(`/api/v1/student/attendance${params}`);
    return response.data;
  },

  getSchedule: async (): Promise<ApiResponse<{ semester: { id: string; name: string } | null; schedule: ScheduleItem[] }>> => {
    const response = await api.get<ApiResponse<{ semester: { id: string; name: string } | null; schedule: ScheduleItem[] }>>('/api/v1/student/schedule');
    return response.data;
  },

  // Finance
  getFees: async (): Promise<ApiResponse<FeeStructure | null>> => {
    const response = await api.get<ApiResponse<FeeStructure | null>>('/api/v1/student/fees');
    return response.data;
  },

  getBalance: async (): Promise<ApiResponse<BalanceInfo>> => {
    const response = await api.get<ApiResponse<BalanceInfo>>('/api/v1/student/balance');
    return response.data;
  },

  getInvoices: async (): Promise<ApiResponse<StudentInvoice[]>> => {
    const response = await api.get<ApiResponse<StudentInvoice[]>>('/api/v1/student/invoices');
    return response.data;
  },

  getPayments: async (): Promise<ApiResponse<StudentPayment[]>> => {
    const response = await api.get<ApiResponse<StudentPayment[]>>('/api/v1/student/payments');
    return response.data;
  },

  getReceipt: async (paymentId: string): Promise<ApiResponse<any>> => {
    const response = await api.get<ApiResponse<any>>(`/api/v1/student/payments/${paymentId}/receipt`);
    return response.data;
  },

  // Communication
  getAnnouncements: async (): Promise<ApiResponse<Announcement[]>> => {
    const response = await api.get<ApiResponse<Announcement[]>>('/api/v1/student/announcements');
    return response.data;
  },
};

export default studentPortalApi;
