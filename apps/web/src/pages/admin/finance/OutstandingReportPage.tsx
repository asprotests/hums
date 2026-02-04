import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { financeApi, type OutstandingReport } from '@/lib/api/finance';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function OutstandingReportPage() {
  const navigate = useNavigate();
  const [report, setReport] = useState<OutstandingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await financeApi.getOutstandingReport();
      if (response.success && response.data) {
        setReport(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load report:', err);
      setError(err.response?.data?.message || 'Failed to load report');
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Error</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Outstanding Report</h1>
            <p className="text-muted-foreground">View all outstanding and overdue balances</p>
          </div>
        </div>
      </div>

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{report.summary.totalInvoices}</div>
                <p className="text-xs text-muted-foreground">Unpaid invoices</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(report.summary.totalAmount)}</div>
                <p className="text-xs text-muted-foreground">Original amount</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {formatCurrency(report.summary.totalBalance)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(report.summary.totalPaid)} paid
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Overdue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  {formatCurrency(report.summary.overdueAmount)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {report.summary.overdueCount} invoices
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Outstanding Invoices Table */}
          <Card>
            <CardHeader>
              <CardTitle>Outstanding Invoices</CardTitle>
              <CardDescription>
                All invoices with unpaid balances, sorted by due date
              </CardDescription>
            </CardHeader>
            <CardContent>
              {report.invoices.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px]">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.invoices.map((invoice) => (
                      <TableRow key={invoice.invoiceId}>
                        <TableCell className="font-mono text-sm">
                          <Link
                            to={`/admin/finance/invoices/${invoice.invoiceId}`}
                            className="hover:underline text-primary"
                          >
                            {invoice.invoiceNo}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{invoice.studentName}</p>
                            <p className="text-sm text-muted-foreground">{invoice.studentIdNo}</p>
                          </div>
                        </TableCell>
                        <TableCell>{invoice.program || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(invoice.invoiceAmount)}
                        </TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(invoice.totalPaid)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-amber-600">
                          {formatCurrency(invoice.balance)}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{formatDate(invoice.dueDate)}</p>
                            {invoice.daysOverdue > 0 && (
                              <p className="text-xs text-destructive">
                                {invoice.daysOverdue} days overdue
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              invoice.status === 'OVERDUE'
                                ? 'destructive'
                                : invoice.status === 'PARTIAL'
                                ? 'outline'
                                : 'secondary'
                            }
                          >
                            {invoice.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Link to={`/admin/finance/payments/new?studentId=${invoice.studentId}`}>
                            <Button variant="ghost" size="icon">
                              <CreditCard className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No outstanding invoices found
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
