import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { paymentsApi, type Receipt } from '@/lib/api/payments';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function PaymentReceiptPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadReceipt();
    }
  }, [id]);

  const loadReceipt = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await paymentsApi.getReceipt(id!);
      if (response.success && response.data) {
        setReceipt(response.data);
      } else {
        setError('Failed to load receipt');
      }
    } catch (err: any) {
      console.error('Failed to load receipt:', err);
      setError(err.response?.data?.message || 'Failed to load receipt');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Receipt Not Found</h1>
            <p className="text-muted-foreground">{error || 'The requested receipt could not be found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Hidden when printing */}
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Payment Receipt</h1>
            <p className="text-muted-foreground">{receipt.receiptNo}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Receipt Card */}
      <Card className="receipt-card max-w-2xl mx-auto">
        <CardContent className="p-8 print:p-5">
          {/* Institution Header */}
          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold print:text-xl">HORMUUD UNIVERSITY</h2>
            <p className="text-muted-foreground text-sm">Mogadishu, Somalia</p>
            <p className="text-xs text-muted-foreground">
              Tel: +252-XXX-XXXX | Email: info@hormuud.edu.so
            </p>
          </div>

          <Separator className="my-3 print:my-2" />

          {/* Receipt Title */}
          <div className="text-center mb-4 print:mb-2">
            <h3 className="text-xl font-semibold print:text-lg">PAYMENT RECEIPT</h3>
          </div>

          {/* Receipt Details */}
          <div className="grid grid-cols-2 gap-4 mb-4 print:mb-2 print:gap-2">
            <div>
              <p className="text-sm text-muted-foreground print:text-xs">Receipt No</p>
              <p className="font-mono font-semibold print:text-sm">{receipt.receiptNo}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground print:text-xs">Date</p>
              <p className="font-semibold print:text-sm">{formatDate(receipt.date)}</p>
            </div>
          </div>

          <Separator className="my-3 print:my-2" />

          {/* Student Information */}
          <div className="mb-4 print:mb-2">
            <h4 className="font-semibold mb-2 print:mb-1 print:text-sm">Student Information</h4>
            <div className="bg-muted/50 p-3 rounded-lg print:p-2">
              <div className="grid grid-cols-2 gap-2 print:gap-1">
                <div>
                  <p className="text-sm text-muted-foreground print:text-xs">Name</p>
                  <p className="font-medium print:text-sm">{receipt.student.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground print:text-xs">Student ID</p>
                  <p className="font-medium print:text-sm">{receipt.student.studentId}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground print:text-xs">Program</p>
                  <p className="font-medium print:text-sm">
                    {receipt.student.program
                      ? `${receipt.student.program.code} - ${receipt.student.program.name}`
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          <div className="mb-4 print:mb-2">
            <h4 className="font-semibold mb-2 print:mb-1 print:text-sm">Payment Details</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <tbody>
                  <tr className="border-b">
                    <td className="p-2 text-muted-foreground print:text-xs print:p-1">Amount Paid</td>
                    <td className="p-2 text-right font-bold text-lg print:text-sm print:p-1">
                      {formatCurrency(receipt.amount)}
                    </td>
                  </tr>
                  <tr className="border-b">
                    <td className="p-2 text-muted-foreground print:text-xs print:p-1">Payment Method</td>
                    <td className="p-2 text-right print:text-sm print:p-1">
                      {receipt.method.replace('_', ' ')}
                    </td>
                  </tr>
                  {receipt.reference && (
                    <tr className="border-b">
                      <td className="p-2 text-muted-foreground print:text-xs print:p-1">Reference</td>
                      <td className="p-2 text-right font-mono print:text-sm print:p-1">{receipt.reference}</td>
                    </tr>
                  )}
                  {receipt.invoice && (
                    <tr className="border-b">
                      <td className="p-2 text-muted-foreground print:text-xs print:p-1">Invoice</td>
                      <td className="p-2 text-right font-mono print:text-sm print:p-1">
                        {receipt.invoice.invoiceNo}
                      </td>
                    </tr>
                  )}
                  {receipt.notes && (
                    <tr className="border-b">
                      <td className="p-2 text-muted-foreground print:text-xs print:p-1">Notes</td>
                      <td className="p-2 text-right print:text-sm print:p-1">{receipt.notes}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="p-2 text-muted-foreground print:text-xs print:p-1">Outstanding Balance</td>
                    <td className="p-2 text-right font-medium text-amber-600 print:text-sm print:p-1">
                      {formatCurrency(receipt.outstandingBalance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <Separator className="my-3 print:my-2" />

          {/* Footer */}
          <div className="text-center text-sm text-muted-foreground print:text-xs">
            <p>Thank you for your payment!</p>
            <p className="mt-1">Generated on {formatDateTime(new Date().toISOString())}</p>
          </div>

          {/* Signature Line - Only visible when printing */}
          <div className="mt-6 pt-4 border-t hidden print:block print:mt-4 print:pt-3">
            <div className="flex justify-between">
              <div className="text-center">
                <div className="border-t border-black w-36 mb-1"></div>
                <p className="text-xs">Student Signature</p>
              </div>
              <div className="text-center">
                <div className="border-t border-black w-36 mb-1"></div>
                <p className="text-xs">Cashier Signature</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }

          html, body {
            width: 210mm;
            height: 297mm;
            margin: 0 !important;
            padding: 0 !important;
          }

          body * {
            visibility: hidden;
          }

          .receipt-card,
          .receipt-card * {
            visibility: visible;
          }

          .receipt-card {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 180mm;
            max-width: 180mm;
            margin: 0 !important;
            box-shadow: none !important;
            border: 2px solid #000 !important;
            border-radius: 4px !important;
            page-break-inside: avoid;
            break-inside: avoid;
            background: white !important;
          }

          .print\\:hidden {
            display: none !important;
          }

          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
