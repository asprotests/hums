import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  User,
  GraduationCap,
  Calendar,
  Mail,
  Phone,
  MapPin,
  BookOpen,
  CreditCard,
  ClipboardCheck,
  FileText,
  ArrowRightLeft,
  UserX,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  studentsApi,
  type Student,
  type StudentStatus,
  type Enrollment,
  type Grade,
  type PaymentsData,
  type AttendanceData,
  type StudentDocument,
} from '@/lib/api/students';
import { programsApi, type Program } from '@/lib/api/programs';
import { useToast } from '@/hooks/use-toast';

const statusColors: Record<StudentStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  ACTIVE: 'success',
  INACTIVE: 'secondary',
  GRADUATED: 'default',
  SUSPENDED: 'destructive',
  WITHDRAWN: 'destructive',
  TRANSFERRED: 'outline',
};

const statusLabels: Record<StudentStatus, string> = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  GRADUATED: 'Graduated',
  SUSPENDED: 'Suspended',
  WITHDRAWN: 'Withdrawn',
  TRANSFERRED: 'Transferred',
};

export function StudentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Related data
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [paymentsData, setPaymentsData] = useState<PaymentsData | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceData | null>(null);
  const [documents, setDocuments] = useState<StudentDocument[]>([]);

  // Dialog states
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [deactivateStatus, setDeactivateStatus] = useState<'SUSPENDED' | 'WITHDRAWN'>('SUSPENDED');
  const [deactivateReason, setDeactivateReason] = useState('');
  const [transferProgramId, setTransferProgramId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [programs, setPrograms] = useState<Program[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadStudent(id);
      loadPrograms();
    }
  }, [id]);

  useEffect(() => {
    if (id && student) {
      loadRelatedData(id);
    }
  }, [id, activeTab, student]);

  const loadStudent = async (studentId: string) => {
    try {
      setLoading(true);
      const response = await studentsApi.getStudentById(studentId);
      if (response.success && response.data) {
        setStudent(response.data);
      }
    } catch (error) {
      console.error('Failed to load student:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load student details',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadPrograms = async () => {
    try {
      const response = await programsApi.getPrograms({ limit: 100 });
      if (response.success && response.data) {
        setPrograms(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load programs:', error);
    }
  };

  const loadRelatedData = async (studentId: string) => {
    try {
      switch (activeTab) {
        case 'enrollments':
          const enrollResponse = await studentsApi.getEnrollments(studentId);
          if (enrollResponse.success && enrollResponse.data) {
            setEnrollments(enrollResponse.data);
          }
          break;
        case 'grades':
          const gradesResponse = await studentsApi.getGrades(studentId);
          if (gradesResponse.success && gradesResponse.data) {
            setGrades(gradesResponse.data);
          }
          break;
        case 'payments':
          const paymentsResponse = await studentsApi.getPayments(studentId);
          if (paymentsResponse.success && paymentsResponse.data) {
            setPaymentsData(paymentsResponse.data);
          }
          break;
        case 'attendance':
          const attendanceResponse = await studentsApi.getAttendance(studentId);
          if (attendanceResponse.success && attendanceResponse.data) {
            setAttendanceData(attendanceResponse.data);
          }
          break;
        case 'documents':
          const docsResponse = await studentsApi.getDocuments(studentId);
          if (docsResponse.success && docsResponse.data) {
            setDocuments(docsResponse.data);
          }
          break;
      }
    } catch (error) {
      console.error('Failed to load related data:', error);
    }
  };

  const handleDeactivate = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await studentsApi.deactivateStudent(id, {
        status: deactivateStatus,
        reason: deactivateReason || undefined,
      });
      toast({
        title: 'Success',
        description: `Student ${deactivateStatus.toLowerCase()} successfully`,
      });
      setShowDeactivateDialog(false);
      setDeactivateReason('');
      loadStudent(id);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to deactivate student',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!id || !transferProgramId) return;
    try {
      setActionLoading(true);
      await studentsApi.transferStudent(id, {
        newProgramId: transferProgramId,
        reason: transferReason || undefined,
      });
      toast({
        title: 'Success',
        description: 'Student transferred successfully',
      });
      setShowTransferDialog(false);
      setTransferProgramId('');
      setTransferReason('');
      loadStudent(id);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to transfer student',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Student not found</p>
        <Button variant="link" onClick={() => navigate('/admin/students')}>
          Back to students
        </Button>
      </div>
    );
  }

  const canEdit = student.status === 'ACTIVE';
  const canDeactivate = student.status === 'ACTIVE';
  const canTransfer = student.status === 'ACTIVE';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/students')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{student.studentId}</h1>
              <Badge variant={statusColors[student.status]}>
                {statusLabels[student.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {student.user?.firstName} {student.user?.middleName ? `${student.user?.middleName} ` : ''}{student.user?.lastName} - {student.program?.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Link to={`/admin/students/${student.id}/edit`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
          )}
          {canTransfer && (
            <Button variant="outline" onClick={() => setShowTransferDialog(true)}>
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transfer
            </Button>
          )}
          {canDeactivate && (
            <Button variant="destructive" onClick={() => setShowDeactivateDialog(true)}>
              <UserX className="mr-2 h-4 w-4" />
              Deactivate
            </Button>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Personal Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Personal Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label className="text-muted-foreground">First Name</Label>
                    <p className="font-medium">{student.user?.firstName}</p>
                  </div>
                  {student.user?.middleName && (
                    <div>
                      <Label className="text-muted-foreground">Middle Name</Label>
                      <p className="font-medium">{student.user?.middleName}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Last Name</Label>
                    <p className="font-medium">{student.user?.lastName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground">Email</Label>
                      <p className="font-medium">{student.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label className="text-muted-foreground">Phone</Label>
                      <p className="font-medium">{student.user?.phone || 'N/A'}</p>
                    </div>
                  </div>
                  {student.dateOfBirth && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-muted-foreground">Date of Birth</Label>
                        <p className="font-medium">{new Date(student.dateOfBirth).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                  {student.gender && (
                    <div>
                      <Label className="text-muted-foreground">Gender</Label>
                      <p className="font-medium">{student.gender}</p>
                    </div>
                  )}
                  {student.nationality && (
                    <div>
                      <Label className="text-muted-foreground">Nationality</Label>
                      <p className="font-medium">{student.nationality}</p>
                    </div>
                  )}
                  {student.city && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <Label className="text-muted-foreground">City</Label>
                        <p className="font-medium">{student.city}</p>
                      </div>
                    </div>
                  )}
                  {student.address && (
                    <div className="md:col-span-2">
                      <Label className="text-muted-foreground">Address</Label>
                      <p className="font-medium">{student.address}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Guardian Information */}
              {student.guardianName && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Guardian Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label className="text-muted-foreground">Guardian Name</Label>
                      <p className="font-medium">{student.guardianName}</p>
                    </div>
                    {student.guardianPhone && (
                      <div>
                        <Label className="text-muted-foreground">Guardian Phone</Label>
                        <p className="font-medium">{student.guardianPhone}</p>
                      </div>
                    )}
                    {student.guardianRelation && (
                      <div>
                        <Label className="text-muted-foreground">Relationship</Label>
                        <p className="font-medium">{student.guardianRelation}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-6">
              {/* Academic Info Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Academic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground">Student ID</Label>
                    <p className="font-mono font-bold">{student.studentId}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Program</Label>
                    <p className="font-medium">{student.program?.code} - {student.program?.name}</p>
                  </div>
                  {student.program?.department && (
                    <div>
                      <Label className="text-muted-foreground">Department</Label>
                      <p className="font-medium">{student.program.department.name}</p>
                    </div>
                  )}
                  {student.program?.department?.faculty && (
                    <div>
                      <Label className="text-muted-foreground">Faculty</Label>
                      <p className="font-medium">{student.program.department.faculty.name}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Admission Date</Label>
                    <p className="font-medium">{new Date(student.admissionDate).toLocaleDateString()}</p>
                  </div>
                  {student.expectedGraduationDate && (
                    <div>
                      <Label className="text-muted-foreground">Expected Graduation</Label>
                      <p className="font-medium">{new Date(student.expectedGraduationDate).toLocaleDateString()}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">
                      <Badge variant={statusColors[student.status]}>
                        {statusLabels[student.status]}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="enrollments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Course Enrollments
              </CardTitle>
              <CardDescription>Current and past course enrollments</CardDescription>
            </CardHeader>
            <CardContent>
              {enrollments.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No enrollments found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Lecturer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Credits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enrollments.map((enrollment) => (
                      <TableRow key={enrollment.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{enrollment.class.course.code}</div>
                            <div className="text-sm text-muted-foreground">{enrollment.class.course.name}</div>
                          </div>
                        </TableCell>
                        <TableCell>{enrollment.semester.name}</TableCell>
                        <TableCell>{enrollment.class.lecturer?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={enrollment.status === 'COMPLETED' ? 'success' : enrollment.status === 'DROPPED' ? 'destructive' : 'secondary'}>
                            {enrollment.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{enrollment.class.course.credits}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grades" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Academic Grades
              </CardTitle>
              <CardDescription>Grade history and GPA</CardDescription>
            </CardHeader>
            <CardContent>
              {grades.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No grades found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Credits</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {grades.map((grade, index) => (
                      <TableRow key={`${grade.course.code}-${grade.semester}-${index}`}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{grade.course.code}</div>
                            <div className="text-sm text-muted-foreground">{grade.course.name}</div>
                          </div>
                        </TableCell>
                        <TableCell>{grade.semester}</TableCell>
                        <TableCell>{grade.course.credits}</TableCell>
                        <TableCell>{grade.finalScore.toFixed(1)}%</TableCell>
                        <TableCell className="font-bold">{grade.letterGrade}</TableCell>
                        <TableCell>{grade.gradePoints.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <div className="space-y-6">
            {/* Summary Cards */}
            {paymentsData && (
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      ${paymentsData.summary.totalPaid.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Due</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${paymentsData.summary.totalDue.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Balance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${paymentsData.summary.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${paymentsData.summary.balance.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Invoices */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Invoices
                </CardTitle>
                <CardDescription>Outstanding and past invoices</CardDescription>
              </CardHeader>
              <CardContent>
                {!paymentsData || paymentsData.invoices.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No invoices found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice #</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentsData.invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                          <TableCell className="font-mono">{invoice.invoiceNo}</TableCell>
                          <TableCell>{invoice.description || '-'}</TableCell>
                          <TableCell className="font-medium">${invoice.amount.toLocaleString()}</TableCell>
                          <TableCell>{new Date(invoice.dueDate).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant={invoice.status === 'PAID' ? 'success' : invoice.status === 'OVERDUE' ? 'destructive' : 'secondary'}>
                              {invoice.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Payment History
                </CardTitle>
                <CardDescription>Recorded payments</CardDescription>
              </CardHeader>
              <CardContent>
                {!paymentsData || paymentsData.payments.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No payments found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Receipt #</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Reference</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentsData.payments.map((payment) => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-mono">{payment.receiptNo}</TableCell>
                          <TableCell className="font-medium">${payment.amount.toLocaleString()}</TableCell>
                          <TableCell>{payment.method}</TableCell>
                          <TableCell>{payment.reference || '-'}</TableCell>
                          <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="mt-6">
          <div className="space-y-6">
            {/* Summary Cards */}
            {attendanceData && (
              <div className="grid gap-4 md:grid-cols-5">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Classes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{attendanceData.summary.totalClasses}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Present</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{attendanceData.summary.present}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Absent</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{attendanceData.summary.absent}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Late</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-600">{attendanceData.summary.late}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${attendanceData.summary.attendanceRate >= 75 ? 'text-green-600' : 'text-red-600'}`}>
                      {attendanceData.summary.attendanceRate}%
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Attendance By Class */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  Attendance by Class
                </CardTitle>
                <CardDescription>Attendance breakdown for each class</CardDescription>
              </CardHeader>
              <CardContent>
                {!attendanceData || attendanceData.byClass.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No attendance records found</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Course</TableHead>
                        <TableHead>Semester</TableHead>
                        <TableHead>Present</TableHead>
                        <TableHead>Absent</TableHead>
                        <TableHead>Late</TableHead>
                        <TableHead>Excused</TableHead>
                        <TableHead>Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceData.byClass.map((item, index) => (
                        <TableRow key={item.class?.id || index}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.class?.course.code || 'N/A'}</div>
                              <div className="text-sm text-muted-foreground">{item.class?.course.name || 'Unknown'}</div>
                            </div>
                          </TableCell>
                          <TableCell>{item.class?.semester || '-'}</TableCell>
                          <TableCell className="text-green-600 font-medium">{item.stats.present}</TableCell>
                          <TableCell className="text-red-600 font-medium">{item.stats.absent}</TableCell>
                          <TableCell className="text-yellow-600 font-medium">{item.stats.late}</TableCell>
                          <TableCell className="text-blue-600 font-medium">{item.stats.excused}</TableCell>
                          <TableCell>
                            <Badge variant={item.stats.attendanceRate >= 75 ? 'success' : 'destructive'}>
                              {item.stats.attendanceRate}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Student Documents
              </CardTitle>
              <CardDescription>Uploaded documents and files</CardDescription>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No documents found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">{doc.originalName}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{doc.type}</Badge>
                        </TableCell>
                        <TableCell>{(doc.size / 1024).toFixed(1)} KB</TableCell>
                        <TableCell>{new Date(doc.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <a href={doc.url} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="sm">View</Button>
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Deactivate Dialog */}
      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Student</AlertDialogTitle>
            <AlertDialogDescription>
              This will change the student's status. They will no longer be able to access the student portal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={deactivateStatus} onValueChange={(v) => setDeactivateStatus(v as 'SUSPENDED' | 'WITHDRAWN')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUSPENDED">Suspended</SelectItem>
                  <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                placeholder="Enter reason..."
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              disabled={actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Dialog */}
      <AlertDialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Transfer Student</AlertDialogTitle>
            <AlertDialogDescription>
              Transfer this student to a different program. Their enrollment and academic history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Program</Label>
              <Select value={transferProgramId} onValueChange={setTransferProgramId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {programs
                    .filter((p) => p.id !== student.programId)
                    .map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.code} - {program.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                placeholder="Enter transfer reason..."
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleTransfer}
              disabled={!transferProgramId || actionLoading}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Transfer Student'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
