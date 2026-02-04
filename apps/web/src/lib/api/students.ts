import api, { type ApiResponse } from '../api';

export type StudentStatus = 'ACTIVE' | 'INACTIVE' | 'GRADUATED' | 'SUSPENDED' | 'WITHDRAWN' | 'TRANSFERRED';
export type Gender = 'MALE' | 'FEMALE';

export interface Student {
  id: string;
  studentId: string;
  userId: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    phone?: string;
    avatar?: string;
    isActive: boolean;
  };
  dateOfBirth?: string;
  gender?: Gender;
  nationality?: string;
  address?: string;
  city?: string;
  programId: string;
  program?: {
    id: string;
    code: string;
    name: string;
    nameSo?: string;
    department?: {
      id: string;
      name: string;
      nameSo?: string;
      faculty?: {
        id: string;
        name: string;
        nameSo?: string;
      };
    };
  };
  admissionDate: string;
  expectedGraduationDate?: string;
  status: StudentStatus;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: StudentStatus;
  programId?: string;
  departmentId?: string;
  facultyId?: string;
}

export interface PaginatedStudents {
  data: Student[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UpdateStudentInput {
  dateOfBirth?: string;
  gender?: Gender;
  nationality?: string;
  address?: string;
  city?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string;
  expectedGraduationDate?: string;
}

export interface TransferStudentInput {
  newProgramId: string;
  reason?: string;
  effectiveDate?: string;
}

export interface DeactivateStudentInput {
  status: 'SUSPENDED' | 'WITHDRAWN';
  reason?: string;
  effectiveDate?: string;
}

export interface EnrollmentGrade {
  id: string;
  type: string;
  score: number;
  maxScore: number;
  weight: number;
  isFinalized: boolean;
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
    } | null;
  };
  grades: EnrollmentGrade[];
  createdAt: string;
}

export interface Grade {
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

export interface Payment {
  id: string;
  receiptNo: string;
  amount: number;
  method: string;
  reference?: string;
  createdAt: string;
  invoice?: {
    id: string;
    invoiceNo: string;
  };
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  amount: number;
  status: string;
  dueDate: string;
  description?: string;
}

export interface PaymentsData {
  summary: {
    totalPaid: number;
    totalDue: number;
    balance: number;
  };
  payments: Payment[];
  invoices: Invoice[];
}

export interface AttendanceStats {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  attendanceRate: number;
}

export interface ClassAttendance {
  class: {
    id: string;
    name: string;
    course: {
      code: string;
      name: string;
    };
    semester: string;
  } | null;
  stats: AttendanceStats;
}

export interface AttendanceData {
  summary: AttendanceStats & { totalClasses: number };
  byClass: ClassAttendance[];
}

export interface StudentDocument {
  id: string;
  type: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: string;
}

interface PaginatedApiResponse {
  success: boolean;
  data: Student[];
  pagination: PaginatedStudents['pagination'];
  message?: string;
}

export const studentsApi = {
  getStudents: async (filters: StudentFilters = {}): Promise<ApiResponse<PaginatedStudents>> => {
    const params = new URLSearchParams();
    if (filters.page) params.append('page', String(filters.page));
    if (filters.limit) params.append('limit', String(filters.limit));
    if (filters.search) params.append('search', filters.search);
    if (filters.status) params.append('status', filters.status);
    if (filters.programId) params.append('programId', filters.programId);
    if (filters.departmentId) params.append('departmentId', filters.departmentId);
    if (filters.facultyId) params.append('facultyId', filters.facultyId);

    const response = await api.get<PaginatedApiResponse>(`/api/v1/students?${params.toString()}`);
    return {
      success: response.data.success,
      data: {
        data: response.data.data,
        pagination: response.data.pagination,
      },
      message: response.data.message,
    };
  },

  getStudentById: async (id: string): Promise<ApiResponse<Student>> => {
    const response = await api.get<ApiResponse<Student>>(`/api/v1/students/${id}`);
    return response.data;
  },

  updateStudent: async (id: string, data: UpdateStudentInput): Promise<ApiResponse<Student>> => {
    const response = await api.patch<ApiResponse<Student>>(`/api/v1/students/${id}`, data);
    return response.data;
  },

  deleteStudent: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/students/${id}`);
    return response.data;
  },

  deactivateStudent: async (id: string, data: DeactivateStudentInput): Promise<ApiResponse<Student>> => {
    const response = await api.post<ApiResponse<Student>>(`/api/v1/students/${id}/deactivate`, data);
    return response.data;
  },

  transferStudent: async (id: string, data: TransferStudentInput): Promise<ApiResponse<Student>> => {
    const response = await api.post<ApiResponse<Student>>(`/api/v1/students/${id}/transfer`, data);
    return response.data;
  },

  getEnrollments: async (id: string, semesterId?: string): Promise<ApiResponse<Enrollment[]>> => {
    const params = semesterId ? `?semesterId=${semesterId}` : '';
    const response = await api.get<ApiResponse<Enrollment[]>>(`/api/v1/students/${id}/enrollments${params}`);
    return response.data;
  },

  getGrades: async (id: string): Promise<ApiResponse<Grade[]>> => {
    const response = await api.get<ApiResponse<Grade[]>>(`/api/v1/students/${id}/grades`);
    return response.data;
  },

  getPayments: async (id: string): Promise<ApiResponse<PaymentsData>> => {
    const response = await api.get<ApiResponse<PaymentsData>>(`/api/v1/students/${id}/payments`);
    return response.data;
  },

  getAttendance: async (id: string, semesterId?: string): Promise<ApiResponse<AttendanceData>> => {
    const params = semesterId ? `?semesterId=${semesterId}` : '';
    const response = await api.get<ApiResponse<AttendanceData>>(`/api/v1/students/${id}/attendance${params}`);
    return response.data;
  },

  getDocuments: async (id: string): Promise<ApiResponse<StudentDocument[]>> => {
    const response = await api.get<ApiResponse<StudentDocument[]>>(`/api/v1/students/${id}/documents`);
    return response.data;
  },
};

export default studentsApi;
