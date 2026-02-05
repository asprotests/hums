import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, GraduationCap, Users, Calendar, Ban, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { classesApi, type ClassEntity, type PaginatedClasses, type ClassStatus } from '@/lib/api/classes';
import { semestersApi, type Semester } from '@/lib/api/academicCalendar';
import { coursesApi, type Course } from '@/lib/api/courses';

export function ClassListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [pagination, setPagination] = useState<PaginatedClasses['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteClassId, setDeleteClassId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [cancelClassId, setCancelClassId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);

  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const semesterId = searchParams.get('semesterId') || '';
  const courseId = searchParams.get('courseId') || '';
  const status = searchParams.get('status') || '';

  useEffect(() => {
    loadClasses();
    loadSemesters();
    loadCourses();
  }, [page, search, semesterId, courseId, status]);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const response = await classesApi.getClasses({
        page,
        limit: 10,
        search: search || undefined,
        semesterId: semesterId || undefined,
        courseId: courseId || undefined,
        status: status as ClassStatus || undefined,
      });
      if (response.success && response.data) {
        setClasses(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Failed to load classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSemesters = async () => {
    try {
      const response = await semestersApi.getSemesters();
      if (response.success && response.data) {
        setSemesters(response.data);
      }
    } catch (error) {
      console.error('Failed to load semesters:', error);
    }
  };

  const loadCourses = async () => {
    try {
      const response = await coursesApi.getCourses({ limit: 100 });
      if (response.success && response.data) {
        setCourses(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
    }
  };

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') params.set(key, value);
    else params.delete(key);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleDelete = async () => {
    if (!deleteClassId) return;
    try {
      setDeleteError(null);
      await classesApi.deleteClass(deleteClassId);
      loadClasses();
      setDeleteClassId(null);
    } catch (error: any) {
      setDeleteError(error.response?.data?.message || 'Failed to delete class');
    }
  };

  const handleCancel = async () => {
    if (!cancelClassId || !cancelReason.trim()) return;
    try {
      setCancelError(null);
      await classesApi.cancelClass(cancelClassId, cancelReason);
      loadClasses();
      setCancelClassId(null);
      setCancelReason('');
    } catch (error: any) {
      setCancelError(error.response?.data?.message || 'Failed to cancel class');
    }
  };

  const handleStatusChange = async (classId: string, action: 'close' | 'reopen') => {
    try {
      if (action === 'close') {
        await classesApi.closeClass(classId);
      } else {
        await classesApi.reopenClass(classId);
      }
      loadClasses();
    } catch (error: any) {
      console.error('Failed to change class status:', error);
    }
  };

  const getStatusBadge = (status: ClassStatus) => {
    switch (status) {
      case 'OPEN': return <Badge className="bg-green-500">Open</Badge>;
      case 'CLOSED': return <Badge variant="secondary">Closed</Badge>;
      case 'CANCELLED': return <Badge variant="destructive">Cancelled</Badge>;
    }
  };

  const getCapacityColor = (enrolled: number, capacity: number) => {
    const percentage = (enrolled / capacity) * 100;
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Classes</h1>
          <p className="text-muted-foreground">Manage class sections and schedules</p>
        </div>
        <Link to="/admin/classes/new">
          <Button><Plus className="mr-2 h-4 w-4" />Create Class</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />Class List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, course, or lecturer..."
                value={search}
                onChange={(e) => handleFilter('search', e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={semesterId || 'all'} onValueChange={(v) => handleFilter('semesterId', v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {semesters.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={courseId || 'all'} onValueChange={(v) => handleFilter('courseId', v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status || 'all'} onValueChange={(v) => handleFilter('status', v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="OPEN">Open</SelectItem>
                <SelectItem value="CLOSED">Closed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Lecturer</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[150px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No classes found
                      </TableCell>
                    </TableRow>
                  ) : (
                    classes.map((cls) => (
                      <TableRow key={cls.id}>
                        <TableCell>
                          <Link to={`/admin/classes/${cls.id}`} className="font-medium hover:underline">
                            {cls.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div>
                            <Badge variant="outline">{cls.course.code}</Badge>
                            <p className="text-sm text-muted-foreground mt-1">{cls.course.name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {cls.lecturer.user.firstName} {cls.lecturer.user.lastName}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {cls.semester.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 font-medium ${getCapacityColor(cls.enrolledCount, cls.capacity)}`}>
                            <Users className="h-4 w-4" />
                            {cls.enrolledCount}/{cls.capacity}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(cls.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Link to={`/admin/classes/${cls.id}/edit`}>
                              <Button variant="ghost" size="icon" title="Edit">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            {cls.status === 'OPEN' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Close"
                                onClick={() => handleStatusChange(cls.id, 'close')}
                              >
                                <Lock className="h-4 w-4" />
                              </Button>
                            )}
                            {cls.status === 'CLOSED' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Reopen"
                                onClick={() => handleStatusChange(cls.id, 'reopen')}
                              >
                                <Unlock className="h-4 w-4" />
                              </Button>
                            )}
                            {cls.status !== 'CANCELLED' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Cancel"
                                onClick={() => setCancelClassId(cls.id)}
                              >
                                <Ban className="h-4 w-4 text-orange-500" />
                              </Button>
                            )}
                            {cls.enrolledCount === 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Delete"
                                onClick={() => setDeleteClassId(cls.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilter('page', String(pagination.page - 1))}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilter('page', String(pagination.page + 1))}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteClassId} onOpenChange={() => { setDeleteClassId(null); setDeleteError(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Class</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This cannot be undone.
              {deleteError && <p className="mt-2 text-destructive font-medium">{deleteError}</p>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Class Dialog */}
      <Dialog open={!!cancelClassId} onOpenChange={() => { setCancelClassId(null); setCancelReason(''); setCancelError(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Class</DialogTitle>
            <DialogDescription>
              Provide a reason for cancelling this class. Students will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cancelReason">Cancellation Reason</Label>
              <Textarea
                id="cancelReason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g., Insufficient enrollment, lecturer unavailable..."
                rows={3}
              />
            </div>
            {cancelError && (
              <p className="text-sm text-destructive">{cancelError}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelClassId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={!cancelReason.trim()}>
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
