import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { paymentsApi, type PaymentMethod } from '@/lib/api/payments';
import { studentsApi, type Student } from '@/lib/api/students';
import { invoicesApi, type Invoice } from '@/lib/api/invoices';

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

export function PaymentFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedStudentId = searchParams.get('studentId');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentInvoices, setStudentInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ receiptNo: string; paymentId: string } | null>(null);

  const [formData, setFormData] = useState({
    amount: '',
    method: '' as PaymentMethod | '',
    reference: '',
    notes: '',
  });

  useEffect(() => {
    if (preSelectedStudentId) {
      loadStudentById(preSelectedStudentId);
    }
  }, [preSelectedStudentId]);

  const loadStudentById = async (id: string) => {
    try {
      const response = await studentsApi.getStudentById(id);
      if (response.success && response.data) {
        selectStudent(response.data);
      }
    } catch (error) {
      console.error('Failed to load student:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      setSearching(true);
      const response = await studentsApi.getStudents({
        search: searchQuery,
        limit: 10,
      });
      if (response.success && response.data) {
        setSearchResults(response.data.data);
      }
    } catch (error) {
      console.error('Failed to search students:', error);
    } finally {
      setSearching(false);
    }
  };

  const selectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setSearchResults([]);
    setSearchQuery('');

    // Load student's outstanding invoices
    try {
      setLoadingInvoices(true);
      const response = await invoicesApi.getInvoicesByStudent(student.id);
      if (response.success && response.data) {
        // Filter only unpaid invoices
        const unpaidInvoices = response.data.filter(
          (inv) => inv.status !== 'PAID' && inv.status !== 'CANCELLED'
        );
        setStudentInvoices(unpaidInvoices);
      }
    } catch (error) {
      console.error('Failed to load student invoices:', error);
    } finally {
      setLoadingInvoices(false);
    }
  };

  const calculateOutstandingBalance = () => {
    return studentInvoices.reduce((sum, inv) => sum + inv.balance, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedStudent) {
      setError('Please select a student');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!formData.method) {
      setError('Please select a payment method');
      return;
    }

    try {
      setSaving(true);
      const response = await paymentsApi.recordPayment({
        studentId: selectedStudent.id,
        invoiceId: selectedInvoiceId || undefined,
        amount: parseFloat(formData.amount),
        method: formData.method as PaymentMethod,
        reference: formData.reference || undefined,
        notes: formData.notes || undefined,
      });

      if (response.success && response.data) {
        setSuccess({
          receiptNo: response.data.receiptNo,
          paymentId: response.data.id,
        });
      }
    } catch (error: any) {
      console.error('Failed to record payment:', error);
      setError(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Payment Recorded</h1>
            <p className="text-muted-foreground">Payment has been successfully processed</p>
          </div>
        </div>

        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Success!</h2>
            <p className="text-muted-foreground mb-4">
              Receipt Number: <span className="font-mono font-bold">{success.receiptNo}</span>
            </p>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={() => navigate('/admin/finance/payments')}>
                View All Payments
              </Button>
              <Button onClick={() => navigate(`/admin/finance/payments/${success.paymentId}/receipt`)}>
                View Receipt
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Record Payment</h1>
          <p className="text-muted-foreground">Process a new payment for a student</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Student Selection */}
        <Card>
          <CardHeader>
            <CardTitle>1. Select Student</CardTitle>
            <CardDescription>Search for a student by ID or name</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedStudent ? (
              <>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by student ID or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-8"
                    />
                  </div>
                  <Button onClick={handleSearch} disabled={searching}>
                    {searching ? 'Searching...' : 'Search'}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="border rounded-lg divide-y max-h-60 overflow-y-auto">
                    {searchResults.map((student) => (
                      <button
                        key={student.id}
                        className="w-full p-3 text-left hover:bg-muted transition-colors"
                        onClick={() => selectStudent(student)}
                      >
                        <p className="font-medium">
                          {student.user?.firstName}{' '}
                          {student.user?.middleName ? `${student.user.middleName} ` : ''}
                          {student.user?.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {student.studentId} - {student.program?.code}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="p-4 border rounded-lg bg-muted/50">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-lg">
                      {selectedStudent.user?.firstName}{' '}
                      {selectedStudent.user?.middleName
                        ? `${selectedStudent.user.middleName} `
                        : ''}
                      {selectedStudent.user?.lastName}
                    </p>
                    <p className="text-muted-foreground">{selectedStudent.studentId}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedStudent.program?.code} - {selectedStudent.program?.name}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(null)}>
                    Change
                  </Button>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">Outstanding Balance</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(calculateOutstandingBalance())}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Details */}
        <Card>
          <CardHeader>
            <CardTitle>2. Payment Details</CardTitle>
            <CardDescription>Enter payment information</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USD) *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">Payment Method *</Label>
                <Select
                  value={formData.method}
                  onValueChange={(value) =>
                    setFormData({ ...formData, method: value as PaymentMethod })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="MOBILE_MONEY">Mobile Money</SelectItem>
                    <SelectItem value="EVC_PLUS">EVC Plus</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.method && formData.method !== 'CASH' && (
                <div className="space-y-2">
                  <Label htmlFor="reference">Transaction Reference</Label>
                  <Input
                    id="reference"
                    value={formData.reference}
                    onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    placeholder="Enter transaction reference"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any notes..."
                  rows={3}
                />
              </div>

              {error && <p className="text-destructive text-sm">{error}</p>}

              <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving || !selectedStudent}>
                  {saving ? 'Processing...' : 'Record Payment'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Outstanding Invoices */}
        {selectedStudent && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Outstanding Invoices</CardTitle>
              <CardDescription>
                Optionally select an invoice to apply this payment to
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingInvoices ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : studentInvoices.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No outstanding invoices</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentInvoices.map((invoice) => (
                      <TableRow
                        key={invoice.id}
                        className={
                          selectedInvoiceId === invoice.id ? 'bg-muted/50' : 'cursor-pointer'
                        }
                        onClick={() =>
                          setSelectedInvoiceId(
                            selectedInvoiceId === invoice.id ? null : invoice.id
                          )
                        }
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedInvoiceId === invoice.id}
                            onCheckedChange={(checked) =>
                              setSelectedInvoiceId(checked ? invoice.id : null)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm">{invoice.invoiceNo}</TableCell>
                        <TableCell>{invoice.description || '-'}</TableCell>
                        <TableCell className="text-right">{formatCurrency(invoice.amount)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(invoice.totalPaid)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(invoice.balance)}
                        </TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              invoice.status === 'OVERDUE' ? 'destructive' : 'secondary'
                            }
                          >
                            {invoice.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
