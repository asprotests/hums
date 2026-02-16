import { useState } from 'react';
import { BookMinus, Search, AlertCircle, Check, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { libraryApi, type Borrowing, type CopyCondition } from '@/lib/api/library';

interface RecentReturn {
  id: string;
  bookTitle: string;
  borrowerName: string;
  returnTime: Date;
  lateFee: number | null;
}

export function ReturnBookPage() {
  const { toast } = useToast();

  const [barcode, setBarcode] = useState('');
  const [borrowing, setBorrowing] = useState<Borrowing | null>(null);
  const [loading, setLoading] = useState(false);
  const [returning, setReturning] = useState(false);

  const [condition, setCondition] = useState<CopyCondition>('GOOD');
  const [notes, setNotes] = useState('');
  const [waiveFee, setWaiveFee] = useState(false);
  const [waiveReason, setWaiveReason] = useState('');

  const [recentReturns, setRecentReturns] = useState<RecentReturn[]>([]);

  const searchBook = async () => {
    if (!barcode.trim()) return;

    setLoading(true);
    setBorrowing(null);

    try {
      // Get borrowing info by looking up the copy by barcode first
      const copyRes = await libraryApi.getCopyByBarcode(barcode);
      if (copyRes.success && copyRes.data) {
        const copy = copyRes.data;
        if (copy.status === 'BORROWED' && copy.currentBorrower) {
          // For now, we'll search for the active borrowing for this copy
          // In a real scenario, we'd have a direct endpoint to get borrowing by barcode
          const borrowingsData = await libraryApi.getBorrowings({
            status: 'ACTIVE',
            limit: 100,
          });

          if (borrowingsData.success && borrowingsData.data) {
            const found = borrowingsData.data.data.find(
              (b) => b.bookCopy.barcode === barcode
            );
            if (found) {
              setBorrowing(found);
            } else {
              toast({
                title: 'No active borrowing',
                description: 'This book is not currently borrowed',
                variant: 'destructive',
              });
            }
          }
        } else {
          toast({
            title: 'Book not borrowed',
            description: `This book is ${copy.status.toLowerCase()}, not borrowed`,
            variant: 'destructive',
          });
        }
      }
    } catch {
      toast({
        title: 'Book not found',
        description: 'No book copy found with that barcode',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReturn = async () => {
    if (!borrowing) return;

    setReturning(true);

    try {
      const response = await libraryApi.returnBook(borrowing.id, {
        condition,
        notes: notes || undefined,
        waiveFee,
        waiveReason: waiveFee ? waiveReason : undefined,
      });

      if (response.success) {
        toast({
          title: 'Book returned successfully',
          description: `${borrowing.bookCopy.book.title} has been returned`,
        });

        // Add to recent returns
        setRecentReturns((prev) => [
          {
            id: borrowing.id,
            bookTitle: borrowing.bookCopy.book.title,
            borrowerName: `${borrowing.borrower.firstName} ${borrowing.borrower.lastName}`,
            returnTime: new Date(),
            lateFee: waiveFee ? null : borrowing.lateFee,
          },
          ...prev.slice(0, 9),
        ]);

        // Reset form
        setBorrowing(null);
        setBarcode('');
        setCondition('GOOD');
        setNotes('');
        setWaiveFee(false);
        setWaiveReason('');
      }
    } catch (err: any) {
      toast({
        title: 'Failed to return book',
        description: err.response?.data?.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setReturning(false);
    }
  };

  const isOverdue = borrowing && new Date(borrowing.dueDate) < new Date();
  const daysOverdue = borrowing
    ? Math.ceil(
        (new Date().getTime() - new Date(borrowing.dueDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Return Book</h1>
        <p className="text-muted-foreground">
          Process book returns by scanning barcode
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Return Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Scan Barcode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Scan or enter barcode..."
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchBook()}
                  autoFocus
                />
                <Button onClick={searchBook} disabled={loading}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {borrowing && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookMinus className="h-5 w-5" />
                    Book Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <BookMinus className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-lg">{borrowing.bookCopy.book.title}</p>
                      <p className="text-muted-foreground">{borrowing.bookCopy.book.author}</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Barcode: {borrowing.bookCopy.barcode}
                      </p>
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Borrowed by:</span>
                      <span className="font-medium">
                        {borrowing.borrower.firstName} {borrowing.borrower.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Borrowed:</span>
                      <span>
                        {new Date(borrowing.borrowDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Due:</span>
                      <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                        {new Date(borrowing.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge variant={isOverdue ? 'destructive' : 'default'}>
                        {isOverdue ? `OVERDUE (${daysOverdue} days)` : borrowing.status}
                      </Badge>
                    </div>
                  </div>

                  {isOverdue && borrowing.lateFee && borrowing.lateFee > 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="flex items-center justify-between">
                        <span>Late fee: ${Number(borrowing.lateFee).toFixed(2)}</span>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Return Options</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Book Condition</Label>
                    <Select value={condition} onValueChange={(v) => setCondition(v as CopyCondition)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW">New</SelectItem>
                        <SelectItem value="GOOD">Good</SelectItem>
                        <SelectItem value="FAIR">Fair</SelectItem>
                        <SelectItem value="POOR">Poor</SelectItem>
                        <SelectItem value="DAMAGED">Damaged</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Notes (optional)</Label>
                    <Textarea
                      placeholder="Any notes about the return..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>

                  {isOverdue && borrowing.lateFee && borrowing.lateFee > 0 && (
                    <div className="space-y-3 border-t pt-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="waive"
                          checked={waiveFee}
                          onCheckedChange={(checked) => setWaiveFee(checked as boolean)}
                        />
                        <Label htmlFor="waive" className="cursor-pointer">
                          Waive late fee (${Number(borrowing.lateFee).toFixed(2)})
                        </Label>
                      </div>

                      {waiveFee && (
                        <div className="space-y-2">
                          <Label>Reason for waiving</Label>
                          <Textarea
                            placeholder="Enter reason for waiving the fee..."
                            value={waiveReason}
                            onChange={(e) => setWaiveReason(e.target.value)}
                            required
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 justify-end pt-4">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setBorrowing(null);
                        setBarcode('');
                        setCondition('GOOD');
                        setNotes('');
                        setWaiveFee(false);
                        setWaiveReason('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleReturn}
                      disabled={returning || (waiveFee && !waiveReason)}
                    >
                      <BookMinus className="mr-2 h-4 w-4" />
                      {returning ? 'Processing...' : 'Process Return'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Recent Returns */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recently Returned
            </CardTitle>
            <CardDescription>
              Books returned during this session
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentReturns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No returns processed yet
              </p>
            ) : (
              <div className="space-y-3">
                {recentReturns.map((ret) => (
                  <div
                    key={ret.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{ret.bookTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {ret.borrowerName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {ret.returnTime.toLocaleTimeString()}
                      </p>
                    </div>
                    {ret.lateFee && ret.lateFee > 0 ? (
                      <Badge variant="outline" className="text-amber-600">
                        +${Number(ret.lateFee).toFixed(2)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        On time
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ReturnBookPage;
