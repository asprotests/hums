import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Plus,
  Calendar,
  Clock,
  MapPin,
  MoreVertical,
  Trash2,
  Edit,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { examsApi, type Exam, type ExamStatus, type ExamType } from '@/lib/api/exams';
import { semestersApi, type Semester } from '@/lib/api/academicCalendar';

export function ExamListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [deleteExamItem, setDeleteExamItem] = useState<Exam | null>(null);
  const [cancelExamItem, setCancelExamItem] = useState<Exam | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Filters from URL params
  const semesterId = searchParams.get('semesterId') || '';
  const status = searchParams.get('status') || '';
  const type = searchParams.get('type') || '';

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadExams();
  }, [semesterId, status, type]);

  const loadInitialData = async () => {
    try {
      const [semestersRes, currentRes] = await Promise.all([
        semestersApi.getSemesters(),
        semestersApi.getCurrentSemester(),
      ]);

      if (semestersRes.success && semestersRes.data) {
        setSemesters(semestersRes.data);
      }
      if (currentRes.success && currentRes.data) {
        if (!semesterId) {
          setSearchParams((prev) => {
            prev.set('semesterId', currentRes.data!.id);
            return prev;
          });
        }
      }
    } catch (err) {
      console.error('Failed to load semesters:', err);
    }
  };

  const loadExams = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await examsApi.getAll({
        semesterId: semesterId || undefined,
        status: (status as ExamStatus) || undefined,
        type: (type as ExamType) || undefined,
      });

      if (result.success && result.data) {
        setExams(result.data);
      } else {
        setExams([]);
      }
    } catch (err: any) {
      console.error('Failed to load exams:', err);
      setError(err.response?.data?.message || 'Failed to load exams');
      setExams([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setSearchParams((prev) => {
      if (value) {
        prev.set(key, value);
      } else {
        prev.delete(key);
      }
      return prev;
    });
  };

  const handleDeleteExam = async () => {
    if (!deleteExamItem) return;
    try {
      setDeleting(true);
      await examsApi.delete(deleteExamItem.id);
      setDeleteExamItem(null);
      await loadExams();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete exam');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelExam = async () => {
    if (!cancelExamItem || !cancelReason.trim()) return;
    try {
      setCancelling(true);
      await examsApi.cancel(cancelExamItem.id, cancelReason);
      setCancelExamItem(null);
      setCancelReason('');
      await loadExams();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel exam');
    } finally {
      setCancelling(false);
    }
  };

  const getStatusBadge = (examStatus: ExamStatus) => {
    switch (examStatus) {
      case 'SCHEDULED':
        return <Badge className="bg-blue-500">Scheduled</Badge>;
      case 'IN_PROGRESS':
        return <Badge className="bg-yellow-500">In Progress</Badge>;
      case 'COMPLETED':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
    }
  };

  const getTypeBadge = (examType: ExamType) => {
    const colors: Record<ExamType, string> = {
      MIDTERM: 'bg-blue-500',
      FINAL: 'bg-purple-500',
      QUIZ: 'bg-yellow-500',
      MAKEUP: 'bg-orange-500',
    };
    return <Badge className={colors[examType]}>{examType}</Badge>;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exams</h1>
          <p className="text-muted-foreground">Schedule and manage exams</p>
        </div>
        <Link to="/admin/exams/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Exam
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-full md:w-48">
              <Select
                value={semesters.find(s => s.id === semesterId) ? semesterId : undefined}
                onValueChange={(v) => handleFilterChange('semesterId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {semesters.map((sem) => (
                    <SelectItem key={sem.id} value={sem.id}>
                      {sem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-40">
              <Select value={type || 'all'} onValueChange={(v) => handleFilterChange('type', v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="MIDTERM">Midterm</SelectItem>
                  <SelectItem value="FINAL">Final</SelectItem>
                  <SelectItem value="QUIZ">Quiz</SelectItem>
                  <SelectItem value="MAKEUP">Makeup</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-40">
              <Select value={status || 'all'} onValueChange={(v) => handleFilterChange('status', v === 'all' ? '' : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>
      )}

      {/* Exams Table */}
      <Card>
        {loading ? (
          <CardContent className="py-12">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        ) : exams.length === 0 ? (
          <CardContent className="py-12 text-center">
            <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Exams Found</h3>
            <p className="text-muted-foreground mb-4">
              No exams match your current filters.
            </p>
            <Link to="/admin/exams/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Schedule First Exam
              </Button>
            </Link>
          </CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exams.map((exam) => (
                <TableRow key={exam.id}>
                  <TableCell className="font-medium">{exam.title}</TableCell>
                  <TableCell>
                    <div>
                      <div>{exam.class.course.code}</div>
                      <div className="text-xs text-muted-foreground">{exam.class.name}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getTypeBadge(exam.type)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(exam.date)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {exam.startTime} - {exam.endTime}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      {exam.room.name}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(exam.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/admin/exams/${exam.id}/edit`)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        {exam.status === 'SCHEDULED' && (
                          <DropdownMenuItem onClick={() => setCancelExamItem(exam)}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel Exam
                          </DropdownMenuItem>
                        )}
                        {exam.status !== 'COMPLETED' && (
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteExamItem(exam)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteExamItem} onOpenChange={() => setDeleteExamItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteExamItem?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExam}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Dialog */}
      <AlertDialog open={!!cancelExamItem} onOpenChange={() => setCancelExamItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Exam</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for cancelling "{cancelExamItem?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelReason('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelExam}
              disabled={cancelling || !cancelReason.trim()}
            >
              {cancelling ? 'Cancelling...' : 'Cancel Exam'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ExamListPage;
