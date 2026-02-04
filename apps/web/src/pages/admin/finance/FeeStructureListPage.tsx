import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Edit, Trash2 } from 'lucide-react';
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
import { feeStructuresApi, type FeeStructure, type PaginatedFeeStructures } from '@/lib/api/feeStructures';
import { programsApi, type Program } from '@/lib/api/programs';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export function FeeStructureListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [pagination, setPagination] = useState<PaginatedFeeStructures['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const page = parseInt(searchParams.get('page') || '1');
  const programId = searchParams.get('programId') || '';
  const academicYear = searchParams.get('academicYear') || '';

  useEffect(() => {
    loadFeeStructures();
    loadPrograms();
  }, [page, programId, academicYear]);

  const loadFeeStructures = async () => {
    try {
      setLoading(true);
      const response = await feeStructuresApi.getFeeStructures({
        page,
        limit: 10,
        programId: programId || undefined,
        academicYear: academicYear || undefined,
      });
      if (response.success && response.data) {
        setFeeStructures(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Failed to load fee structures:', error);
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

  const handleProgramFilter = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set('programId', value);
    } else {
      params.delete('programId');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleYearFilter = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set('academicYear', value);
    } else {
      params.delete('academicYear');
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
    if (!deleteId) return;
    try {
      await feeStructuresApi.deleteFeeStructure(deleteId);
      loadFeeStructures();
    } catch (error) {
      console.error('Failed to delete fee structure:', error);
    } finally {
      setDeleteId(null);
    }
  };

  // Generate academic years for filter
  const currentYear = new Date().getFullYear();
  const academicYears = Array.from({ length: 5 }, (_, i) => {
    const year = currentYear - 2 + i;
    return `${year}-${year + 1}`;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fee Structures</h1>
          <p className="text-muted-foreground">Manage program fee structures by academic year</p>
        </div>
        <Link to="/admin/finance/fee-structures/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Fee Structure
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fee Structures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
            <Select value={programId || 'all'} onValueChange={handleProgramFilter}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Filter by program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.code} - {program.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={academicYear || 'all'} onValueChange={handleYearFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Academic year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {academicYears.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
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
                    <TableHead>Program</TableHead>
                    <TableHead>Academic Year</TableHead>
                    <TableHead className="text-right">Tuition</TableHead>
                    <TableHead className="text-right">Registration</TableHead>
                    <TableHead className="text-right">Library</TableHead>
                    <TableHead className="text-right">Lab</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feeStructures.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No fee structures found
                      </TableCell>
                    </TableRow>
                  ) : (
                    feeStructures.map((fs) => (
                      <TableRow key={fs.id}>
                        <TableCell className="font-medium">
                          {fs.program?.code} - {fs.program?.name}
                        </TableCell>
                        <TableCell>{fs.academicYear}</TableCell>
                        <TableCell className="text-right">{formatCurrency(fs.tuitionFee)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(fs.registrationFee)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(fs.libraryFee)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(fs.labFee)}</TableCell>
                        <TableCell className="text-right font-bold">{formatCurrency(fs.totalFee)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link to={`/admin/finance/fee-structures/${fs.id}/edit`}>
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteId(fs.id)}
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
                    {pagination.total} fee structures
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
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Fee Structure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this fee structure.
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
