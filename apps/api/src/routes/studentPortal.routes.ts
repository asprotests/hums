import { Router, type Router as RouterType } from 'express';
import { prisma } from '@hums/database';
import { studentService } from '../services/student.service.js';
import { paymentService } from '../services/payment.service.js';
import { feeStructureService } from '../services/feeStructure.service.js';
import { borrowingService } from '../services/borrowing.service.js';
import { reservationService } from '../services/reservation.service.js';
import { authenticate } from '../middleware/index.js';
import { asyncHandler, sendSuccess } from '../utils/index.js';
import { AppError } from '../utils/AppError.js';
import { uploadAvatar, getAvatarUrl, deleteOldAvatar } from '../utils/upload.js';

const router: RouterType = Router();

// All routes require authentication
router.use(authenticate);

/**
 * Middleware to ensure student-only access and inject studentId
 */
const studentOnly = asyncHandler(async (req, _res, next) => {
  const userId = req.user!.userId;

  // Find student record for this user
  const student = await prisma.student.findFirst({
    where: { userId, deletedAt: null },
  });

  if (!student) {
    throw AppError.forbidden('Student access only');
  }

  // Inject studentId into request
  (req as any).studentId = student.id;
  next();
});

// Apply studentOnly middleware to all routes
router.use(studentOnly);

// ============================================
// PROFILE ROUTES
// ============================================

/**
 * @route   GET /api/v1/student/profile
 * @desc    Get own profile
 * @access  Private (Student only)
 */
router.get(
  '/profile',
  asyncHandler(async (req, res) => {
    const studentId = (req as any).studentId;
    const profile = await studentService.getStudentById(studentId);
    return sendSuccess(res, profile);
  })
);

/**
 * @route   PATCH /api/v1/student/profile
 * @desc    Update contact info only
 * @access  Private (Student only)
 */
router.patch(
  '/profile',
  asyncHandler(async (req, res) => {
    const studentId = (req as any).studentId;
    const userId = req.user!.userId;

    // Update phone in user table if provided (phone is on User model)
    if (req.body.phone) {
      await prisma.user.update({
        where: { id: userId },
        data: { phone: req.body.phone },
      });
    }

    // Only allow updating student-specific contact info (phone is on User model, not Student)
    const allowedStudentFields = ['address', 'emergencyContact', 'emergencyContactPhone'];
    const updateData: any = {};

    for (const field of allowedStudentFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Only call update if there's data to update on Student model
    if (Object.keys(updateData).length > 0) {
      await studentService.updateStudent(studentId, updateData, userId);
    }

    // Fetch and return updated profile
    const profile = await studentService.getStudentById(studentId);
    return sendSuccess(res, profile, 'Profile updated successfully');
  })
);

/**
 * @route   POST /api/v1/student/profile/photo
 * @desc    Upload profile photo
 * @access  Private (Student only)
 */
router.post(
  '/profile/photo',
  (req, res, next) => {
    uploadAvatar(req, res, (err) => {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(AppError.badRequest('File too large. Maximum size is 5MB'));
        }
        return next(err);
      }
      next();
    });
  },
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    if (!req.file) {
      throw AppError.badRequest('No photo file provided');
    }

    // Get current user to delete old avatar
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    // Delete old avatar file if exists
    deleteOldAvatar(currentUser?.avatar || null);

    // Update user avatar URL
    const avatarUrl = getAvatarUrl(req.file.filename);
    await prisma.user.update({
      where: { id: userId },
      data: { avatar: avatarUrl },
    });

    return sendSuccess(res, { avatarUrl }, 'Profile photo uploaded successfully');
  })
);

/**
 * @route   DELETE /api/v1/student/profile/photo
 * @desc    Delete profile photo
 * @access  Private (Student only)
 */
router.delete(
  '/profile/photo',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    // Get current user to delete avatar
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    if (!currentUser?.avatar) {
      throw AppError.badRequest('No profile photo to delete');
    }

    // Delete avatar file
    deleteOldAvatar(currentUser.avatar);

    // Clear user avatar URL
    await prisma.user.update({
      where: { id: userId },
      data: { avatar: null },
    });

    return sendSuccess(res, null, 'Profile photo deleted successfully');
  })
);

