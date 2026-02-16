import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookCheck, Search, User, Barcode, AlertCircle, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { libraryApi, type BookCopy, type CanBorrowResult } from '@/lib/api/library';
import api from '@/lib/api';

interface MemberInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  studentId?: string;
  employeeId?: string;
  type: 'STUDENT' | 'EMPLOYEE';
}

interface BookCopyWithBook extends BookCopy {
  book?: {
    id: string;
    title: string;
    author: string;
    isbn?: string;
  };
}

export function IssueBookPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [memberSearch, setMemberSearch] = useState('');
  const [member, setMember] = useState<MemberInfo | null>(null);
  const [canBorrow, setCanBorrow] = useState<CanBorrowResult | null>(null);
  const [memberLoading, setMemberLoading] = useState(false);

  const [barcode, setBarcode] = useState('');
  const [bookCopy, setBookCopy] = useState<BookCopyWithBook | null>(null);
  const [bookLoading, setBookLoading] = useState(false);

  const [issuing, setIssuing] = useState(false);

  const searchMember = async () => {
    if (!memberSearch.trim()) return;

    setMemberLoading(true);
    setMember(null);
    setCanBorrow(null);

    try {
      // Try to find student or employee
      const response = await api.get(`/api/v1/users/search?q=${encodeURIComponent(memberSearch)}`);
      if (response.data.success && response.data.data.length > 0) {
        const user = response.data.data[0];

        // Determine member type based on user data
        const memberType = user.student ? 'STUDENT' : 'EMPLOYEE';

        setMember({
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          studentId: user.student?.studentId,
          employeeId: user.employee?.employeeId,
          type: memberType,
        });

        // Check if they can borrow
        const canBorrowRes = await libraryApi.canBorrow(user.id, memberType);
        if (canBorrowRes.success && canBorrowRes.data) {
          setCanBorrow(canBorrowRes.data);
        }
      } else {
        toast({
          title: 'Member not found',
          description: 'No member found with that ID or name',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Search failed',
        description: 'Could not search for member',
        variant: 'destructive',
      });
    } finally {
      setMemberLoading(false);
    }
  };

  const searchBook = async () => {
    if (!barcode.trim()) return;

    setBookLoading(true);
    setBookCopy(null);

    try {
      const response = await libraryApi.getCopyByBarcode(barcode);
      if (response.success && response.data) {
        setBookCopy(response.data as BookCopyWithBook);
      }
    } catch {
      toast({
        title: 'Book not found',
        description: 'No book copy found with that barcode',
        variant: 'destructive',
      });
    } finally {
      setBookLoading(false);
    }
  };

  const handleIssue = async () => {
    if (!member || !bookCopy) return;

    setIssuing(true);

    try {
      const response = await libraryApi.issueBook({
        bookCopyId: bookCopy.id,
        borrowerId: member.id,
        borrowerType: member.type,
      });

      if (response.success) {
        toast({
          title: 'Book issued successfully',
          description: `${bookCopy.book?.title} has been issued to ${member.firstName} ${member.lastName}`,
        });

        // Reset form for next issue
        setMember(null);
        setBookCopy(null);
        setMemberSearch('');
        setBarcode('');
        setCanBorrow(null);
      }
    } catch (err: any) {
      toast({
        title: 'Failed to issue book',
        description: err.response?.data?.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setIssuing(false);
    }
  };

  const canIssue = member && bookCopy && canBorrow?.canBorrow && bookCopy.status === 'AVAILABLE';

  // Calculate due date (14 days from now)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 14);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Issue Book</h1>
          <p className="text-muted-foreground">
            Issue a book to a library member
          </p>
        </div>
        <Button variant="outline" onClick={() => navigate('/library/borrowings')}>
          View All Borrowings
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Member Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Member
            </CardTitle>
            <CardDescription>
              Search by student ID, employee ID, or name
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter student/employee ID or name..."
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchMember()}
              />
              <Button onClick={searchMember} disabled={memberLoading}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {member && (
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {member.studentId || member.employeeId}
                      </p>
                    </div>
                  </div>
                  <Badge>{member.type}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{member.email}</p>

                {canBorrow && (
                  <Alert variant={canBorrow.canBorrow ? 'default' : 'destructive'} className="mt-3">
                    {canBorrow.canBorrow ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>
                      {canBorrow.canBorrow
                        ? 'Member can borrow books'
                        : canBorrow.reason || 'Cannot borrow books'}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Book Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Barcode className="h-5 w-5" />
              Book
            </CardTitle>
            <CardDescription>
              Scan or enter book barcode
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Scan barcode..."
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && searchBook()}
              />
              <Button onClick={searchBook} disabled={bookLoading}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            {bookCopy && (
              <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-10 rounded bg-muted flex items-center justify-center">
                    <BookCheck className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{bookCopy.book?.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {bookCopy.book?.author}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Copy #:</span>{' '}
                    {bookCopy.copyNumber}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Barcode:</span>{' '}
                    {bookCopy.barcode}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Condition:</span>{' '}
                    {bookCopy.condition}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>{' '}
                    <Badge
                      variant={bookCopy.status === 'AVAILABLE' ? 'default' : 'secondary'}
                      className={bookCopy.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' : ''}
                    >
                      {bookCopy.status}
                    </Badge>
                  </div>
                </div>

                {bookCopy.status !== 'AVAILABLE' && (
                  <Alert variant="destructive" className="mt-3">
                    <X className="h-4 w-4" />
                    <AlertDescription>
                      This copy is not available for borrowing
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Issue Summary */}
      {(member || bookCopy) && (
        <Card>
          <CardHeader>
            <CardTitle>Issue Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">Loan Period</Label>
                <p className="font-medium">14 days</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Due Date</Label>
                <p className="font-medium">
                  {dueDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setMember(null);
                  setBookCopy(null);
                  setMemberSearch('');
                  setBarcode('');
                  setCanBorrow(null);
                }}
              >
                Clear
              </Button>
              <Button onClick={handleIssue} disabled={!canIssue || issuing}>
                <BookCheck className="mr-2 h-4 w-4" />
                {issuing ? 'Issuing...' : 'Issue Book'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default IssueBookPage;
