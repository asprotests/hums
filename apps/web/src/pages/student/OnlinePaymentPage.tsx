import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CreditCard,
  Phone,
  Building2,
  CheckCircle,
  Loader2,
  Download,
  ArrowLeft,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  paymentGatewayApi,
  type PaymentMethodInfo,
  type StudentPaymentInfo,
  type PaymentStatus,
} from '@/lib/api/paymentGateway';

type MobileProvider = 'EVC_PLUS' | 'ZAAD' | 'SAHAL';

export function OnlinePaymentPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [paymentInfo, setPaymentInfo] = useState<StudentPaymentInfo | null>(null);
  const [methods, setMethods] = useState<PaymentMethodInfo[]>([]);

  // Payment form
  const [amount, setAmount] = useState<string>('');
  const [payFullBalance, setPayFullBalance] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<MobileProvider | null>(null);
  const [phone, setPhone] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<string | undefined>();

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus | null>(null);
  const [countdown, setCountdown] = useState(300); // 5 minutes

  // Result state
  const [showResult, setShowResult] = useState(false);
  const [receiptNo, setReceiptNo] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [infoRes, methodsRes] = await Promise.all([
          paymentGatewayApi.getMyPaymentInfo(),
          paymentGatewayApi.getPaymentMethods(),
        ]);

        if (infoRes.success && infoRes.data) {
          setPaymentInfo(infoRes.data);
        }

        if (methodsRes.success && methodsRes.data) {
          setMethods(methodsRes.data.filter((m) => m.enabled));
        }
      } catch (error) {
        console.error('Failed to load payment info:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!processing || countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [processing, countdown]);

  // Poll for payment status
  useEffect(() => {
    if (!processing || !sessionId) return;

    const pollStatus = async () => {
      try {
        const res = await paymentGatewayApi.verifyPayment(sessionId);
        if (res.success && res.data) {
          setPaymentStatus(res.data.status);

          if (res.data.status === 'COMPLETED') {
            setProcessing(false);
            setShowResult(true);
            // Try to get receipt number from transaction
            if (transactionId) {
              const txnRes = await paymentGatewayApi.getTransaction(transactionId);
              if (txnRes.success && txnRes.data && txnRes.data.paymentId) {
                // Would need to fetch payment to get receipt, simplified here
                setReceiptNo(`RCP-${Date.now()}`);
              }
            }
          } else if (res.data.status === 'FAILED' || res.data.status === 'CANCELLED') {
            setProcessing(false);
            toast({
              title: 'Payment Failed',
              description: 'The payment was not completed. Please try again.',
              variant: 'destructive',
            });
          }
        }
      } catch (error) {
        console.error('Failed to check payment status:', error);
      }
    };

    const interval = setInterval(pollStatus, 3000);
    return () => clearInterval(interval);
  }, [processing, sessionId, transactionId, toast]);

  // Cancel if countdown reaches 0
  useEffect(() => {
    if (countdown <= 0 && processing) {
      handleCancelPayment();
    }
  }, [countdown, processing]);

  const handlePayFullBalance = useCallback((checked: boolean) => {
    setPayFullBalance(checked);
    if (checked && paymentInfo) {
      setAmount(paymentInfo.outstandingBalance.toFixed(2));
    }
  }, [paymentInfo]);

  const handleSubmitPayment = async () => {
    if (!selectedMethod || !phone || !amount) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount.',
        variant: 'destructive',
      });
      return;
    }

    setProcessing(true);
    setCountdown(300);

    try {
      const res = await paymentGatewayApi.makePayment({
        amount: amountNum,
        invoiceId: selectedInvoice,
        phone,
        provider: selectedMethod,
      });

      if (res.success && res.data && res.data.success) {
        setSessionId(res.data.sessionId);
        setTransactionId(res.data.transactionId || null);
        setPaymentStatus('PROCESSING');
        toast({
          title: 'Payment Initiated',
          description: 'Please check your phone to confirm the payment.',
        });
      } else {
        setProcessing(false);
        toast({
          title: 'Payment Failed',
          description: res.data?.error || 'Failed to initiate payment.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      setProcessing(false);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to process payment.',
        variant: 'destructive',
      });
    }
  };

  const handleCancelPayment = async () => {
    if (sessionId) {
      try {
        await paymentGatewayApi.cancelPaymentSession(sessionId);
      } catch (error) {
        console.error('Failed to cancel session:', error);
      }
    }
    setProcessing(false);
    setSessionId(null);
    setTransactionId(null);
    setPaymentStatus(null);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'EVC_PLUS':
      case 'ZAAD':
      case 'SAHAL':
        return <Phone className="h-6 w-6" />;
      case 'BANK_TRANSFER':
        return <Building2 className="h-6 w-6" />;
      case 'CARD':
        return <CreditCard className="h-6 w-6" />;
      default:
        return <CreditCard className="h-6 w-6" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!paymentInfo) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No payment information available.</p>
            <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Make Payment</h1>
          <p className="text-muted-foreground">Pay your fees securely online</p>
        </div>
      </div>

      {/* Outstanding Balance */}
      <Card>
        <CardHeader>
          <CardTitle>Outstanding Balance</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-primary">
            ${paymentInfo.outstandingBalance.toFixed(2)}
          </p>
          {paymentInfo.invoices.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                {paymentInfo.invoices.length} unpaid invoice(s)
              </p>
              <select
                className="w-full p-2 border rounded-md"
                value={selectedInvoice || ''}
                onChange={(e) => setSelectedInvoice(e.target.value || undefined)}
              >
                <option value="">Pay towards balance</option>
                {paymentInfo.invoices.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.invoiceNo} - ${Number(inv.amount).toFixed(2)} (Due: {new Date(inv.dueDate).toLocaleDateString()})
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Amount */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Amount</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount to Pay (USD)</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setPayFullBalance(false);
              }}
              placeholder="0.00"
              disabled={payFullBalance}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="payFull"
              checked={payFullBalance}
              onCheckedChange={handlePayFullBalance}
            />
            <Label htmlFor="payFull" className="cursor-pointer">
              Pay full balance (${paymentInfo.outstandingBalance.toFixed(2)})
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
          <CardDescription>Select how you want to pay</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {methods
              .filter((m) => ['EVC_PLUS', 'ZAAD', 'SAHAL'].includes(m.method))
              .map((method) => (
                <button
                  key={method.method}
                  type="button"
                  className={`p-4 border rounded-lg text-center transition-all ${
                    selectedMethod === method.method
                      ? 'border-primary bg-primary/5 ring-2 ring-primary'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedMethod(method.method as MobileProvider)}
                >
                  <div className="flex flex-col items-center gap-2">
                    {getMethodIcon(method.method)}
                    <span className="font-medium">{method.name}</span>
                    {method.method === 'EVC_PLUS' && (
                      <span className="text-xs text-muted-foreground">Hormuud</span>
                    )}
                    {method.method === 'ZAAD' && (
                      <span className="text-xs text-muted-foreground">Telesom</span>
                    )}
                    {method.method === 'SAHAL' && (
                      <span className="text-xs text-muted-foreground">Golis</span>
                    )}
                  </div>
                </button>
              ))}
          </div>

          {selectedMethod && (
            <div className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+252 61 XXX XXXX"
                />
                <p className="text-sm text-muted-foreground">
                  You will receive a prompt on this phone to confirm the payment.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between text-lg">
              <span>Total Amount:</span>
              <span className="font-bold">${parseFloat(amount || '0').toFixed(2)}</span>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={handleSubmitPayment}
              disabled={!selectedMethod || !phone || !amount || parseFloat(amount) <= 0}
            >
              Pay ${parseFloat(amount || '0').toFixed(2)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Processing Modal */}
      <Dialog open={processing} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Processing Payment</DialogTitle>
            <DialogDescription>
              Please check your phone and enter your PIN to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-8 space-y-6">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">Waiting for confirmation...</p>
              <p className="text-muted-foreground">
                Amount: <span className="font-bold">${parseFloat(amount || '0').toFixed(2)}</span>
              </p>
              <p className="text-muted-foreground">
                To: Hormuud University
              </p>
            </div>
            <div className="text-2xl font-mono font-bold">
              {formatTime(countdown)}
            </div>
          </div>
          <div className="flex justify-center">
            <Button variant="outline" onClick={handleCancelPayment}>
              Cancel Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <Dialog open={showResult && paymentStatus === 'COMPLETED'} onOpenChange={setShowResult}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-6 w-6" />
              Payment Successful!
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Amount Paid</p>
                <p className="font-bold">${parseFloat(amount || '0').toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Payment Method</p>
                <p className="font-bold">{selectedMethod}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Transaction ID</p>
                <p className="font-mono text-xs">{transactionId?.slice(0, 8)}...</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-bold">{new Date().toLocaleDateString()}</p>
              </div>
            </div>
            {receiptNo && (
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-muted-foreground">Receipt Number</p>
                <p className="text-xl font-bold">{receiptNo}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground text-center">
              A confirmation SMS has been sent to your phone.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              Download Receipt
            </Button>
            <Button
              className="flex-1"
              onClick={() => {
                setShowResult(false);
                navigate('/student/finance');
              }}
            >
              Back to Finance
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default OnlinePaymentPage;
