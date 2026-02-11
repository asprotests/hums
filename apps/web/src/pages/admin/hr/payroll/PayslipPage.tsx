import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Printer, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { payrollApi, type Payroll } from '@/lib/api/payroll';
import { format } from 'date-fns';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function PayslipPage() {
  const { id } = useParams<{ id: string }>();
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadPayroll();
    }
  }, [id]);

  const loadPayroll = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await payrollApi.getPayrollById(id);
      if (response.success && response.data) {
        setPayroll(response.data);
      }
    } catch (err) {
      console.error('Failed to load payroll:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!payroll) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">Payroll not found</p>
        <Link to="/admin/hr/payroll">
          <Button className="mt-4">Back to Payrolls</Button>
        </Link>
      </div>
    );
  }

  const allowances = payroll.items.filter((item) => item.type === 'ALLOWANCE');
  const deductions = payroll.items.filter((item) => item.type === 'DEDUCTION');

  return (
    <div className="space-y-6">
      {/* Header - Hidden in print */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Link to="/admin/hr/payroll">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Payslip</h1>
            <p className="text-muted-foreground">
              {MONTHS[payroll.month - 1]} {payroll.year}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Payslip Document */}
      <Card className="max-w-3xl mx-auto print:border-none print:shadow-none">
        <CardContent className="p-8">
          {/* Company Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Building2 className="h-8 w-8" />
              <h2 className="text-2xl font-bold">HORMUUD UNIVERSITY</h2>
            </div>
            <p className="text-muted-foreground">Mogadishu, Somalia</p>
            <h3 className="text-xl font-semibold mt-4">PAYSLIP</h3>
            <p className="text-lg">
              {MONTHS[payroll.month - 1]} {payroll.year}
            </p>
          </div>

          <Separator className="my-6" />

          {/* Employee Details */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Employee Name</span>
                <p className="font-medium">
                  {payroll.employee.user.firstName} {payroll.employee.user.lastName}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Employee ID</span>
                <p className="font-medium">{payroll.employee.employeeId}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Department</span>
                <p className="font-medium">{payroll.employee.department?.name || 'N/A'}</p>
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <span className="text-sm text-muted-foreground">Position</span>
                <p className="font-medium">{payroll.employee.position}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Pay Period</span>
                <p className="font-medium">
                  {MONTHS[payroll.month - 1]} 1 - {MONTHS[payroll.month - 1]}{' '}
                  {new Date(payroll.year, payroll.month, 0).getDate()}, {payroll.year}
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge
                  variant={payroll.status === 'PAID' ? 'default' : 'secondary'}
                  className={payroll.status === 'PAID' ? 'bg-green-600' : ''}
                >
                  {payroll.status}
                </Badge>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Earnings and Deductions */}
          <div className="grid grid-cols-2 gap-8">
            {/* Earnings */}
            <div>
              <h4 className="font-semibold mb-4 text-green-700">EARNINGS</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Basic Salary</span>
                  <span className="font-mono">${Number(payroll.baseSalary).toFixed(2)}</span>
                </div>
                {allowances.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span>
                      {item.name}
                      {item.calculationType === 'PERCENTAGE' && ` (${item.value}%)`}
                    </span>
                    <span className="font-mono">${Number(item.amount).toFixed(2)}</span>
                  </div>
                ))}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Gross Salary</span>
                  <span className="font-mono">${Number(payroll.grossSalary).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <h4 className="font-semibold mb-4 text-red-700">DEDUCTIONS</h4>
              <div className="space-y-2">
                {deductions.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No deductions</p>
                ) : (
                  deductions.map((item) => (
                    <div key={item.id} className="flex justify-between">
                      <span>
                        {item.name}
                        {item.calculationType === 'PERCENTAGE' && ` (${item.value}%)`}
                      </span>
                      <span className="font-mono">${Number(item.amount).toFixed(2)}</span>
                    </div>
                  ))
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total Deductions</span>
                  <span className="font-mono">${Number(payroll.totalDeductions).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Net Salary */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold">NET SALARY</span>
              <span className="text-2xl font-bold text-green-600 font-mono">
                ${Number(payroll.netSalary).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Payment Details */}
          <div className="mt-6 space-y-2">
            <h4 className="font-semibold">Payment Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Payment Method</span>
                <p>
                  {payroll.employee.bankAccount
                    ? 'Bank Transfer'
                    : payroll.employee.mobileWallet
                    ? 'Mobile Wallet'
                    : 'Cash'}
                </p>
              </div>
              {payroll.employee.bankName && (
                <div>
                  <span className="text-muted-foreground">Bank</span>
                  <p>{payroll.employee.bankName}</p>
                </div>
              )}
              {payroll.employee.bankAccount && (
                <div>
                  <span className="text-muted-foreground">Account Number</span>
                  <p>****{payroll.employee.bankAccount.slice(-4)}</p>
                </div>
              )}
              {payroll.employee.mobileWallet && (
                <div>
                  <span className="text-muted-foreground">Mobile Wallet</span>
                  <p>{payroll.employee.mobileWallet}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t text-center text-sm text-muted-foreground">
            <p>This is a computer-generated document. No signature is required.</p>
            {payroll.paidAt && (
              <p className="mt-1">
                Paid on: {format(new Date(payroll.paidAt), 'MMMM d, yyyy')}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-3xl, .max-w-3xl * {
            visibility: visible;
          }
          .max-w-3xl {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

export default PayslipPage;
