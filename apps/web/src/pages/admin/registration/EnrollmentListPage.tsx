import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UserPlus, UserMinus, BookOpen } from 'lucide-react';
import {
  enrollmentsApi,
  type Enrollment,
  type EnrollmentStatus,
} from '@/lib/api/enrollments';
import { semestersApi, type Semester } from '@/lib/api/academicCalendar';
import { classesApi, type ClassEntity } from '@/lib/api/classes';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export function EnrollmentListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [dropDialogOpen, setDropDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<Enrollment | null>(null);

  // Form state
  const [enrollForm, setEnrollForm] = useState({
    studentId: '',
    classId: '',
    overridePrerequisites: false,
    overrideReason: '',
  });
  const [dropReason, setDropReason] = useState('');

  const semesterId = searchParams.get('semesterId') || '';
  const classId = searchParams.get('classId') || '';
  const status = (searchParams.get('status') as EnrollmentStatus) || '';

  useEffect(() => {
    loadSemesters();
  }, []);

  useEffect(() => {
    if (semesterId) {
      loadClasses();
    }
    loadEnrollments();
  }, [semesterId, classId, status]);

  const loadSemesters = async () => {
    try {
      const response = await semestersApi.getSemesters();
      setSemesters(response.data || []);
    } catch (error) {
      console.error('Failed to load semesters:', error);
    }
  };

  const loadClasses = async () => {
    try {
      const result = await classesApi.getClasses({ semesterId });
      setClasses(result.data?.data || []);
    } catch (error) {
      console.error('Failed to load classes:', error);
    }
  };

  const loadEnrollments = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (semesterId) filters.semesterId = semesterId;
      if (classId) filters.classId = classId;
      if (status) filters.status = status;

      const data = await enrollmentsApi.getAll(filters);
      setEnrollments(data);
    } catch (error) {
      console.error('Failed to load enrollments:', error);
      toast({ variant: 'destructive', title: 'Failed to load enrollments' });
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!enrollForm.studentId || !enrollForm.classId) {
      toast({ variant: 'destructive', title: 'Please fill in all required fields' });
      return;
    }

    if (enrollForm.overridePrerequisites && !enrollForm.overrideReason) {
      toast({ variant: 'destructive', title: 'Please provide a reason for prerequisite override' });
      return;
    }

    try {
      await enrollmentsApi.enroll({
        studentId: enrollForm.studentId,
        classId: enrollForm.classId,
        overridePrerequisites: enrollForm.overridePrerequisites,
        overrideReason: enrollForm.overrideReason || undefined,
      });
      toast({ title: 'Student enrolled successfully' });
      setEnrollDialogOpen(false);
      setEnrollForm({
        studentId: '',
        classId: '',
        overridePrerequisites: false,
        overrideReason: '',
      });
      loadEnrollments();
    } catch (error: any) {
      console.error('Failed to enroll:', error);
      toast({
        variant: 'destructive',
        title: error.response?.data?.message || 'Failed to enroll student',
      });
    }
  };

  const handleDrop = async () => {
    if (!selectedEnrollment) return;

    try {
      await enrollmentsApi.drop({
        studentId: selectedEnrollment.studentId,
        classId: selectedEnrollment.classId,
        reason: dropReason || undefined,
      });
      toast({ title: 'Student dropped from class' });
      setDropDialogOpen(false);
      setSelectedEnrollment(null);
      setDropReason('');
      loadEnrollments();
    } catch (error: any) {
      console.error('Failed to drop:', error);
      toast({
        variant: 'destructive',
        title: error.response?.data?.message || 'Failed to drop student',
      });
    }
  };

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    // Reset classId when semester changes
    if (key === 'semesterId') {
      params.delete('classId');
    }
    setSearchParams(params);
  };

  const getStatusBadge = (enrollmentStatus: EnrollmentStatus) => {
    const styles: Record<EnrollmentStatus, string> = {
      REGISTERED: 'bg-green-100 text-green-800',
      DROPPED: 'bg-red-100 text-red-800',
      COMPLETED: 'bg-blue-100 text-blue-800',
      FAILED: 'bg-orange-100 text-orange-800',
    };
    return <Badge className={styles[enrollmentStatus]}>{enrollmentStatus}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Enrollments</h1>
          <p className="text-muted-foreground">
            Manage student course enrollments
          </p>
        </div>
        <Button onClick={() => setEnrollDialogOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Enroll Student
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Select
              value={semesterId}
              onValueChange={(value) => updateFilter('semesterId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Semesters</SelectItem>
                {semesters.map((semester) => (
                  <SelectItem key={semester.id} value={semester.id}>
                    {semester.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={classId}
              onValueChange={(value) => updateFilter('classId', value)}
              disabled={!semesterId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} - {cls.course?.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={status}
              onValueChange={(value) => updateFilter('status', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="REGISTERED">Registered</SelectItem>
                <SelectItem value="DROPPED">Dropped</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>Enrolled</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : enrollments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No enrollments found
                  </TableCell>
                </TableRow>
              ) : (
                enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {enrollment.student?.user.firstName}{' '}
                          {enrollment.student?.user.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {enrollment.student?.studentId}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {enrollment.class?.name}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div>{enrollment.class?.course?.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {enrollment.class?.course?.code}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{enrollment.class?.course?.credits}</TableCell>
                    <TableCell>{formatDate(enrollment.createdAt)}</TableCell>
                    <TableCell>{getStatusBadge(enrollment.status)}</TableCell>
                    <TableCell>
                      {enrollment.status === 'REGISTERED' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedEnrollment(enrollment);
                            setDropDialogOpen(true);
                          }}
                        >
                          <UserMinus className="mr-1 h-3 w-3" />
                          Drop
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Enroll Dialog */}
      <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Enroll Student in Class</DialogTitle>
            <DialogDescription>
              Enter the student ID and select a class to enroll
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="studentId">Student ID (UUID)</Label>
              <Input
                id="studentId"
                placeholder="Enter student UUID"
                value={enrollForm.studentId}
                onChange={(e) =>
                  setEnrollForm({ ...enrollForm, studentId: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="classId">Class ID (UUID)</Label>
              <Input
                id="classId"
                placeholder="Enter class UUID"
                value={enrollForm.classId}
                onChange={(e) =>
                  setEnrollForm({ ...enrollForm, classId: e.target.value })
                }
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overridePrerequisites"
                  checked={enrollForm.overridePrerequisites}
                  onCheckedChange={(checked) =>
                    setEnrollForm({
                      ...enrollForm,
                      overridePrerequisites: !!checked,
                    })
                  }
                />
                <label htmlFor="overridePrerequisites" className="text-sm">
                  Override Prerequisites
                </label>
              </div>

              {enrollForm.overridePrerequisites && (
                <div className="space-y-2">
                  <Label htmlFor="overrideReason">Override Reason</Label>
                  <Textarea
                    id="overrideReason"
                    placeholder="Explain why prerequisites are being overridden"
                    value={enrollForm.overrideReason}
                    onChange={(e) =>
                      setEnrollForm({
                        ...enrollForm,
                        overrideReason: e.target.value,
                      })
                    }
                  />
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEnroll}>Enroll Student</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Drop Confirmation */}
      <AlertDialog open={dropDialogOpen} onOpenChange={setDropDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Drop Student from Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to drop{' '}
              <strong>
                {selectedEnrollment?.student?.user.firstName}{' '}
                {selectedEnrollment?.student?.user.lastName}
              </strong>{' '}
              from <strong>{selectedEnrollment?.class?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="dropReason">Reason (Optional)</Label>
            <Textarea
              id="dropReason"
              placeholder="Enter reason for dropping"
              value={dropReason}
              onChange={(e) => setDropReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDropReason('')}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDrop} className="bg-destructive">
              Drop Student
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
