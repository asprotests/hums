import { useState, useEffect } from 'react';
import { DollarSign, FileText, Receipt, Calendar, Download, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  studentPortalApi,
  type BalanceInfo,
  type StudentInvoice,
  type StudentPayment,
  type FeeStructure,
} from '@/lib/api/studentPortal';

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

function getStatusBadge(status: string) {
  switch (status) {
    case 'PAID':
      return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
    case 'PARTIAL':
      return <Badge className="bg-blue-100 text-blue-800">Partial</Badge>;
    case 'PENDING':
      return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
    case 'OVERDUE':
      return <Badge variant="destructive">Overdue</Badge>;
    case 'CANCELLED':
      return <Badge variant="outline">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export function StudentFinancePage() {
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [invoices, setInvoices] = useState<StudentInvoice[]>([]);
  const [payments, setPayments] = useState<StudentPayment[]>([]);
  const [feeStructure, setFeeStructure] = useState<FeeStructure | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [balanceRes, invoicesRes, paymentsRes, feesRes] = await Promise.all([
        studentPortalApi.getBalance(),
        studentPortalApi.getInvoices(),
        studentPortalApi.getPayments(),
        studentPortalApi.getFees(),
      ]);

      if (balanceRes.success && balanceRes.data) {
        setBalance(balanceRes.data);
      }
      if (invoicesRes.success && invoicesRes.data) {
        setInvoices(invoicesRes.data);
      }
      if (paymentsRes.success && paymentsRes.data) {
        setPayments(paymentsRes.data);
      }
      if (feesRes.success && feesRes.data) {
        setFeeStructure(feesRes.data);
      }
    } catch (err) {
      console.error('Failed to load finance data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReceipt = async (paymentId: string) => {
    try {
      const response = await studentPortalApi.getReceipt(paymentId);
      if (response.success && response.data) {
        const receipt = response.data;
        let content = `
HORMUUD UNIVERSITY
PAYMENT RECEIPT
=====================================

Receipt No: ${receipt.receiptNo}
Date: ${formatDate(receipt.date)}

Student: ${receipt.student.name}
Student ID: ${receipt.student.studentId}
Program: ${receipt.student.program?.name || 'N/A'}

=====================================
PAYMENT DETAILS
=====================================

Amount Paid: ${formatCurrency(receipt.amount)}
Payment Method: ${receipt.method.replace('_', ' ')}
${receipt.reference ? `Reference: ${receipt.reference}` : ''}
${receipt.invoice ? `Invoice: ${receipt.invoice.invoiceNo}` : ''}

Outstanding Balance: ${formatCurrency(receipt.outstandingBalance)}

=====================================
Thank you for your payment!
`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt_${receipt.receiptNo}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to download receipt:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const overdueInvoices = invoices.filter((i) => i.status === 'OVERDUE');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Finance</h1>
        <p className="text-muted-foreground">Manage your fees and payments</p>
      </div>

      {/* Overdue Warning */}
      {overdueInvoices.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Overdue Payment</AlertTitle>
          <AlertDescription>
            You have {overdueInvoices.length} overdue invoice(s) totaling{' '}
            {formatCurrency(overdueInvoices.reduce((sum, i) => sum + i.balance, 0))}.
            Please make a payment as soon as possible to avoid penalties.
          </AlertDescription>
        </Alert>
      )}

      {/* Balance Summary */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${(balance?.outstandingBalance || 0) > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {formatCurrency(balance?.outstandingBalance || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Amount due</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {formatCurrency(balance?.totalInvoiced || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total charges</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(balance?.totalPaid || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Payments made</p>
          </CardContent>
        </Card>

        {balance?.nextPayment && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Next Due
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(balance.nextPayment.amount)}
              </div>
              <p className="text-xs text-muted-foreground">
                Due {formatDate(balance.nextPayment.dueDate)}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <Tabs defaultValue="invoices">
        <TabsList>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
          <TabsTrigger value="fees">Fee Structure</TabsTrigger>
        </TabsList>

        {/* Invoices */}
        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>All your fee invoices</CardDescription>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No invoices found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono">{invoice.invoiceNo}</TableCell>
                        <TableCell>{invoice.description || '-'}</TableCell>
                        <TableCell>{invoice.semester?.name || '-'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.amount)}</TableCell>
                        <TableCell className="text-right text-green-600">
                          {formatCurrency(invoice.totalPaid)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(invoice.balance)}
                        </TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments */}
        <TabsContent value="payments" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All your payment records</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No payments found</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono">{payment.receiptNo}</TableCell>
                        <TableCell>{formatDate(payment.createdAt)}</TableCell>
                        <TableCell className="text-right font-medium text-green-600">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{payment.method.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell>{payment.reference || '-'}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {payment.invoice?.invoiceNo || '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadReceipt(payment.id)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fee Structure */}
        <TabsContent value="fees" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Fee Structure</CardTitle>
              <CardDescription>
                {feeStructure
                  ? `${feeStructure.program.name} - ${feeStructure.academicYear}`
                  : 'Fee structure for your program'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!feeStructure ? (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No fee structure found for current academic year</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Tuition Fee</p>
                      <p className="text-xl font-bold">{formatCurrency(feeStructure.tuitionFee)}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Registration Fee</p>
                      <p className="text-xl font-bold">{formatCurrency(feeStructure.registrationFee)}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Library Fee</p>
                      <p className="text-xl font-bold">{formatCurrency(feeStructure.libraryFee)}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">Lab Fee</p>
                      <p className="text-xl font-bold">{formatCurrency(feeStructure.labFee)}</p>
                    </div>
                  </div>

                  {feeStructure.otherFees && feeStructure.otherFees.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-sm font-medium mb-2">Other Fees</p>
                      <div className="space-y-2">
                        {feeStructure.otherFees.map((fee, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{fee.name}</span>
                            <span className="font-medium">{formatCurrency(fee.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total Fee</span>
                      <span className="text-2xl font-bold">{formatCurrency(feeStructure.totalFee)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
