import api, { type ApiResponse } from '../api';

// ============ Types ============

export type GradeComponentType =
  | 'MIDTERM'
  | 'FINAL'
  | 'QUIZ'
  | 'ASSIGNMENT'
  | 'PROJECT'
  | 'PARTICIPATION'
  | 'LAB'
  | 'OTHER';

export interface GradeDefinition {
  id: string;
  letter: string;
  minPercentage: number;
  maxPercentage: number;
  gradePoints: number;
  description?: string;
}

export interface GradeScale {
  id: string;
  name: string;
  isDefault: boolean;
  grades: GradeDefinition[];
  createdAt: string;
  updatedAt: string;
}

export interface GradeComponent {
  id: string;
  classId: string;
  name: string;
  type: GradeComponentType;
  weight: number;
  maxScore: number;
  dueDate?: string;
  isPublished: boolean;
  _count?: {
    entries: number;
  };
  class?: {
    id: string;
    name: string;
    course: {
      id: string;
      name: string;
      code: string;
    };
    semester: {
      id: string;
      name: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface GradeEntry {
  id: string;
  componentId: string;
  enrollmentId: string;
  score: number;
  remarks?: string;
  enteredById: string;
  enteredAt: string;
  modifiedById?: string;
  modifiedAt?: string;
  enrollment: {
    id: string;
    student: {
      id: string;
      studentId: string;
      user: {
        firstName: string;
        lastName: string;
        email?: string;
      };
    };
  };
  component?: GradeComponent;
  enteredBy?: {
    firstName: string;
    lastName: string;
  };
  modifiedBy?: {
    firstName: string;
    lastName: string;
  };
}

export interface ComponentGradesResult {
  component: {
    id: string;
    name: string;
    type: GradeComponentType;
    maxScore: number;
    weight: number;
    isPublished: boolean;
  };
  entries: GradeEntry[];
  enrolledWithoutGrades: Array<{
    id: string;
    student: {
      id: string;
      studentId: string;
      user: {
        firstName: string;
        lastName: string;
        email?: string;
      };
    };
  }>;
  statistics: {
    count: number;
    average: number;
    highest: number;
    lowest: number;
    median: number;
    maxScore: number;
  };
}

export interface ComponentScore {
  componentId: string;
  componentName: string;
  score: number;
  maxScore: number;
  weight: number;
  weightedScore: number;
  percentage: number;
}

export interface CalculatedGrade {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  componentScores: ComponentScore[];
  totalPercentage: number;
  letterGrade: string;
  gradePoints: number;
}

export interface GPADetails {
  semesterGPA: number;
  cumulativeGPA: number;
  totalCredits: number;
  totalPoints: number;
  semesterCredits: number;
  semesterPoints: number;
}

export interface TranscriptCourse {
  code: string;
  name: string;
  credits: number;
  grade: string;
  points: number;
}

export interface TranscriptSemester {
  id: string;
  name: string;
  courses: TranscriptCourse[];
  semesterCredits: number;
  semesterPoints: number;
  semesterGPA: number;
}

export interface TranscriptData {
  student: {
    id: string;
    studentId: string;
    name: string;
    program: string;
    admissionDate: string;
  };
  semesters: TranscriptSemester[];
  cumulativeCredits: number;
  cumulativePoints: number;
  cumulativeGPA: number;
  generatedAt: string;
  isOfficial: boolean;
}

export interface EnrollmentGrades {
  enrollment: {
    id: string;
    status: string;
    isFinalized: boolean;
    finalGrade?: string;
    finalPercentage?: number;
  };
  student: {
    id: string;
    studentId: string;
    name: string;
  };
  class: {
    id: string;
    name: string;
    course: {
      id: string;
      name: string;
      code: string;
      credits: number;
    };
  };
  components: ComponentScore[];
  currentGrade: {
    percentage: number;
    letter: string;
    points: number;
  };
}

export interface WeightValidationResult {
  valid: boolean;
  total: number;
  components: Array<{
    id: string;
    name: string;
    weight: number;
  }>;
}

// ============ Input Types ============

export interface CreateGradeScaleInput {
  name: string;
  isDefault?: boolean;
  grades: Array<{
    letter: string;
    minPercentage: number;
    maxPercentage: number;
    gradePoints: number;
    description?: string;
  }>;
}

export interface UpdateGradeScaleInput {
  name?: string;
  grades?: Array<{
    letter: string;
    minPercentage: number;
    maxPercentage: number;
    gradePoints: number;
    description?: string;
  }>;
}

export interface CreateGradeComponentInput {
  name: string;
  type: GradeComponentType;
  weight: number;
  maxScore: number;
  dueDate?: string;
}

export interface UpdateGradeComponentInput {
  name?: string;
  type?: GradeComponentType;
  weight?: number;
  maxScore?: number;
  dueDate?: string | null;
  isPublished?: boolean;
}

export interface GradeEntryInput {
  enrollmentId: string;
  score: number;
  remarks?: string;
}

// ============ Grade Scale API ============

export const gradeScalesApi = {
  getAll: async (): Promise<ApiResponse<GradeScale[]>> => {
    const response = await api.get<ApiResponse<GradeScale[]>>('/api/v1/grade-scales');
    return response.data;
  },

  getDefault: async (): Promise<ApiResponse<GradeScale>> => {
    const response = await api.get<ApiResponse<GradeScale>>('/api/v1/grade-scales/default');
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<GradeScale>> => {
    const response = await api.get<ApiResponse<GradeScale>>(`/api/v1/grade-scales/${id}`);
    return response.data;
  },

  create: async (data: CreateGradeScaleInput): Promise<ApiResponse<GradeScale>> => {
    const response = await api.post<ApiResponse<GradeScale>>('/api/v1/grade-scales', data);
    return response.data;
  },

  update: async (id: string, data: UpdateGradeScaleInput): Promise<ApiResponse<GradeScale>> => {
    const response = await api.patch<ApiResponse<GradeScale>>(`/api/v1/grade-scales/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/grade-scales/${id}`);
    return response.data;
  },

  setDefault: async (id: string): Promise<ApiResponse<GradeScale>> => {
    const response = await api.patch<ApiResponse<GradeScale>>(`/api/v1/grade-scales/${id}/set-default`);
    return response.data;
  },
};

// ============ Grade Component API ============

export const gradeComponentsApi = {
  getByClass: async (classId: string): Promise<ApiResponse<GradeComponent[]>> => {
    const response = await api.get<ApiResponse<GradeComponent[]>>(`/api/v1/classes/${classId}/components`);
    return response.data;
  },

  getById: async (id: string): Promise<ApiResponse<GradeComponent>> => {
    const response = await api.get<ApiResponse<GradeComponent>>(`/api/v1/grade-components/${id}`);
    return response.data;
  },

  create: async (classId: string, data: CreateGradeComponentInput): Promise<ApiResponse<GradeComponent>> => {
    const response = await api.post<ApiResponse<GradeComponent>>(`/api/v1/classes/${classId}/components`, data);
    return response.data;
  },

  update: async (id: string, data: UpdateGradeComponentInput): Promise<ApiResponse<GradeComponent>> => {
    const response = await api.patch<ApiResponse<GradeComponent>>(`/api/v1/grade-components/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/grade-components/${id}`);
    return response.data;
  },

  publish: async (id: string): Promise<ApiResponse<GradeComponent>> => {
    const response = await api.post<ApiResponse<GradeComponent>>(`/api/v1/grade-components/${id}/publish`);
    return response.data;
  },

  unpublish: async (id: string): Promise<ApiResponse<GradeComponent>> => {
    const response = await api.post<ApiResponse<GradeComponent>>(`/api/v1/grade-components/${id}/unpublish`);
    return response.data;
  },

  validateWeights: async (classId: string): Promise<ApiResponse<WeightValidationResult>> => {
    const response = await api.get<ApiResponse<WeightValidationResult>>(`/api/v1/classes/${classId}/components/validate-weights`);
    return response.data;
  },

  copyFromClass: async (sourceClassId: string, targetClassId: string): Promise<ApiResponse<GradeComponent[]>> => {
    const response = await api.post<ApiResponse<GradeComponent[]>>('/api/v1/grade-components/copy', {
      sourceClassId,
      targetClassId,
    });
    return response.data;
  },
};

// ============ Grade Entry API ============

export const gradeEntriesApi = {
  getByComponent: async (componentId: string): Promise<ApiResponse<ComponentGradesResult>> => {
    const response = await api.get<ApiResponse<ComponentGradesResult>>(`/api/v1/grade-components/${componentId}/grades`);
    return response.data;
  },

  enterGrades: async (componentId: string, grades: GradeEntryInput[]): Promise<ApiResponse<GradeEntry[]>> => {
    const response = await api.post<ApiResponse<GradeEntry[]>>(`/api/v1/grade-components/${componentId}/grades`, { grades });
    return response.data;
  },

  update: async (id: string, score: number, remarks?: string): Promise<ApiResponse<GradeEntry>> => {
    const response = await api.patch<ApiResponse<GradeEntry>>(`/api/v1/grade-entries/${id}`, { score, remarks });
    return response.data;
  },

  delete: async (id: string): Promise<ApiResponse<null>> => {
    const response = await api.delete<ApiResponse<null>>(`/api/v1/grade-entries/${id}`);
    return response.data;
  },
};

// ============ Grade Calculation API ============

export const gradeCalculationApi = {
  getEnrollmentGrades: async (enrollmentId: string): Promise<ApiResponse<EnrollmentGrades>> => {
    const response = await api.get<ApiResponse<EnrollmentGrades>>(`/api/v1/enrollments/${enrollmentId}/grades`);
    return response.data;
  },

  getClassGrades: async (classId: string): Promise<ApiResponse<CalculatedGrade[]>> => {
    const response = await api.get<ApiResponse<CalculatedGrade[]>>(`/api/v1/classes/${classId}/grades`);
    return response.data;
  },

  finalizeGrades: async (classId: string): Promise<ApiResponse<CalculatedGrade[]>> => {
    const response = await api.post<ApiResponse<CalculatedGrade[]>>(`/api/v1/classes/${classId}/grades/finalize`, { confirm: true });
    return response.data;
  },

  unfinalizeGrades: async (classId: string, reason: string): Promise<ApiResponse<null>> => {
    const response = await api.post<ApiResponse<null>>(`/api/v1/classes/${classId}/grades/unfinalize`, { reason });
    return response.data;
  },

  getStudentGPA: async (studentId: string, semesterId?: string): Promise<ApiResponse<GPADetails>> => {
    const params = semesterId ? `?semesterId=${semesterId}` : '';
    const response = await api.get<ApiResponse<GPADetails>>(`/api/v1/students/${studentId}/gpa${params}`);
    return response.data;
  },

  getTranscript: async (studentId: string, official: boolean = false): Promise<ApiResponse<TranscriptData>> => {
    const response = await api.get<ApiResponse<TranscriptData>>(`/api/v1/students/${studentId}/transcript?official=${official}`);
    return response.data;
  },
};

export default {
  scales: gradeScalesApi,
  components: gradeComponentsApi,
  entries: gradeEntriesApi,
  calculation: gradeCalculationApi,
};
