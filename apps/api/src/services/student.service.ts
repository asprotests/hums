import { prisma } from '@hums/database';
import { AppError } from '../utils/AppError.js';
import type { Prisma } from '@hums/database';
import type {
  StudentQueryInput,
  UpdateStudentInput,
  TransferStudentInput,
  DeactivateStudentInput,
} from '../validators/admission.validator.js';

export class StudentService {
  /**
   * Get students with pagination and filters
   */
  async getStudents(filters: StudentQueryInput) {
    const { search, status, programId, facultyId, page = 1, limit = 20 } = filters;
    const skip = (page - 1) * limit;

    const where: Prisma.StudentWhereInput = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { studentId: { contains: search, mode: 'insensitive' } },
        { user: { firstName: { contains: search, mode: 'insensitive' } } },
        { user: { lastName: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (programId) {
      where.programId = programId;
    }

    if (facultyId) {
      where.program = {
        department: {
          facultyId,
        },
      };
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              avatar: true,
              isActive: true,
            },
          },
          program: {
            include: {
              department: {
                include: { faculty: true },
              },
            },
          },
        },
      }),
      prisma.student.count({ where }),
    ]);

    return {
      data: students.map(this.formatStudent),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get student by ID
   */
  async getStudentById(id: string) {
    const student = await prisma.student.findUnique({
      where: { id, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true,
          },
        },
        program: {
          include: {
            department: {
              include: { faculty: true },
            },
          },
        },
        documents: true,
        application: {
          select: {
            id: true,
            applicationNo: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            payments: true,
            borrowings: true,
          },
        },
      },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    return this.formatStudentWithDetails(student);
  }

  /**
   * Get student by student ID (HU/2025/0001)
   */
  async getStudentByStudentId(studentId: string) {
    const student = await prisma.student.findUnique({
      where: { studentId, deletedAt: null },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            avatar: true,
            isActive: true,
          },
        },
        program: {
          include: {
            department: {
              include: { faculty: true },
            },
          },
        },
      },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    return this.formatStudent(student);
  }

  /**
   * Update student
   */
  async updateStudent(id: string, data: UpdateStudentInput, updatedById?: string) {
    const student = await prisma.student.findUnique({
      where: { id, deletedAt: null },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    // Extract userId since it's a relation field and shouldn't be passed directly
    const { userId: _userId, ...updateData } = data;

    const updated = await prisma.student.update({
      where: { id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        program: {
          include: {
            department: {
              include: { faculty: true },
            },
          },
        },
      },
    });

    await this.createAuditLog(updatedById, 'UPDATE', 'Student', id, null, data);

    return this.formatStudent(updated);
  }

  /**
   * Deactivate student
   */
  async deactivateStudent(id: string, data: DeactivateStudentInput, deactivatedById: string) {
    const student = await prisma.student.findUnique({
      where: { id, deletedAt: null },
      include: { user: true },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    if (student.status !== 'ACTIVE') {
      throw AppError.badRequest('Student is not currently active');
    }

    // Update student status and deactivate user account
    const [updatedStudent] = await prisma.$transaction([
      prisma.student.update({
        where: { id },
        data: { status: data.status },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          program: {
            include: {
              department: {
                include: { faculty: true },
              },
            },
          },
        },
      }),
      prisma.user.update({
        where: { id: student.userId },
        data: { isActive: false },
      }),
    ]);

    await this.createAuditLog(deactivatedById, 'DEACTIVATE', 'Student', id,
      { status: student.status },
      { status: data.status, reason: data.reason }
    );

    return this.formatStudent(updatedStudent);
  }

  /**
   * Transfer student to another program
   */
  async transferStudent(id: string, data: TransferStudentInput, transferredById: string) {
    const student = await prisma.student.findUnique({
      where: { id, deletedAt: null },
      include: { program: true },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    if (student.status !== 'ACTIVE') {
      throw AppError.badRequest('Only active students can be transferred');
    }

    if (student.programId === data.newProgramId) {
      throw AppError.badRequest('Student is already in this program');
    }

    // Verify new program exists
    const newProgram = await prisma.program.findUnique({
      where: { id: data.newProgramId, deletedAt: null },
      include: {
        department: {
          include: { faculty: true },
        },
      },
    });

    if (!newProgram) {
      throw AppError.badRequest('Invalid program ID');
    }

    const updated = await prisma.student.update({
      where: { id },
      data: {
        programId: data.newProgramId,
        currentSemester: 1, // Reset semester on transfer
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        program: {
          include: {
            department: {
              include: { faculty: true },
            },
          },
        },
      },
    });

    await this.createAuditLog(transferredById, 'TRANSFER', 'Student', id,
      { programId: student.programId, programName: student.program.name },
      { programId: data.newProgramId, programName: newProgram.name, reason: data.reason }
    );

    return this.formatStudent(updated);
  }

  /**
   * Soft delete student
   */
  async deleteStudent(id: string, deletedById: string) {
    const student = await prisma.student.findUnique({
      where: { id, deletedAt: null },
      include: {
        _count: {
          select: {
            enrollments: { where: { status: 'REGISTERED' } },
          },
        },
      },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    if (student._count.enrollments > 0) {
      throw AppError.badRequest('Cannot delete student with active enrollments');
    }

    await prisma.$transaction([
      prisma.student.update({
        where: { id },
        data: { deletedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: student.userId },
        data: { isActive: false, deletedAt: new Date() },
      }),
    ]);

    await this.createAuditLog(deletedById, 'DELETE', 'Student', id, {
      studentId: student.studentId,
    }, null);

    return { message: 'Student deleted successfully' };
  }

  /**
   * Get student enrollments
   */
  async getEnrollments(studentId: string, semesterId?: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId, deletedAt: null },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    const where: Prisma.EnrollmentWhereInput = { studentId };
    if (semesterId) {
      where.semesterId = semesterId;
    }

    const enrollments = await prisma.enrollment.findMany({
      where,
      orderBy: [{ semester: { startDate: 'desc' } }, { createdAt: 'desc' }],
      include: {
        class: {
          include: {
            course: true,
            lecturer: {
              include: {
                user: {
                  select: { firstName: true, lastName: true },
                },
              },
            },
          },
        },
        semester: true,
        grades: true,
      },
    });

    return enrollments.map((e) => ({
      id: e.id,
      status: e.status,
      semester: {
        id: e.semester.id,
        name: e.semester.name,
      },
      class: {
        id: e.class.id,
        name: e.class.name,
        course: {
          id: e.class.course.id,
          code: e.class.course.code,
          name: e.class.course.name,
          credits: e.class.course.credits,
        },
        lecturer: e.class.lecturer ? {
          id: e.class.lecturer.id,
          name: `${e.class.lecturer.user.firstName} ${e.class.lecturer.user.lastName}`,
        } : null,
      },
      grades: e.grades.map((g) => ({
        id: g.id,
        type: g.type,
        score: Number(g.score),
        maxScore: Number(g.maxScore),
        weight: Number(g.weight),
        isFinalized: g.isFinalized,
      })),
      createdAt: e.createdAt,
    }));
  }

  /**
   * Get student grades summary
   */
  async getGrades(studentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId, deletedAt: null },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, status: 'COMPLETED' },
      include: {
        class: {
          include: {
            course: true,
          },
        },
        semester: true,
        grades: true,
      },
      orderBy: { semester: { startDate: 'desc' } },
    });

    return enrollments.map((e) => {
      const totalWeight = e.grades.reduce((sum, g) => sum + Number(g.weight), 0);
      const weightedScore = e.grades.reduce((sum, g) => {
        return sum + (Number(g.score) / Number(g.maxScore) * 100 * Number(g.weight));
      }, 0);
      const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

      return {
        semester: e.semester.name,
        course: {
          code: e.class.course.code,
          name: e.class.course.name,
          credits: e.class.course.credits,
        },
        finalScore: Math.round(finalScore * 100) / 100,
        letterGrade: this.calculateLetterGrade(finalScore),
        gradePoints: this.calculateGradePoints(finalScore),
      };
    });
  }

  /**
   * Get student payments
   */
  async getPayments(studentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId, deletedAt: null },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    const [payments, invoices] = await Promise.all([
      prisma.payment.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
        include: {
          invoice: true,
        },
      }),
      prisma.invoice.findMany({
        where: { studentId },
        orderBy: { dueDate: 'desc' },
      }),
    ]);

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalDue = invoices.reduce((sum, i) => sum + Number(i.amount), 0);

    return {
      summary: {
        totalPaid,
        totalDue,
        balance: totalDue - totalPaid,
      },
      payments: payments.map((p) => ({
        id: p.id,
        receiptNo: p.receiptNo,
        amount: Number(p.amount),
        method: p.method,
        reference: p.reference,
        createdAt: p.createdAt,
        invoice: p.invoice ? {
          id: p.invoice.id,
          invoiceNo: p.invoice.invoiceNo,
        } : null,
      })),
      invoices: invoices.map((i) => ({
        id: i.id,
        invoiceNo: i.invoiceNo,
        amount: Number(i.amount),
        status: i.status,
        dueDate: i.dueDate,
        description: i.description,
      })),
    };
  }

  /**
   * Get student attendance summary
   */
  async getAttendance(studentId: string, semesterId?: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId, deletedAt: null },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    const where: Prisma.StudentAttendanceWhereInput = { studentId };
    if (semesterId) {
      where.class = { semesterId };
    }

    const attendances = await prisma.studentAttendance.findMany({
      where,
      include: {
        class: {
          include: {
            course: true,
            semester: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // Group by class
    const byClass = new Map<string, { present: number; absent: number; late: number; excused: number; total: number }>();

    for (const a of attendances) {
      const classId = a.classId;
      if (!byClass.has(classId)) {
        byClass.set(classId, { present: 0, absent: 0, late: 0, excused: 0, total: 0 });
      }
      const stats = byClass.get(classId)!;
      stats.total++;
      switch (a.status) {
        case 'PRESENT': stats.present++; break;
        case 'ABSENT': stats.absent++; break;
        case 'LATE': stats.late++; break;
        case 'EXCUSED': stats.excused++; break;
      }
    }

    // Get class details
    const classIds = Array.from(byClass.keys());
    const classes = await prisma.class.findMany({
      where: { id: { in: classIds } },
      include: {
        course: true,
        semester: true,
      },
    });

    const classMap = new Map(classes.map((c) => [c.id, c]));

    return {
      summary: {
        totalClasses: attendances.length,
        present: attendances.filter((a) => a.status === 'PRESENT').length,
        absent: attendances.filter((a) => a.status === 'ABSENT').length,
        late: attendances.filter((a) => a.status === 'LATE').length,
        excused: attendances.filter((a) => a.status === 'EXCUSED').length,
        attendanceRate: attendances.length > 0
          ? Math.round((attendances.filter((a) => a.status === 'PRESENT').length / attendances.length) * 100)
          : 0,
      },
      byClass: Array.from(byClass.entries()).map(([classId, stats]) => {
        const cls = classMap.get(classId);
        return {
          class: cls ? {
            id: cls.id,
            name: cls.name,
            course: {
              code: cls.course.code,
              name: cls.course.name,
            },
            semester: cls.semester.name,
          } : null,
          stats: {
            ...stats,
            attendanceRate: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
          },
        };
      }),
    };
  }

  /**
   * Get student documents
   */
  async getDocuments(studentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId, deletedAt: null },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    const documents = await prisma.document.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });

    return documents.map((d) => ({
      id: d.id,
      type: d.type,
      fileName: d.fileName,
      originalName: d.originalName,
      mimeType: d.mimeType,
      size: d.size,
      url: d.url,
      createdAt: d.createdAt,
    }));
  }

  /**
   * Upload document for student
   */
  async uploadDocument(
    studentId: string,
    file: { fileName: string; originalName: string; mimeType: string; size: number; path: string; url?: string },
    type: 'ID_CARD' | 'PASSPORT' | 'CERTIFICATE' | 'PHOTO' | 'TRANSCRIPT' | 'OTHER',
    uploadedById: string
  ) {
    const student = await prisma.student.findUnique({
      where: { id: studentId, deletedAt: null },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    const document = await prisma.document.create({
      data: {
        studentId,
        type,
        fileName: file.fileName,
        originalName: file.originalName,
        mimeType: file.mimeType,
        size: file.size,
        path: file.path,
        url: file.url,
      },
    });

    await this.createAuditLog(uploadedById, 'UPLOAD', 'Document', document.id, null, {
      studentId,
      type,
      fileName: file.originalName,
    });

    return {
      id: document.id,
      type: document.type,
      fileName: document.fileName,
      originalName: document.originalName,
      mimeType: document.mimeType,
      size: document.size,
      url: document.url,
      createdAt: document.createdAt,
    };
  }

  /**
   * Delete student document
   */
  async deleteDocument(studentId: string, documentId: string, deletedById: string) {
    const document = await prisma.document.findFirst({
      where: { id: documentId, studentId },
    });

    if (!document) {
      throw AppError.notFound('Document not found');
    }

    await prisma.document.delete({
      where: { id: documentId },
    });

    await this.createAuditLog(deletedById, 'DELETE', 'Document', documentId, {
      type: document.type,
      fileName: document.originalName,
    }, null);

    return { message: 'Document deleted successfully' };
  }

  /**
   * Generate student transcript
   */
  async generateTranscript(studentId: string) {
    const student = await prisma.student.findUnique({
      where: { id: studentId, deletedAt: null },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        program: {
          include: {
            department: {
              include: { faculty: true },
            },
          },
        },
      },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    // Get completed enrollments with grades
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, status: 'COMPLETED' },
      include: {
        class: {
          include: {
            course: true,
          },
        },
        semester: true,
        grades: true,
      },
      orderBy: [{ semester: { startDate: 'asc' } }, { createdAt: 'asc' }],
    });

    // Calculate grades for each enrollment
    const transcriptCourses = enrollments.map((e) => {
      const totalWeight = e.grades.reduce((sum, g) => sum + Number(g.weight), 0);
      const weightedScore = e.grades.reduce((sum, g) => {
        return sum + (Number(g.score) / Number(g.maxScore) * 100 * Number(g.weight));
      }, 0);
      const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

      return {
        semester: e.semester.name,
        semesterStartDate: e.semester.startDate,
        courseCode: e.class.course.code,
        courseName: e.class.course.name,
        credits: e.class.course.credits,
        finalScore: Math.round(finalScore * 100) / 100,
        letterGrade: this.calculateLetterGrade(finalScore),
        gradePoints: this.calculateGradePoints(finalScore),
      };
    });

    // Group by semester
    const bySemester = new Map<string, typeof transcriptCourses>();
    for (const course of transcriptCourses) {
      const key = course.semester;
      if (!bySemester.has(key)) {
        bySemester.set(key, []);
      }
      bySemester.get(key)!.push(course);
    }

    // Calculate cumulative GPA
    let totalCredits = 0;
    let totalGradePoints = 0;
    for (const course of transcriptCourses) {
      totalCredits += course.credits;
      totalGradePoints += course.gradePoints * course.credits;
    }
    const cumulativeGPA = totalCredits > 0 ? totalGradePoints / totalCredits : 0;

    // Build transcript data
    const semesters = Array.from(bySemester.entries())
      .sort((a, b) => {
        const aDate = a[1][0]?.semesterStartDate;
        const bDate = b[1][0]?.semesterStartDate;
        return new Date(aDate).getTime() - new Date(bDate).getTime();
      })
      .map(([semesterName, courses]) => {
        const semesterCredits = courses.reduce((sum, c) => sum + c.credits, 0);
        const semesterGradePoints = courses.reduce((sum, c) => sum + c.gradePoints * c.credits, 0);
        const semesterGPA = semesterCredits > 0 ? semesterGradePoints / semesterCredits : 0;

        return {
          name: semesterName,
          courses: courses.map(({ semester, semesterStartDate, ...c }) => c),
          semesterCredits,
          semesterGPA: Math.round(semesterGPA * 100) / 100,
        };
      });

    return {
      student: {
        studentId: student.studentId,
        name: `${student.user.firstName} ${student.user.lastName}`,
        email: student.user.email,
        dateOfBirth: student.dateOfBirth,
        admissionDate: student.admissionDate,
        status: student.status,
      },
      program: {
        name: student.program.name,
        code: student.program.code,
        department: student.program.department?.name,
        faculty: student.program.department?.faculty?.name,
      },
      academicRecord: {
        semesters,
        totalCredits,
        cumulativeGPA: Math.round(cumulativeGPA * 100) / 100,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  // Private helper methods

  private calculateLetterGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private calculateGradePoints(score: number): number {
    if (score >= 90) return 4.0;
    if (score >= 80) return 3.0;
    if (score >= 70) return 2.0;
    if (score >= 60) return 1.0;
    return 0.0;
  }

  private formatStudent(student: any) {
    return {
      id: student.id,
      studentId: student.studentId,
      user: student.user ? {
        id: student.user.id,
        email: student.user.email,
        firstName: student.user.firstName,
        lastName: student.user.lastName,
        fullName: `${student.user.firstName} ${student.user.lastName}`,
        phone: student.user.phone,
        avatar: student.user.avatar,
        isActive: student.user.isActive,
      } : null,
      program: student.program ? {
        id: student.program.id,
        name: student.program.name,
        code: student.program.code,
        type: student.program.type,
        department: student.program.department ? {
          id: student.program.department.id,
          name: student.program.department.name,
          code: student.program.department.code,
          faculty: student.program.department.faculty ? {
            id: student.program.department.faculty.id,
            name: student.program.department.faculty.name,
          } : null,
        } : null,
      } : null,
      admissionDate: student.admissionDate,
      expectedGraduation: student.expectedGraduation,
      status: student.status,
      currentSemester: student.currentSemester,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    };
  }

  private formatStudentWithDetails(student: any) {
    return {
      ...this.formatStudent(student),
      personalInfo: {
        dateOfBirth: student.dateOfBirth,
        gender: student.gender,
        nationality: student.nationality,
        address: student.address,
      },
      emergencyContact: {
        name: student.emergencyContact,
        phone: student.emergencyContactPhone,
      },
      documents: student.documents?.map((d: any) => ({
        id: d.id,
        type: d.type,
        fileName: d.fileName,
        originalName: d.originalName,
        url: d.url,
        createdAt: d.createdAt,
      })) || [],
      application: student.application ? {
        id: student.application.id,
        applicationNo: student.application.applicationNo,
        appliedAt: student.application.createdAt,
      } : null,
      stats: {
        enrollments: student._count?.enrollments || 0,
        payments: student._count?.payments || 0,
        borrowings: student._count?.borrowings || 0,
      },
      account: {
        lastLoginAt: student.user?.lastLoginAt,
        createdAt: student.user?.createdAt,
      },
    };
  }

  private async createAuditLog(
    userId: string | null | undefined,
    action: string,
    resource: string,
    resourceId: string | null,
    oldValues: any,
    newValues: any
  ) {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        resource,
        resourceId,
        oldValues,
        newValues,
      },
    });
  }
}

export const studentService = new StudentService();