/**
 * @route   GET /api/v1/student/program
 * @desc    Get enrolled program details
 * @access  Private (Student only)
 */
router.get(
  '/program',
  asyncHandler(async (req, res) => {
    const studentId = (req as any).studentId;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        program: {
          include: {
            department: {
              include: { faculty: true },
            },
            curriculum: {
              include: { course: true },
              orderBy: { semester: 'asc' },
            },
          },
        },
      },
    });

    if (!student || !student.program) {
      throw AppError.notFound('Program not found');
    }

    return sendSuccess(res, {
      id: student.program.id,
      code: student.program.code,
      name: student.program.name,
      nameLocal: student.program.nameLocal,
      type: student.program.type,
      durationYears: student.program.durationYears,
      totalCredits: student.program.totalCredits,
      department: student.program.department ? {
        id: student.program.department.id,
        name: student.program.department.name,
        code: student.program.department.code,
        faculty: student.program.department.faculty ? {
          id: student.program.department.faculty.id,
          name: student.program.department.faculty.name,
        } : null,
      } : null,
      curriculum: student.program.curriculum.map((c) => ({
        semester: c.semester,
        isRequired: c.isRequired,
        course: {
          id: c.course.id,
          code: c.course.code,
          name: c.course.name,
          credits: c.course.credits,
        },
      })),
    });
  })
);

// ============================================
// ACADEMIC ROUTES
// ============================================

/**
 * @route   GET /api/v1/student/enrollments
 * @desc    Get current semester enrollments
 * @access  Private (Student only)
 */
router.get(
  '/enrollments',
  asyncHandler(async (req, res) => {
    const studentId = (req as any).studentId;

    // Get current semester
    const currentSemester = await prisma.semester.findFirst({
      where: { isCurrent: true },
    });

    const enrollments = await studentService.getEnrollments(
      studentId,
      currentSemester?.id
    );

    return sendSuccess(res, {
      semester: currentSemester ? {
        id: currentSemester.id,
        name: currentSemester.name,
      } : null,
      enrollments,
    });
  })
);

/**
 * @route   GET /api/v1/student/enrollments/history
 * @desc    Get all enrollments
 * @access  Private (Student only)
 */
router.get(
  '/enrollments/history',
  asyncHandler(async (req, res) => {
    const studentId = (req as any).studentId;
    const enrollments = await studentService.getEnrollments(studentId);
    return sendSuccess(res, enrollments);
  })
);

/**
 * @route   GET /api/v1/student/grades
 * @desc    Get current semester grades
 * @access  Private (Student only)
 */
router.get(
  '/grades',
  asyncHandler(async (req, res) => {
    const studentId = (req as any).studentId;

    // Get current semester
    const currentSemester = await prisma.semester.findFirst({
      where: { isCurrent: true },
    });

    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        semesterId: currentSemester?.id,
      },
      include: {
        class: {
          include: { course: true },
        },
        grades: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const grades = enrollments.map((e) => {
      const totalWeight = e.grades.reduce((sum, g) => sum + Number(g.weight), 0);
      const weightedScore = e.grades.reduce((sum, g) => {
        return sum + (Number(g.score) / Number(g.maxScore) * 100 * Number(g.weight));
      }, 0);
      const currentScore = totalWeight > 0 ? weightedScore / totalWeight : null;

      return {
        enrollmentId: e.id,
        course: {
          id: e.class.course.id,
          code: e.class.course.code,
          name: e.class.course.name,
          credits: e.class.course.credits,
        },
        grades: e.grades.map((g) => ({
          id: g.id,
          type: g.type,
          score: Number(g.score),
          maxScore: Number(g.maxScore),
          weight: Number(g.weight),
          percentage: Math.round((Number(g.score) / Number(g.maxScore)) * 100),
          isFinalized: g.isFinalized,
          gradedAt: g.createdAt,
        })),
        currentScore: currentScore ? Math.round(currentScore * 100) / 100 : null,
        status: e.status,
      };
    });

    return sendSuccess(res, {
      semester: currentSemester ? {
        id: currentSemester.id,
        name: currentSemester.name,
      } : null,
      grades,
    });
  })
);

/**
 * @route   GET /api/v1/student/grades/history
 * @desc    Get complete grade history
 * @access  Private (Student only)
 */
