import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  DollarSign,
  Eye,
  CheckCircle,
  Clock,
  CreditCard,
  FileDown,
  Check,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  payrollApi,
  type Payroll,
  type PayrollStatus,
} from '@/lib/api/payroll';
import { departmentsApi, type Department } from '@/lib/api/departments';
import { Pagination } from '@/components/ui/pagination';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function PayrollListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [monthFilter, setMonthFilter] = useState<string>(
    searchParams.get('month') || String(new Date().getMonth() + 1)
  );
  const [yearFilter, setYearFilter] = useState<string>(
    searchParams.get('year') || String(new Date().getFullYear())
  );
  const [statusFilter, setStatusFilter] = useState<PayrollStatus | 'ALL'>(
    (searchParams.get('status') as PayrollStatus) || 'ALL'
  );
  const [departmentFilter, setDepartmentFilter] = useState<string>(
    searchParams.get('departmentId') || 'ALL'
  );

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadPayrolls();
  }, [searchParams]);

  const loadDepartments = async () => {
    try {
      const response = await departmentsApi.getDepartments({ limit: 100 });
      if (response.success && response.data) {
        setDepartments(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const loadPayrolls = async () => {
    try {
      setLoading(true);
      const page = parseInt(searchParams.get('page') || '1');
      const month = searchParams.get('month');
      const year = searchParams.get('year');
      const status = searchParams.get('status') as PayrollStatus | null;
      const departmentId = searchParams.get('departmentId');

      const response = await payrollApi.getPayrolls({
        page,
        limit: 20,
        month: month ? parseInt(month) : new Date().getMonth() + 1,
        year: year ? parseInt(year) : new Date().getFullYear(),
        status: status || undefined,
        departmentId: departmentId || undefined,
      });

      if (response.success && response.data) {
        setPayrolls(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load payrolls:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'ALL') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', String(page));
    setSearchParams(newParams);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const approvedIds = payrolls
        .filter((p) => p.status === 'APPROVED')
        .map((p) => p.id);
      setSelectedIds(new Set(approvedIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedIds(newSet);
  };

  const handleApprove = async (id: string) => {
    try {
      await payrollApi.approvePayroll(id);
      loadPayrolls();
    } catch (err) {
      console.error('Failed to approve payroll:', err);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await payrollApi.markAsPaid(id);
      loadPayrolls();
    } catch (err) {
      console.error('Failed to mark as paid:', err);
    }
  };

  const handleBulkMarkPaid = async () => {
    if (selectedIds.size === 0) return;
    try {
      setBulkProcessing(true);
      await payrollApi.bulkMarkAsPaid({ payrollIds: Array.from(selectedIds) });
      setSelectedIds(new Set());
      loadPayrolls();
    } catch (err) {
      console.error('Failed to bulk mark as paid:', err);
    } finally {
      setBulkProcessing(false);
    }
  };

  const handleDownloadBankFile = async () => {
    try {
      const response = await payrollApi.getBankFile(
        parseInt(monthFilter),
        parseInt(yearFilter)
      );
      if (response.success && response.data) {
        const blob = new Blob([response.data.content], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.data.filename;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to download bank file:', err);
    }
  };

  const getStatusBadge = (status: PayrollStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <Badge variant="secondary" className="gap-1">
            <FileText className="h-3 w-3" />
            Draft
          </Badge>
        );
      case 'PROCESSED':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Processed
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge variant="default" className="gap-1 bg-blue-600">
            <CheckCircle className="h-3 w-3" />
            Approved
          </Badge>
        );
      case 'PAID':
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CreditCard className="h-3 w-3" />
            Paid
          </Badge>
        );
    }
  };

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i);
  const approvedPayrolls = payrolls.filter((p) => p.status === 'APPROVED');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payroll List</h1>
          <p className="text-muted-foreground">View and manage processed payrolls</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadBankFile}>
            <FileDown className="mr-2 h-4 w-4" />
            Download Bank File
          </Button>
          <Link to="/admin/hr/payroll/process">
            <Button>
              <DollarSign className="mr-2 h-4 w-4" />
              Process Payroll
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-36">
              <Label className="text-xs text-muted-foreground">Month</Label>
              <Select
                value={monthFilter}
                onValueChange={(value) => {
                  setMonthFilter(value);
                  handleFilterChange('month', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-28">
              <Label className="text-xs text-muted-foreground">Year</Label>
              <Select
                value={yearFilter}
                onValueChange={(value) => {
                  setYearFilter(value);
                  handleFilterChange('year', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-40">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as PayrollStatus | 'ALL');
                  handleFilterChange('status', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PROCESSED">Processed</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <Label className="text-xs text-muted-foreground">Department</Label>
              <Select
                value={departmentFilter}
                onValueChange={(value) => {
                  setDepartmentFilter(value);
                  handleFilterChange('departmentId', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Departments</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} payroll(s) selected
              </span>
              <Button
                size="sm"
                onClick={handleBulkMarkPaid}
                disabled={bulkProcessing}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                {bulkProcessing ? 'Processing...' : 'Mark as Paid'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payrolls Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Payrolls - {MONTHS[parseInt(monthFilter) - 1]} {yearFilter}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={
                          approvedPayrolls.length > 0 &&
                          approvedPayrolls.every((p) => selectedIds.has(p.id))
                        }
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-right">Base Salary</TableHead>
                    <TableHead className="text-right">Net Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[140px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrolls.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No payrolls found for this period
                      </TableCell>
                    </TableRow>
                  ) : (
                    payrolls.map((payroll) => (
                      <TableRow key={payroll.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedIds.has(payroll.id)}
                            onCheckedChange={(checked) =>
                              handleSelect(payroll.id, checked as boolean)
                            }
                            disabled={payroll.status !== 'APPROVED'}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <span className="font-medium">
                              {payroll.employee.user.firstName}{' '}
                              {payroll.employee.user.lastName}
                            </span>
                            <span className="block text-sm text-muted-foreground">
                              {payroll.employee.employeeId}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {payroll.employee.department?.name || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${Number(payroll.baseSalary).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          ${Number(payroll.netSalary).toFixed(2)}
                        </TableCell>
                        <TableCell>{getStatusBadge(payroll.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Link to={`/admin/hr/payroll/${payroll.id}`}>
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            {payroll.status === 'PROCESSED' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleApprove(payroll.id)}
                                title="Approve"
                              >
                                <Check className="h-4 w-4 text-blue-600" />
                              </Button>
                            )}
                            {payroll.status === 'APPROVED' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleMarkPaid(payroll.id)}
                                title="Mark as Paid"
                              >
                                <CreditCard className="h-4 w-4 text-green-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {pagination.totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default PayrollListPage;
