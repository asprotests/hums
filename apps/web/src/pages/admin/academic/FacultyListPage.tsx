import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye, Building2 } from 'lucide-react';
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
import { facultiesApi, type Faculty, type PaginatedFaculties } from '@/lib/api/faculties';

export function FacultyListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [pagination, setPagination] = useState<PaginatedFaculties['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteFacultyId, setDeleteFacultyId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';

  useEffect(() => {
    loadFaculties();
  }, [page, search]);

  const loadFaculties = async () => {
    try {
      setLoading(true);
      const response = await facultiesApi.getFaculties({
        page,
        limit: 10,
        search: search || undefined,
      });
      if (response.success && response.data) {
        setFaculties(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Failed to load faculties:', error);
    } finally {
      setLoading(false);
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

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
  };

  const handleDelete = async () => {
    if (!deleteFacultyId) return;
    try {
      setDeleteError(null);
      await facultiesApi.deleteFaculty(deleteFacultyId);
      loadFaculties();
      setDeleteFacultyId(null);
    } catch (error: any) {
      setDeleteError(error.response?.data?.message || 'Failed to delete faculty');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Faculties</h1>
          <p className="text-muted-foreground">Manage academic faculties</p>
        </div>
        <Link to="/admin/academic/faculties/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Faculty
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Faculty List
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
                    <TableHead>Local Name</TableHead>
                    <TableHead>Dean</TableHead>
                    <TableHead>Departments</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faculties.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No faculties found
                      </TableCell>
                    </TableRow>
                  ) : (
                    faculties.map((faculty) => (
                      <TableRow key={faculty.id}>
                        <TableCell>
                          <Badge variant="outline">{faculty.code}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{faculty.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {faculty.nameLocal || '-'}
                        </TableCell>
                        <TableCell>{faculty.dean?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{faculty.departmentCount}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link to={`/admin/academic/faculties/${faculty.id}`}>
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link to={`/admin/academic/faculties/${faculty.id}/edit`}>
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteFacultyId(faculty.id)}
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
                    {pagination.total} faculties
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteFacultyId} onOpenChange={() => { setDeleteFacultyId(null); setDeleteError(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Faculty</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this faculty? This action cannot be undone.
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