router.get(
  '/grades/history',
  asyncHandler(async (req, res) => {
    const studentId = (req as any).studentId;
    const grades = await studentService.getGrades(studentId);
    return sendSuccess(res, grades);
  })
);

/**
 * @route   GET /api/v1/student/grades/gpa
 * @desc    Get GPA/CGPA calculation
 * @access  Private (Student only)
 */
router.get(
  '/grades/gpa',
  asyncHandler(async (req, res) => {
    const studentId = (req as any).studentId;
    const transcript = await studentService.generateTranscript(studentId);

    // Extract GPA info
    const semesters = transcript.academicRecord.semesters.map((s) => ({
      name: s.name,
      credits: s.semesterCredits,
      gpa: s.semesterGPA,
    }));

    return sendSuccess(res, {
      semesters,
      totalCredits: transcript.academicRecord.totalCredits,
      cumulativeGPA: transcript.academicRecord.cumulativeGPA,
    });
  })
);

/**
 * @route   GET /api/v1/student/transcript
 * @desc    Generate unofficial transcript
 * @access  Private (Student only)
 */
router.get(
  '/transcript',
  asyncHandler(async (req, res) => {
    const studentId = (req as any).studentId;
    const transcript = await studentService.generateTranscript(studentId);
    return sendSuccess(res, {
      ...transcript,
      isOfficial: false,
      disclaimer: 'This is an unofficial transcript for reference only.',
    });
  })
);

/**
 * @route   GET /api/v1/student/attendance
 * @desc    Get attendance records
 * @access  Private (Student only)
 */
router.get(
  '/attendance',
  asyncHandler(async (req, res) => {
    const studentId = (req as any).studentId;
    const semesterId = req.query.semesterId as string | undefined;

    // Default to current semester
    let targetSemesterId = semesterId;
    if (!targetSemesterId) {
      const currentSemester = await prisma.semester.findFirst({
        where: { isCurrent: true },
      });
      targetSemesterId = currentSemester?.id;
    }

    const attendance = await studentService.getAttendance(studentId, targetSemesterId);
    return sendSuccess(res, attendance);
  })
);

/**
 * @route   GET /api/v1/student/schedule
 * @desc    Get weekly class schedule
 * @access  Private (Student only)
 */
router.get(
  '/schedule',
  asyncHandler(async (req, res) => {
    const studentId = (req as any).studentId;

    // Get current semester enrollments with class schedule
    const currentSemester = await prisma.semester.findFirst({
      where: { isCurrent: true },
    });

    if (!currentSemester) {
      return sendSuccess(res, { semester: null, schedule: [] });
    }

    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        semesterId: currentSemester.id,
        status: 'REGISTERED',
      },
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
            schedules: {
              include: { room: true },
            },
          },
        },
      },
    });

    // Build schedule from class schedules
    // Map day numbers (0=Sunday, 1=Monday, etc.) to day names
    const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

    const schedule = enrollments.flatMap((e) =>
      e.class.schedules.map((s) => ({
        day: dayNames[s.dayOfWeek] || 'MONDAY',
        startTime: s.startTime,
        endTime: s.endTime,
        room: s.room?.name,
        course: {
          id: e.class.course.id,
          code: e.class.course.code,
          name: e.class.course.name,
        },
        class: {
          id: e.class.id,
          name: e.class.name,
        },
        lecturer: e.class.lecturer ? {
          id: e.class.lecturer.id,
          name: `${e.class.lecturer.user.firstName} ${e.class.lecturer.user.lastName}`,
        } : null,
      }))
    );

    // Sort by day and time
    const dayOrder = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    schedule.sort((a, b) => {
      const dayDiff = dayOrder.indexOf(a.day) - dayOrder.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return a.startTime.localeCompare(b.startTime);
    });

    return sendSuccess(res, {
      semester: {
        id: currentSemester.id,
        name: currentSemester.name,
      },
      schedule,
    });
  })
);

// ============================================
// FINANCE ROUTES
// ============================================

/**
 * @route   GET /api/v1/student/fees
 * @desc    Get fee structure for program
 * @access  Private (Student only)
 */
