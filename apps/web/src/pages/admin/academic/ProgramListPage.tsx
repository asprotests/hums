import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { programsApi, type Program, type PaginatedPrograms, type ProgramType } from '@/lib/api/programs';
import { departmentsApi, type Department } from '@/lib/api/departments';

const programTypeColors: Record<ProgramType, string> = {
  CERTIFICATE: 'bg-gray-100 text-gray-800',
  DIPLOMA: 'bg-blue-100 text-blue-800',
  BACHELOR: 'bg-green-100 text-green-800',
  MASTER: 'bg-purple-100 text-purple-800',
};

export function ProgramListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pagination, setPagination] = useState<PaginatedPrograms['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteProgramId, setDeleteProgramId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const departmentId = searchParams.get('departmentId') || '';
  const type = (searchParams.get('type') as ProgramType) || '';

  useEffect(() => {
    loadPrograms();
    loadDepartments();
  }, [page, search, departmentId, type]);

  const loadPrograms = async () => {
    try {
      setLoading(true);
      const response = await programsApi.getPrograms({
        page, limit: 10,
        search: search || undefined,
        departmentId: departmentId || undefined,
        type: type || undefined,
      });
      if (response.success && response.data) {
        setPrograms(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Failed to load programs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const response = await departmentsApi.getDepartments({ limit: 100 });
      if (response.success && response.data) {
        setDepartments(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleDelete = async () => {
    if (!deleteProgramId) return;
    try {
      setDeleteError(null);
      await programsApi.deleteProgram(deleteProgramId);
      loadPrograms();
      setDeleteProgramId(null);
    } catch (error: any) {
      setDeleteError(error.response?.data?.message || 'Failed to delete program');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Programs</h1>
          <p className="text-muted-foreground">Manage academic degree programs</p>
        </div>
        <Link to="/admin/academic/programs/new">
          <Button><Plus className="mr-2 h-4 w-4" />Add Program</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />Program List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or code..."
                value={search}
                onChange={(e) => handleFilter('search', e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={departmentId || 'all'} onValueChange={(v) => handleFilter('departmentId', v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={type || 'all'} onValueChange={(v) => handleFilter('type', v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="CERTIFICATE">Certificate</SelectItem>
                <SelectItem value="DIPLOMA">Diploma</SelectItem>
                <SelectItem value="BACHELOR">Bachelor</SelectItem>
                <SelectItem value="MASTER">Master</SelectItem>
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
                    <TableHead>Type</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No programs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    programs.map((program) => (
                      <TableRow key={program.id}>
                        <TableCell><Badge variant="outline">{program.code}</Badge></TableCell>
                        <TableCell className="font-medium">{program.name}</TableCell>
                        <TableCell>
                          <Badge className={programTypeColors[program.type]}>{program.type}</Badge>
                        </TableCell>
                        <TableCell>{program.department?.name || '-'}</TableCell>
                        <TableCell>{program.durationYears} year(s)</TableCell>
                        <TableCell>{program.totalCredits}</TableCell>
                        <TableCell><Badge variant="secondary">{program.studentCount}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link to={`/admin/academic/programs/${program.id}`}>
                              <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                            </Link>
                            <Link to={`/admin/academic/programs/${program.id}/edit`}>
                              <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                            </Link>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteProgramId(program.id)}>
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
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                  </p>
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

      <AlertDialog open={!!deleteProgramId} onOpenChange={() => { setDeleteProgramId(null); setDeleteError(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Program</AlertDialogTitle>
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
