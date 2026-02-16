import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  BookOpen,
  MoreHorizontal,
  RefreshCw,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { libraryApi, type Borrowing, type BorrowingStatus } from '@/lib/api/library';

export function BorrowingsListPage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [borrowings, setBorrowings] = useState<Borrowing[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [statusFilter, setStatusFilter] = useState<BorrowingStatus | 'ALL'>(
    (searchParams.get('status') as BorrowingStatus) || 'ALL'
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');

  const [waiveDialogOpen, setWaiveDialogOpen] = useState(false);
  const [selectedBorrowing, setSelectedBorrowing] = useState<Borrowing | null>(null);
  const [waiveReason, setWaiveReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadBorrowings();
  }, [statusFilter, searchParams]);

  const loadBorrowings = async () => {
    setLoading(true);
    try {
      const page = parseInt(searchParams.get('page') || '1');
      const response = await libraryApi.getBorrowings({
        page,
        limit: 20,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });

      if (response.success && response.data) {
        setBorrowings(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load borrowings:', err);
      toast({
        title: 'Failed to load borrowings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusFilter = (status: BorrowingStatus | 'ALL') => {
    setStatusFilter(status);
    const params = new URLSearchParams(searchParams);
    if (status === 'ALL') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    params.delete('page');
    setSearchParams(params);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(page));
    setSearchParams(params);
  };

  const handleRenew = async (borrowing: Borrowing) => {
    setProcessing(true);
    try {
      const response = await libraryApi.renewBook(borrowing.id);
      if (response.success) {
        toast({
          title: 'Book renewed',
          description: `Due date extended by 14 days`,
        });
        loadBorrowings();
      }
    } catch (err: any) {
      toast({
        title: 'Failed to renew',
        description: err.response?.data?.message || 'Cannot renew this book',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleWaiveFee = async () => {
    if (!selectedBorrowing || !waiveReason) return;

    setProcessing(true);
    try {
      const response = await libraryApi.waiveLateFee(selectedBorrowing.id, waiveReason);
      if (response.success) {
        toast({
          title: 'Late fee waived',
        });
        setWaiveDialogOpen(false);
        setSelectedBorrowing(null);
        setWaiveReason('');
        loadBorrowings();
      }
    } catch (err: any) {
      toast({
        title: 'Failed to waive fee',
        description: err.response?.data?.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handlePayFee = async (borrowing: Borrowing) => {
    setProcessing(true);
    try {
      const response = await libraryApi.payLateFee(borrowing.id);
      if (response.success) {
        toast({
          title: 'Late fee marked as paid',
        });
        loadBorrowings();
      }
    } catch (err: any) {
      toast({
        title: 'Failed to process payment',
        description: err.response?.data?.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: BorrowingStatus) => {
    const variants: Record<BorrowingStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
      ACTIVE: { variant: 'default', className: 'bg-blue-100 text-blue-800 hover:bg-blue-100' },
      RETURNED: { variant: 'secondary' },
      OVERDUE: { variant: 'destructive' },
      LOST: { variant: 'outline', className: 'text-gray-600' },
    };
    const config = variants[status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {status}
      </Badge>
    );
  };

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Borrowings</h1>
          <p className="text-muted-foreground">
            Manage all book borrowings and returns
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/library/issue">
            <Button>Issue Book</Button>
          </Link>
          <Link to="/library/return">
            <Button variant="outline">Return Book</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search by book title or borrower..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => handleStatusFilter(v as BorrowingStatus | 'ALL')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="RETURNED">Returned</SelectItem>
                <SelectItem value="LOST">Lost</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={loadBorrowings}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Borrowings Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : borrowings.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">No borrowings found</h3>
              <p className="text-muted-foreground">
                {statusFilter !== 'ALL'
                  ? `No ${statusFilter.toLowerCase()} borrowings`
                  : 'No borrowing records yet'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Book</TableHead>
                  <TableHead>Borrower</TableHead>
                  <TableHead>Borrowed</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Late Fee</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {borrowings.map((borrowing) => (
                  <TableRow key={borrowing.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{borrowing.bookCopy.book.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {borrowing.bookCopy.barcode}
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
                      {new Date(borrowing.borrowDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          isOverdue(borrowing.dueDate) && borrowing.status !== 'RETURNED'
                            ? 'text-red-600 font-medium'
                            : ''
                        }
                      >
                        {new Date(borrowing.dueDate).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>{getStatusBadge(borrowing.status)}</TableCell>
                    <TableCell>
                      {borrowing.lateFee && borrowing.lateFee > 0 ? (
                        <div className="flex items-center gap-1">
                          <span className="font-medium">
                            ${Number(borrowing.lateFee).toFixed(2)}
                          </span>
                          {borrowing.lateFeeStatus && (
                            <Badge
                              variant={
                                borrowing.lateFeeStatus === 'PAID'
                                  ? 'secondary'
                                  : borrowing.lateFeeStatus === 'WAIVED'
                                  ? 'outline'
                                  : 'destructive'
                              }
                              className="text-xs"
                            >
                              {borrowing.lateFeeStatus}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {borrowing.status === 'ACTIVE' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleRenew(borrowing)}
                                disabled={processing}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Renew
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link to={`/library/return?barcode=${borrowing.bookCopy.barcode}`}>
                                  <BookOpen className="mr-2 h-4 w-4" />
                                  Return
                                </Link>
                              </DropdownMenuItem>
                            </>
                          )}
                          {borrowing.lateFee &&
                            borrowing.lateFee > 0 &&
                            borrowing.lateFeeStatus === 'PENDING' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handlePayFee(borrowing)}
                                  disabled={processing}
                                >
                                  <DollarSign className="mr-2 h-4 w-4" />
                                  Mark as Paid
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedBorrowing(borrowing);
                                    setWaiveDialogOpen(true);
                                  }}
                                >
                                  <AlertTriangle className="mr-2 h-4 w-4" />
                                  Waive Fee
                                </DropdownMenuItem>
                              </>
                            )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} borrowings
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Waive Fee Dialog */}
      <Dialog open={waiveDialogOpen} onOpenChange={setWaiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Waive Late Fee</DialogTitle>
            <DialogDescription>
              Waive the late fee of ${selectedBorrowing?.lateFee?.toFixed(2)} for{' '}
              {selectedBorrowing?.bookCopy.book.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason for waiving</Label>
              <Textarea
                placeholder="Enter the reason for waiving this fee..."
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWaiveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleWaiveFee} disabled={!waiveReason || processing}>
              {processing ? 'Processing...' : 'Waive Fee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BorrowingsListPage;
