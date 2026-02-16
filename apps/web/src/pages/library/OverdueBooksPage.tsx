import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Mail, RefreshCw, DollarSign, BookOpen } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { libraryApi, type Borrowing } from '@/lib/api/library';

export function OverdueBooksPage() {
  const { toast } = useToast();
  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalFees, setTotalFees] = useState(0);

  useEffect(() => {
    loadOverdueBooks();
  }, []);

  const loadOverdueBooks = async () => {
    setLoading(true);
    try {
      const response = await libraryApi.getOverdueBorrowings();
      if (response.success && response.data) {
        setBorrowings(response.data);

        // Calculate total outstanding fees
        const fees = response.data.reduce((sum, b) => {
          if (b.lateFeeStatus === 'PENDING') {
            return sum + (Number(b.lateFee) || 0);
          }
          return sum;
        }, 0);
        setTotalFees(fees);
      }
    } catch (err) {
      console.error('Failed to load overdue books:', err);
      toast({
        title: 'Failed to load overdue books',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    return Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getSeverity = (daysOverdue: number) => {
    if (daysOverdue > 14) return 'destructive';
    if (daysOverdue > 7) return 'default';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            Overdue Books
          </h1>
          <p className="text-muted-foreground">
            Books that have passed their due date
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadOverdueBooks}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline">
            <Mail className="h-4 w-4 mr-2" />
            Send Reminders
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{borrowings.length}</div>
            <p className="text-xs text-muted-foreground">books past due date</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding Fees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              ${totalFees.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">pending collection</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Critical ({'>'}14 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-800">
              {borrowings.filter((b) => getDaysOverdue(b.dueDate) > 14).length}
            </div>
            <p className="text-xs text-muted-foreground">severely overdue</p>
          </CardContent>
        </Card>
      </div>

      {/* Overdue List */}
      <Card>
        <CardHeader>
          <CardTitle>Overdue Borrowings</CardTitle>
          <CardDescription>
            Sorted by most overdue first
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : borrowings.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="mx-auto h-12 w-12 text-green-500" />
              <h3 className="mt-4 text-lg font-semibold">No overdue books</h3>
              <p className="text-muted-foreground">
                All borrowed books are within their due date
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Days Overdue</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {borrowings
                  .sort((a, b) => getDaysOverdue(b.dueDate) - getDaysOverdue(a.dueDate))
                  .map((borrowing) => {
                    const daysOverdue = getDaysOverdue(borrowing.dueDate);
                    return (
                      <TableRow key={borrowing.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{borrowing.bookCopy.book.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {borrowing.bookCopy.book.author}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {borrowing.borrower.firstName} {borrowing.borrower.lastName}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {borrowing.borrowerType}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{borrowing.borrower.email}</p>
                        </TableCell>
                        <TableCell>
                          <span className="text-red-600">
                            {new Date(borrowing.dueDate).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSeverity(daysOverdue) as any}>
                            {daysOverdue} days
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {borrowing.lateFee && borrowing.lateFee > 0 ? (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-amber-600" />
                              <span className="font-medium">
                                {Number(borrowing.lateFee).toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Link to={`/library/return?barcode=${borrowing.bookCopy.barcode}`}>
                            <Button size="sm" variant="outline">
                              Return
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default OverdueBooksPage;
