import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, DollarSign, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
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
import { payrollApi, type PayrollProcessResult } from '@/lib/api/payroll';
import { departmentsApi, type Department } from '@/lib/api/departments';
import { useEffect } from 'react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function PayrollProcessPage() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [departmentId, setDepartmentId] = useState<string>('ALL');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<PayrollProcessResult | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

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

  const handleProcess = async () => {
    try {
      setProcessing(true);
      const response = await payrollApi.processPayroll({
        month,
        year,
        departmentId: departmentId !== 'ALL' ? departmentId : undefined,
      });
      if (response.success && response.data) {
        setResult(response.data);
        setShowConfirm(false);
      }
    } catch (err) {
      console.error('Failed to process payroll:', err);
    } finally {
      setProcessing(false);
    }
  };

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Process Payroll</h1>
          <p className="text-muted-foreground">
            Calculate and process payroll for employees
          </p>
        </div>
      </div>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Payroll Configuration</CardTitle>
          <CardDescription>Select the period and scope for payroll processing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Month</Label>
              <Select value={String(month)} onValueChange={(v) => setMonth(parseInt(v))}>
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

            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
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

            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
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

          <div className="rounded-lg border p-4 bg-muted/50">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Processing Summary
            </h4>
            <p className="text-sm text-muted-foreground">
              Processing payroll for{' '}
              <span className="font-medium text-foreground">
                {MONTHS[month - 1]} {year}
              </span>
              {departmentId !== 'ALL' && (
                <>
                  {' '}
                  - Department:{' '}
                  <span className="font-medium text-foreground">
                    {departments.find((d) => d.id === departmentId)?.name}
                  </span>
                </>
              )}
            </p>
          </div>

          <Button
            size="lg"
            onClick={() => setShowConfirm(true)}
            disabled={processing}
            className="w-full md:w-auto"
          >
            <Play className="mr-2 h-4 w-4" />
            Process Payroll
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Processing Complete
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Users className="h-8 w-8 text-green-500" />
                    <div>
                      <div className="text-2xl font-bold">{result.processed}</div>
                      <p className="text-sm text-muted-foreground">Successfully Processed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                    <div>
                      <div className="text-2xl font-bold">{result.failed}</div>
                      <p className="text-sm text-muted-foreground">Failed</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-8 w-8 text-primary" />
                    <div>
                      <div className="text-2xl font-bold">
                        {result.processed + result.failed}
                      </div>
                      <p className="text-sm text-muted-foreground">Total Employees</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {result.errors.length > 0 && (
              <div className="rounded-lg border border-destructive/50 p-4">
                <h4 className="font-medium text-destructive mb-2">Processing Errors</h4>
                <div className="space-y-1">
                  {result.errors.map((error, i) => (
                    <div key={i} className="text-sm">
                      <span className="font-mono">{error.employeeId}</span>:{' '}
                      <span className="text-muted-foreground">{error.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={() => navigate('/admin/hr/payroll')}>
                View Processed Payrolls
              </Button>
              <Button variant="outline" onClick={() => setResult(null)}>
                Process Another
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!result && (
        <Card>
          <CardHeader>
            <CardTitle>How Payroll Processing Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">1. Base Salary</h4>
                <p className="text-sm text-muted-foreground">
                  Each employee's base salary is taken from their employee profile.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">2. Allowances</h4>
                <p className="text-sm text-muted-foreground">
                  Universal allowances and employee-specific allowances are calculated and added.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">3. Deductions</h4>
                <p className="text-sm text-muted-foreground">
                  Tax, pension, and other deductions are calculated and subtracted.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">4. Net Salary</h4>
                <p className="text-sm text-muted-foreground">
                  Net Salary = Base + Allowances - Deductions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Payroll Processing</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to process payroll for{' '}
              <span className="font-medium">{MONTHS[month - 1]} {year}</span>
              {departmentId !== 'ALL' && (
                <>
                  {' '}for the{' '}
                  <span className="font-medium">
                    {departments.find((d) => d.id === departmentId)?.name}
                  </span>{' '}
                  department
                </>
              )}
              .
              <br /><br />
              This will calculate salaries for all active employees based on their salary
              components. Existing DRAFT payrolls will be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleProcess} disabled={processing}>
              {processing ? 'Processing...' : 'Process Payroll'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default PayrollProcessPage;