router.get(
  '/fees',
  asyncHandler(async (req, res) => {
    const studentId = (req as any).studentId;

    try {
      const feeStructure = await feeStructureService.getFeeStructureForStudent(studentId);
      return sendSuccess(res, feeStructure);
    } catch {
      return sendSuccess(res, null, 'No fee structure found for current academic year');
    }
  })
);

/**
 * @route   GET /api/v1/student/balance
 * @desc    Get current balance
 * @access  Private (Student only)
 */
router.get(
  '/balance',
  asyncHandler(async (req, res) => {
    const studentId = (req as any).studentId;

    // Get all invoices with payments
    const invoices = await prisma.invoice.findMany({
      where: {
        studentId,
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
      },
      include: {
        payments: {
          where: {
            OR: [
              { notes: null },
              { notes: { not: { contains: 'VOIDED:' } } },
            ],
          },
        },
      },
    });

    // Calculate totals
    let totalInvoiced = 0;
    let totalPaid = 0;
    let nextDueDate: Date | null = null;
    let nextDueAmount = 0;

    for (const invoice of invoices) {
      const invoiceAmount = Number(invoice.amount);
      const invoicePaid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      totalInvoiced += invoiceAmount;
      totalPaid += invoicePaid;

      const balance = invoiceAmount - invoicePaid;
      if (balance > 0 && invoice.dueDate) {
        if (!nextDueDate || invoice.dueDate < nextDueDate) {
          nextDueDate = invoice.dueDate;
          nextDueAmount = balance;
        }
      }
    }

    const outstandingBalance = totalInvoiced - totalPaid;

    return sendSuccess(res, {
      totalInvoiced,
      totalPaid,
      outstandingBalance,
      nextPayment: nextDueDate ? {
        amount: nextDueAmount,
        dueDate: nextDueDate,
      } : null,
    });
  })
);

/**
 * @route   GET /api/v1/student/invoices
 * @desc    Get all invoices
 * @access  Private (Student only)
 */
router.get(
  '/invoices',
  asyncHandler(async (req, res) => {
    const studentId = (req as any).studentId;

    const invoices = await prisma.invoice.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      include: {
        payments: {
          where: {
            OR: [
              { notes: null },
              { notes: { not: { contains: 'VOIDED:' } } },
            ],
          },
          select: {
            id: true,
            amount: true,
            createdAt: true,
          },
        },
      },
    });

    // Get semester names for each invoice
    const semesterIds = [...new Set(invoices.map(i => i.semesterId))];
    const semesters = await prisma.semester.findMany({
      where: { id: { in: semesterIds } },
      select: { id: true, name: true },
    });
    const semesterMap = new Map(semesters.map(s => [s.id, s]));

    return sendSuccess(res, invoices.map((i) => {
      const totalPaid = i.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      return {
        id: i.id,
        invoiceNo: i.invoiceNo,
        amount: Number(i.amount),
        totalPaid,
        balance: Number(i.amount) - totalPaid,
        status: i.status,
        dueDate: i.dueDate,
        description: i.description,
        semester: semesterMap.get(i.semesterId) || { id: i.semesterId, name: 'Unknown' },
        createdAt: i.createdAt,
      };
    }));
  })
);

/**
 * @route   GET /api/v1/student/payments
 * @desc    Get payment history
 * @access  Private (Student only)
 */
router.get(
  '/payments',
  asyncHandler(async (req, res) => {
    const studentId = (req as any).studentId;

    const payments = await prisma.payment.findMany({
      where: {
        studentId,
        OR: [
          { notes: null },
          { notes: { not: { contains: 'VOIDED:' } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNo: true,
          },
        },
      },
    });

    return sendSuccess(res, payments.map((p) => ({
      id: p.id,
      receiptNo: p.receiptNo,
      amount: Number(p.amount),
      method: p.method,
      reference: p.reference,
      invoice: p.invoice,
      createdAt: p.createdAt,
    })));
  })
);

/**
 * @route   GET /api/v1/student/payments/:id/receipt
 * @desc    Download receipt
 * @access  Private (Student only)
 */
router.get(
  '/payments/:id/receipt',
  asyncHandler(async (req, res) => {
    const studentId = (req as any).studentId;
    const paymentId = req.params.id;

    // Verify payment belongs to student
    const payment = await prisma.payment.findFirst({
      where: { id: paymentId, studentId },
    });

    if (!payment) {
      throw AppError.notFound('Payment not found');
    }

    const receipt = await paymentService.generateReceipt(paymentId);
    return sendSuccess(res, receipt);
  })
);

// ============================================
// COMMUNICATION ROUTES
// ============================================

/**
 * @route   GET /api/v1/student/announcements
 * @desc    Get relevant announcements
 * @access  Private (Student only)
 */
router.get(
  '/announcements',
  asyncHandler(async (_req, res) => {
    // Get announcements targeted at STUDENT role
    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        targetRoles: { has: 'STUDENT' },
        publishAt: { lte: new Date() },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { publishAt: 'desc' },
      take: 20,
    });

    return sendSuccess(res, announcements.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      type: a.type,
      priority: 'NORMAL', // Default priority since it's not in schema
      author: null,
      publishedAt: a.publishAt,
      expiresAt: a.expiresAt,
    })));
  })
);

