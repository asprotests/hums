import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  FileText,
  Receipt,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { financeApi, type FinanceDashboard } from '@/lib/api/finance';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function getPaymentMethodBadge(method: string) {
  const variants: Record<string, 'default' | 'secondary' | 'outline'> = {
    CASH: 'default',
    BANK_TRANSFER: 'secondary',
    MOBILE_MONEY: 'outline',
    EVC_PLUS: 'outline',
  };
  return (
    <Badge variant={variants[method] || 'default'}>
      {method.replace('_', ' ')}
    </Badge>
  );
}

export function FinanceDashboardPage() {
  const [dashboard, setDashboard] = useState<FinanceDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await financeApi.getDashboard();
      if (response.success && response.data) {
        setDashboard(response.data);
      }
    } catch (error) {
      console.error('Failed to load finance dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finance Dashboard</h1>
          <p className="text-muted-foreground">Overview of financial activities</p>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/finance/payments/new">
            <Button>
              <Receipt className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Collection</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboard?.totalCollectedToday || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.paymentsCountToday || 0} payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboard?.totalCollectedThisMonth || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.paymentsCountThisMonth || 0} payments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(dashboard?.totalOutstanding || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {formatCurrency(dashboard?.totalOverdue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Needs attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/admin/finance/fee-structures">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Fee Structures
              </CardTitle>
              <CardDescription>Manage program fees</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/admin/finance/invoices">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Invoices
              </CardTitle>
              <CardDescription>Generate and manage invoices</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/admin/finance/payments">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Payments
              </CardTitle>
              <CardDescription>View payment history</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/admin/finance/reports">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Reports
              </CardTitle>
              <CardDescription>Collection and outstanding reports</CardDescription>
            </CardHeader>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Payments */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Payments</CardTitle>
              <CardDescription>Latest payment transactions</CardDescription>
            </div>
            <Link to="/admin/finance/payments">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard?.recentPayments && dashboard.recentPayments.length > 0 ? (
                  dashboard.recentPayments.slice(0, 5).map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-sm">{payment.receiptNo}</TableCell>
                      <TableCell>{payment.studentName}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>{getPaymentMethodBadge(payment.method)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No recent payments
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Collection by Method */}
        <Card>
          <CardHeader>
            <CardTitle>Collection by Method</CardTitle>
            <CardDescription>This month's breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboard?.collectionByMethod && dashboard.collectionByMethod.length > 0 ? (
                dashboard.collectionByMethod.map((item) => {
                  const total = dashboard.totalCollectedThisMonth || 1;
                  const percentage = ((item.total / total) * 100).toFixed(1);
                  return (
                    <div key={item.method} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>{item.method.replace('_', ' ')}</span>
                        <span className="font-medium">{formatCurrency(item.total)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-muted-foreground">No collection data</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue by Program */}
      {dashboard?.overdueByProgram && dashboard.overdueByProgram.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Overdue by Program</CardTitle>
            <CardDescription>Programs with outstanding overdue payments</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Program</TableHead>
                  <TableHead className="text-right">Students</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.overdueByProgram.map((item) => (
                  <TableRow key={item.programId}>
                    <TableCell>{item.program}</TableCell>
                    <TableCell className="text-right">{item.count}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      {formatCurrency(item.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
