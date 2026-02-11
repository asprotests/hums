import { useState, useEffect } from 'react';
import { DollarSign, Eye, Calendar, Printer, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { employeePortalApi, type EmployeeProfile } from '@/lib/api/employeePortal';
import type { Payroll } from '@/lib/api/payroll';
import { format } from 'date-fns';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function MyPayslipsPage() {
  const [payslips, setPayslips] = useState<Payroll[]>([]);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedPayslip, setSelectedPayslip] = useState<Payroll | null>(null);

  useEffect(() => {
    loadData();
  }, [year]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [payslipsRes, profileRes] = await Promise.all([
        employeePortalApi.getPayslips(year),
        employeePortalApi.getProfile(),
      ]);

      if (payslipsRes.success && payslipsRes.data) {
        setPayslips(payslipsRes.data);
      }
      if (profileRes.success && profileRes.data) {
        setProfile(profileRes.data);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i);

  const totalEarnings = payslips.reduce((sum, p) => sum + Number(p.netSalary), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Payslips</h1>
          <p className="text-muted-foreground">View your salary history and download payslips</p>
        </div>
        <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
          <SelectTrigger className="w-28">
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

      {/* Summary Card */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Payslips</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payslips.length}</div>
            <p className="text-xs text-muted-foreground">for {year}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalEarnings.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">for {year}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Monthly</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${payslips.length > 0 ? (totalEarnings / payslips.length).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">net salary</p>
          </CardContent>
        </Card>
      </div>

      {/* Payslips List */}
      <Card>
        <CardHeader>
          <CardTitle>Payslips ({year})</CardTitle>
          <CardDescription>Click on a payslip to view details</CardDescription>
        </CardHeader>
        <CardContent>
          {payslips.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No payslips available for {year}
            </p>
          ) : (
            <div className="space-y-3">
              {payslips.map((payslip) => (
                <div
                  key={payslip.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => setSelectedPayslip(payslip)}
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 rounded-lg p-3">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {MONTHS[payslip.month - 1]} {payslip.year}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Paid on {payslip.paidAt ? format(new Date(payslip.paidAt), 'MMM d, yyyy') : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-lg">
                        ${Number(payslip.netSalary).toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">Net Salary</p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payslip Detail Dialog */}
      <Dialog open={!!selectedPayslip} onOpenChange={() => setSelectedPayslip(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                Payslip - {selectedPayslip && MONTHS[selectedPayslip.month - 1]}{' '}
                {selectedPayslip?.year}
              </span>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedPayslip && profile && (
            <div className="space-y-6" id="payslip-content">
              {/* Company Header */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Building2 className="h-6 w-6" />
                  <h2 className="text-xl font-bold">HORMUUD UNIVERSITY</h2>
                </div>
                <p className="text-sm text-muted-foreground">Mogadishu, Somalia</p>
              </div>

              <Separator />

              {/* Employee Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Employee</span>
                  <p className="font-medium">
                    {profile.user.firstName} {profile.user.lastName}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Employee ID</span>
                  <p className="font-medium">{profile.employeeId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Department</span>
                  <p className="font-medium">{profile.department?.name || 'N/A'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Position</span>
                  <p className="font-medium">{profile.position}</p>
                </div>
              </div>

              <Separator />

              {/* Earnings and Deductions */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 text-green-700">EARNINGS</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Basic Salary</span>
                      <span className="font-mono">
                        ${Number(selectedPayslip.baseSalary).toFixed(2)}
                      </span>
                    </div>
                    {selectedPayslip.items
                      .filter((i) => i.type === 'ALLOWANCE')
                      .map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span>
                            {item.name}
                            {item.calculationType === 'PERCENTAGE' && ` (${item.value}%)`}
                          </span>
                          <span className="font-mono">
                            ${Number(item.amount).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Gross Salary</span>
                      <span className="font-mono">
                        ${Number(selectedPayslip.grossSalary).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 text-red-700">DEDUCTIONS</h4>
                  <div className="space-y-2 text-sm">
                    {selectedPayslip.items.filter((i) => i.type === 'DEDUCTION').length === 0 ? (
                      <p className="text-muted-foreground">No deductions</p>
                    ) : (
                      selectedPayslip.items
                        .filter((i) => i.type === 'DEDUCTION')
                        .map((item) => (
                          <div key={item.id} className="flex justify-between">
                            <span>
                              {item.name}
                              {item.calculationType === 'PERCENTAGE' && ` (${item.value}%)`}
                            </span>
                            <span className="font-mono">
                              ${Number(item.amount).toFixed(2)}
                            </span>
                          </div>
                        ))
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total Deductions</span>
                      <span className="font-mono">
                        ${Number(selectedPayslip.totalDeductions).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Net Salary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-green-800">NET SALARY</span>
                  <span className="text-2xl font-bold text-green-700 font-mono">
                    ${Number(selectedPayslip.netSalary).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Payment Info */}
              <div className="text-sm text-muted-foreground text-center">
                <p>
                  Payment Method:{' '}
                  {profile.bankAccount
                    ? `Bank Transfer (${profile.bankName})`
                    : profile.mobileWallet
                    ? 'Mobile Wallet'
                    : 'Cash'}
                </p>
                {selectedPayslip.paidAt && (
                  <p>Paid on: {format(new Date(selectedPayslip.paidAt), 'MMMM d, yyyy')}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #payslip-content, #payslip-content * {
            visibility: visible;
          }
          #payslip-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }
        }
      `}</style>
    </div>
  );
}

export default MyPayslipsPage;