/**
 * @route   GET /api/v1/student/dashboard
 * @desc    Get dashboard summary data
 * @access  Private (Student only)
 */
router.get(
  '/dashboard',
  asyncHandler(async (req, res) => {
    const studentId = (req as any).studentId;

    // Get student with program
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        user: {
          select: { firstName: true, lastName: true, avatar: true },
        },
        program: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    if (!student) {
      throw AppError.notFound('Student not found');
    }

    // Get current semester
    const currentSemester = await prisma.semester.findFirst({
      where: { isCurrent: true },
    });

    // Get current enrollments count
    const enrollmentsCount = await prisma.enrollment.count({
      where: {
        studentId,
        semesterId: currentSemester?.id,
        status: 'REGISTERED',
      },
    });

    // Get GPA
    const transcript = await studentService.generateTranscript(studentId);

    // Get attendance rate
    const attendance = await studentService.getAttendance(studentId, currentSemester?.id);

    // Get balance
    const invoices = await prisma.invoice.findMany({
      where: {
        studentId,
        status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] },
      },
      include: {
        payments: {
          where: {
            OR: [
              { notes: null },
              { notes: { not: { contains: 'VOIDED:' } } },
            ],
          },
        },
      },
    });

    let outstandingBalance = 0;
    for (const invoice of invoices) {
      const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      outstandingBalance += Number(invoice.amount) - paid;
    }

    // Get today's schedule
    const today = new Date();
    const todayDayOfWeek = today.getDay(); // 0=Sunday, 1=Monday, etc.

    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        semesterId: currentSemester?.id,
        status: 'REGISTERED',
      },
      include: {
        class: {
          include: {
            course: true,
            schedules: {
              where: { dayOfWeek: todayDayOfWeek },
              include: { room: true },
            },
            lecturer: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    const todayClasses = enrollments
      .flatMap((e) =>
        e.class.schedules.map((s) => ({
          startTime: s.startTime,
          endTime: s.endTime,
          room: s.room?.name,
          course: {
            code: e.class.course.code,
            name: e.class.course.name,
          },
          lecturer: e.class.lecturer
            ? `${e.class.lecturer.user.firstName} ${e.class.lecturer.user.lastName}`
            : null,
        }))
      )
      .sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Get recent announcements
    const announcements = await prisma.announcement.findMany({
      where: {
        isActive: true,
        targetRoles: { has: 'STUDENT' },
        publishAt: { lte: new Date() },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { publishAt: 'desc' },
      take: 3,
    });

    return sendSuccess(res, {
      student: {
        id: student.id,
        studentId: student.studentId,
        name: `${student.user.firstName} ${student.user.lastName}`,
        avatar: student.user?.avatar,
        program: student.program,
        currentSemester: student.currentSemester,
        status: student.status,
      },
      semester: currentSemester ? {
        id: currentSemester.id,
        name: currentSemester.name,
      } : null,
      stats: {
        enrolledCourses: enrollmentsCount,
        cumulativeGPA: transcript.academicRecord.cumulativeGPA,
        totalCredits: transcript.academicRecord.totalCredits,
        attendanceRate: attendance.summary.attendanceRate,
        outstandingBalance,
      },
      todayClasses,
      recentAnnouncements: announcements.map((a) => ({
        id: a.id,
        title: a.title,
        type: a.type,
        publishedAt: a.publishAt,
      })),
    });
  })
);

// ============================================
// LIBRARY ROUTES
// ============================================

/**
 * @route   GET /api/v1/student/library/borrowings
 * @desc    Get current borrowings
 * @access  Private (Student only)
 */
router.get(
  '/library/borrowings',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const borrowings = await borrowingService.getActiveBorrowings(userId);
    return sendSuccess(res, borrowings);
  })
);

