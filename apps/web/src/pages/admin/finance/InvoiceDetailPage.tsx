import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, FileX, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { invoicesApi, type Invoice, type InvoiceStatus } from '@/lib/api/invoices';

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

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadge(status: InvoiceStatus) {
  const variants: Record<InvoiceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    PENDING: 'secondary',
    PARTIAL: 'outline',
    PAID: 'default',
    OVERDUE: 'destructive',
    CANCELLED: 'outline',
  };
  return <Badge variant={variants[status]}>{status}</Badge>;
}

export function InvoiceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState('');

  useEffect(() => {
    if (id) {
      loadInvoice();
    }
  }, [id]);

  const loadInvoice = async () => {
    try {
      setLoading(true);
      const response = await invoicesApi.getInvoiceById(id!);
      if (response.success && response.data) {
        setInvoice(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load invoice:', err);
      setError(err.response?.data?.message || 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  };

  const handleVoid = async () => {
    if (!id || !voidReason.trim()) return;
    try {
      await invoicesApi.voidInvoice(id, { reason: voidReason });
      loadInvoice();
    } catch (err) {
      console.error('Failed to void invoice:', err);
    } finally {
      setShowVoidDialog(false);
      setVoidReason('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Invoice Not Found</h1>
            <p className="text-muted-foreground">{error || 'The requested invoice could not be found'}</p>
          </div>
        </div>
      </div>
    );
  }

  const studentName = invoice.student?.user
    ? `${invoice.student.user.firstName} ${invoice.student.user.middleName ? invoice.student.user.middleName + ' ' : ''}${invoice.student.user.lastName}`
    : 'Unknown';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Invoice {invoice.invoiceNo}</h1>
            <p className="text-muted-foreground">View invoice details</p>
          </div>
        </div>
        <div className="flex gap-2">
          {invoice.status !== 'CANCELLED' && invoice.status !== 'PAID' && (
            <>
              <Link to={`/admin/finance/payments/new?studentId=${invoice.studentId}`}>
                <Button>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
              </Link>
              <Button variant="outline" onClick={() => setShowVoidDialog(true)}>
                <FileX className="mr-2 h-4 w-4" />
                Void Invoice
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Invoice Info */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Invoice Number</p>
                <p className="font-mono font-semibold">{invoice.invoiceNo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">{getStatusBadge(invoice.status)}</div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-medium">{formatDate(invoice.dueDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="font-medium">{formatDateTime(invoice.createdAt)}</p>
              </div>
            </div>
            {invoice.description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p>{invoice.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Student Info */}
        <Card>
          <CardHeader>
            <CardTitle>Student Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{studentName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Student ID</p>
                <p className="font-medium">{invoice.student?.studentId}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{invoice.student?.user?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Program</p>
                <p className="font-medium">
                  {invoice.student?.program
                    ? `${invoice.student.program.code} - ${invoice.student.program.name}`
                    : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Amount</span>
                <span className="font-medium">{formatCurrency(invoice.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Paid</span>
                <span className="font-medium text-green-600">{formatCurrency(invoice.totalPaid)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Balance Due</span>
                <span className="font-bold text-amber-600">{formatCurrency(invoice.balance)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fee Breakdown */}
        {invoice.breakdown && (
          <Card>
            <CardHeader>
              <CardTitle>Fee Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tuition Fee</span>
                  <span>{formatCurrency(invoice.breakdown.tuitionFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Registration Fee</span>
                  <span>{formatCurrency(invoice.breakdown.registrationFee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Library Fee</span>
                  <span>{formatCurrency(invoice.breakdown.libraryFee)}</span>
                </div>
                {invoice.breakdown.labFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Lab Fee</span>
                    <span>{formatCurrency(invoice.breakdown.labFee)}</span>
                  </div>
                )}
                {invoice.breakdown.otherFees?.map((fee, index) => (
                  <div key={index} className="flex justify-between">
                    <span className="text-muted-foreground">{fee.name}</span>
                    <span>{formatCurrency(fee.amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Payment History */}
      {invoice.payments && invoice.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Payments made towards this invoice</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-mono">{payment.receiptNo}</TableCell>
                    <TableCell>{formatDateTime(payment.createdAt)}</TableCell>
                    <TableCell>{payment.method}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(payment.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Void Dialog */}
      <AlertDialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will cancel this invoice. Please provide a reason.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="voidReason">Reason *</Label>
            <Textarea
              id="voidReason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              placeholder="Enter reason for voiding this invoice..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setVoidReason('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleVoid} disabled={!voidReason.trim()}>
              Void Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
