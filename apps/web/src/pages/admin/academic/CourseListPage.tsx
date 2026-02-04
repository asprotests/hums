import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { coursesApi, type Course, type PaginatedCourses } from '@/lib/api/courses';
import { departmentsApi, type Department } from '@/lib/api/departments';

export function CourseListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [courses, setCourses] = useState<Course[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pagination, setPagination] = useState<PaginatedCourses['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteCourseId, setDeleteCourseId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const departmentId = searchParams.get('departmentId') || '';

  useEffect(() => {
    loadCourses();
    loadDepartments();
  }, [page, search, departmentId]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const response = await coursesApi.getCourses({ page, limit: 10, search: search || undefined, departmentId: departmentId || undefined });
      if (response.success && response.data) {
        setCourses(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Failed to load courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await departmentsApi.getDepartments({ limit: 100 });
      if (response.success && response.data) setDepartments(response.data.data);
    } catch (error) {
      console.error('Failed to load departments:', error);
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
    if (!deleteCourseId) return;
    try {
      setDeleteError(null);
      await coursesApi.deleteCourse(deleteCourseId);
      loadCourses();
      setDeleteCourseId(null);
    } catch (error: any) {
      setDeleteError(error.response?.data?.message || 'Failed to delete course');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Courses</h1>
          <p className="text-muted-foreground">Manage course catalog</p>
        </div>
        <Link to="/admin/academic/courses/new"><Button><Plus className="mr-2 h-4 w-4" />Add Course</Button></Link>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" />Course List</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or code..." value={search} onChange={(e) => handleFilter('search', e.target.value)} className="pl-8" />
            </div>
            <Select value={departmentId || 'all'} onValueChange={(v) => handleFilter('departmentId', v)}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Prerequisites</TableHead>
                    <TableHead>Used In</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.length === 0 ? (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No courses found</TableCell></TableRow>
                  ) : (
                    courses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell><Badge variant="outline">{course.code}</Badge></TableCell>
                        <TableCell className="font-medium">{course.name}</TableCell>
                        <TableCell>{course.department?.name || '-'}</TableCell>
                        <TableCell><Badge variant="secondary">{course.credits}</Badge></TableCell>
                        <TableCell>
                          {course.prerequisites.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {course.prerequisites.map((p) => (<Badge key={p.id} variant="outline" className="text-xs">{p.code}</Badge>))}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell><Badge variant="secondary">{course.programCount} program(s)</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link to={`/admin/academic/courses/${course.id}/edit`}><Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button></Link>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteCourseId(course.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleFilter('page', String(pagination.page - 1))} disabled={pagination.page === 1}>Previous</Button>
                    <span className="text-sm">Page {pagination.page} of {pagination.totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => handleFilter('page', String(pagination.page + 1))} disabled={pagination.page === pagination.totalPages}>Next</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteCourseId} onOpenChange={() => { setDeleteCourseId(null); setDeleteError(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Course</AlertDialogTitle>
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
    </div>
  );
}