/**
 * @route   GET /api/v1/student/library/history
 * @desc    Get borrowing history
 * @access  Private (Student only)
 */
router.get(
  '/library/history',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { page, limit } = req.query;
    const result = await borrowingService.getBorrowingHistory(
      userId,
      parseInt(page as string) || 1,
      parseInt(limit as string) || 20
    );
    return sendSuccess(res, result);
  })
);

/**
 * @route   POST /api/v1/student/library/renew/:borrowingId
 * @desc    Renew a borrowed book
 * @access  Private (Student only)
 */
router.post(
  '/library/renew/:borrowingId',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { borrowingId } = req.params;

    // Verify the borrowing belongs to the student
    const borrowing = await prisma.borrowing.findFirst({
      where: {
        id: borrowingId,
        borrowerId: userId,
        status: { in: ['ACTIVE', 'OVERDUE'] },
      },
    });

    if (!borrowing) {
      throw AppError.notFound('Borrowing not found or not eligible for renewal');
    }

    const result = await borrowingService.renewBook(borrowingId, userId);
    return sendSuccess(res, result, 'Book renewed successfully');
  })
);

/**
 * @route   GET /api/v1/student/library/reservations
 * @desc    Get student's reservations
 * @access  Private (Student only)
 */
router.get(
  '/library/reservations',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const reservations = await reservationService.getUserReservations(userId);
    return sendSuccess(res, reservations);
  })
);

/**
 * @route   POST /api/v1/student/library/reserve/:bookId
 * @desc    Reserve a book
 * @access  Private (Student only)
 */
router.post(
  '/library/reserve/:bookId',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { bookId } = req.params;
    const reservation = await reservationService.reserveBook(bookId, userId);
    return sendSuccess(res, reservation, 'Book reserved successfully');
  })
);

/**
 * @route   DELETE /api/v1/student/library/reservations/:id
 * @desc    Cancel a reservation
 * @access  Private (Student only)
 */
router.delete(
  '/library/reservations/:id',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const { id } = req.params;

    // Verify the reservation belongs to the student
    const reservation = await prisma.reservation.findFirst({
      where: {
        id,
        userId,
        status: { in: ['PENDING', 'READY'] },
      },
    });

    if (!reservation) {
      throw AppError.notFound('Reservation not found');
    }

    await reservationService.cancelReservation(id, userId);
    return sendSuccess(res, null, 'Reservation cancelled');
  })
);

/**
 * @route   GET /api/v1/student/library/fines
 * @desc    Get unpaid library fines
 * @access  Private (Student only)
 */
router.get(
  '/library/fines',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;

    const fines = await prisma.borrowing.findMany({
      where: {
        borrowerId: userId,
        lateFee: { gt: 0 },
        lateFeeStatus: 'PENDING',
      },
      include: {
        bookCopy: {
          include: {
            book: {
              select: { id: true, title: true, author: true },
            },
          },
        },
      },
      orderBy: { returnDate: 'desc' },
    });

    const totalFines = fines.reduce((sum, b) => sum + Number(b.lateFee || 0), 0);

    return sendSuccess(res, {
      fines: fines.map((f) => ({
        id: f.id,
        book: f.bookCopy.book,
        borrowDate: f.borrowDate,
        dueDate: f.dueDate,
        returnDate: f.returnDate,
        lateFee: Number(f.lateFee),
      })),
      totalFines,
    });
  })
);

/**
 * @route   GET /api/v1/student/library/stats
 * @desc    Get library statistics for the student
 * @access  Private (Student only)
 */
router.get(
  '/library/stats',
  asyncHandler(async (req, res) => {
    const userId = req.user!.userId;
    const stats = await borrowingService.getMemberStats(userId);
    return sendSuccess(res, stats);
  })
);

export default router;
