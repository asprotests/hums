import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye, FolderTree } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { departmentsApi, type Department, type PaginatedDepartments } from '@/lib/api/departments';
import { facultiesApi, type Faculty } from '@/lib/api/faculties';

export function DepartmentListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [pagination, setPagination] = useState<PaginatedDepartments['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDepartmentId, setDeleteDepartmentId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const facultyId = searchParams.get('facultyId') || '';

  useEffect(() => {
    loadDepartments();
    loadFaculties();
  }, [page, search, facultyId]);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const response = await departmentsApi.getDepartments({
        page,
        limit: 10,
        search: search || undefined,
        facultyId: facultyId || undefined,
      });
      if (response.success && response.data) {
        setDepartments(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFaculties = async () => {
    try {
      const response = await facultiesApi.getFaculties({ limit: 100 });
      if (response.success && response.data) {
        setFaculties(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load faculties:', error);
    }
  };

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleFacultyFilter = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set('facultyId', value);
    } else {
      params.delete('facultyId');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
  };

  const handleDelete = async () => {
    if (!deleteDepartmentId) return;
    try {
      setDeleteError(null);
      await departmentsApi.deleteDepartment(deleteDepartmentId);
      loadDepartments();
      setDeleteDepartmentId(null);
    } catch (error: any) {
      setDeleteError(error.response?.data?.message || 'Failed to delete department');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Departments</h1>
          <p className="text-muted-foreground">Manage academic departments</p>
        </div>
        <Link to="/admin/academic/departments/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Department
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            Department List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or code..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={facultyId || 'all'} onValueChange={handleFacultyFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by faculty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Faculties</SelectItem>
                {faculties.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
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
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Faculty</TableHead>
                    <TableHead>HOD</TableHead>
                    <TableHead>Programs</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No departments found
                      </TableCell>
                    </TableRow>
                  ) : (
                    departments.map((department) => (
                      <TableRow key={department.id}>
                        <TableCell>
                          <Badge variant="outline">{department.code}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{department.name}</TableCell>
                        <TableCell>{department.faculty?.name || '-'}</TableCell>
                        <TableCell>{department.hod?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{department.programCount}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{department.courseCount}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link to={`/admin/academic/departments/${department.id}`}>
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link to={`/admin/academic/departments/${department.id}/edit`}>
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteDepartmentId(department.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
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
                    {pagination.total} departments
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
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
                      onClick={() => handlePageChange(pagination.page + 1)}
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

      <AlertDialog open={!!deleteDepartmentId} onOpenChange={() => { setDeleteDepartmentId(null); setDeleteError(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Department</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this department? This action cannot be undone.
              {deleteError && (
                <p className="mt-2 text-destructive font-medium">{deleteError}</p>
              )}
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
