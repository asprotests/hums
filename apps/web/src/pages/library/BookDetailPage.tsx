import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Trash2,
  BookOpen,
  Plus,
  AlertTriangle,
  MapPin,
  Hash,
  Calendar,
  FileText,
  Tag,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { libraryApi, type BookDetail, type BookCopy } from '@/lib/api/library';
import { useToast } from '@/hooks/use-toast';

const STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  LOW_STOCK: 'bg-yellow-100 text-yellow-800',
  OUT_OF_STOCK: 'bg-red-100 text-red-800',
  DISCONTINUED: 'bg-gray-100 text-gray-800',
};

const COPY_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-800',
  BORROWED: 'bg-blue-100 text-blue-800',
  RESERVED: 'bg-yellow-100 text-yellow-800',
  MAINTENANCE: 'bg-orange-100 text-orange-800',
  LOST: 'bg-red-100 text-red-800',
  RETIRED: 'bg-gray-100 text-gray-800',
};

const CONDITION_COLORS: Record<string, string> = {
  NEW: 'bg-green-100 text-green-800',
  GOOD: 'bg-blue-100 text-blue-800',
  FAIR: 'bg-yellow-100 text-yellow-800',
  POOR: 'bg-orange-100 text-orange-800',
  DAMAGED: 'bg-red-100 text-red-800',
};

export function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [book, setBook] = useState<BookDetail | null>(null);
  const [copies, setCopies] = useState<BookCopy[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addCopiesDialogOpen, setAddCopiesDialogOpen] = useState(false);
  const [addCopiesForm, setAddCopiesForm] = useState({
    quantity: 1,
    condition: 'GOOD',
    acquisitionType: 'PURCHASE',
    notes: '',
  });

  useEffect(() => {
    if (id) {
      loadBook();
    }
  }, [id]);

  const loadBook = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [bookRes, copiesRes] = await Promise.all([
        libraryApi.getBookById(id),
        libraryApi.getBookCopies(id),
      ]);

      if (bookRes.success && bookRes.data) {
        setBook(bookRes.data);
      }
      if (copiesRes.success && copiesRes.data) {
        setCopies(copiesRes.data);
      }
    } catch (err) {
      console.error('Failed to load book:', err);
      toast({
        title: 'Error',
        description: 'Failed to load book details',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      const response = await libraryApi.deleteBook(id);
      if (response.success) {
        toast({ title: 'Success', description: 'Book deleted successfully' });
        navigate('/library/books');
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to delete book',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete book',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleAddCopies = async () => {
    if (!id) return;
    try {
      const response = await libraryApi.addCopies(
        id,
        addCopiesForm.quantity,
        addCopiesForm.condition as any,
        addCopiesForm.acquisitionType as any,
        addCopiesForm.notes || undefined
      );

      if (response.success) {
        toast({
          title: 'Success',
          description: `Added ${addCopiesForm.quantity} copies`,
        });
        loadBook();
        setAddCopiesDialogOpen(false);
        setAddCopiesForm({
          quantity: 1,
          condition: 'GOOD',
          acquisitionType: 'PURCHASE',
          notes: '',
        });
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to add copies',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to add copies',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="text-center py-16">
        <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Book not found</h2>
        <Link to="/library/books">
          <Button variant="outline">Back to Catalog</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{book.title}</h1>
            {book.titleLocal && (
              <p className="text-muted-foreground">{book.titleLocal}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/library/books/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Book Info Card */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <div className="flex gap-6">
              {/* Cover Image */}
              <div className="w-32 h-40 bg-muted rounded flex items-center justify-center flex-shrink-0">
                {book.coverImage ? (
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="w-full h-full object-cover rounded"
                  />
                ) : (
                  <BookOpen className="h-12 w-12 text-muted-foreground" />
                )}
              </div>

              {/* Details */}
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[book.status]}>
                    {book.status.replace('_', ' ')}
                  </Badge>
                  {book.status !== 'AVAILABLE' && (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Author</p>
                    <p className="font-medium flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {book.author}
                    </p>
                    {book.coAuthors && book.coAuthors.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        with {book.coAuthors.join(', ')}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-muted-foreground">ISBN</p>
                    <p className="font-medium flex items-center gap-1">
                      <Hash className="h-4 w-4" />
                      {book.isbn || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Publisher</p>
                    <p className="font-medium">{book.publisher || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Year / Edition</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {book.publishYear || 'N/A'}
                      {book.edition && ` (${book.edition})`}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Category</p>
                    <p className="font-medium">{book.category.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Language</p>
                    <p className="font-medium">{book.language}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Pages</p>
                    <p className="font-medium flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {book.pages || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Location</p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {book.location?.name || 'N/A'}
                      {book.shelfNumber && `, Shelf ${book.shelfNumber}`}
                    </p>
                  </div>
                </div>

                {book.tags && book.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {book.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {book.description && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {book.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Availability Card */}
        <Card>
          <CardHeader>
            <CardTitle>Availability</CardTitle>
            <CardDescription>Current copy status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-4">
              <div
                className={`text-4xl font-bold ${
                  book.availableCopies === 0
                    ? 'text-red-500'
                    : book.availableCopies < 2
                      ? 'text-yellow-500'
                      : 'text-green-500'
                }`}
              >
                {book.availableCopies}
              </div>
              <p className="text-muted-foreground">
                of {book.totalCopies} copies available
              </p>
            </div>
            <div className="space-y-2 mt-4">
              <Button className="w-full" onClick={() => setAddCopiesDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Copies
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="copies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="copies">
            Copies ({copies.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Borrowing History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="copies">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Book Copies</CardTitle>
                <CardDescription>
                  Individual copy details and status
                </CardDescription>
              </div>
              <Button onClick={() => setAddCopiesDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Copies
              </Button>
            </CardHeader>
            <CardContent>
              {copies.length === 0 ? (
                <div className="text-center py-8">
                  <BookOpen className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No copies registered</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Copy #</TableHead>
                      <TableHead>Barcode</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Borrower</TableHead>
                      <TableHead>Acquisition</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {copies.map((copy) => (
                      <TableRow key={copy.id}>
                        <TableCell className="font-medium">
                          {copy.copyNumber}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {copy.barcode}
                        </TableCell>
                        <TableCell>
                          <Badge className={CONDITION_COLORS[copy.condition]}>
                            {copy.condition}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={COPY_STATUS_COLORS[copy.status]}>
                            {copy.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {copy.currentBorrower ? (
                            <span>
                              {copy.currentBorrower.user.firstName}{' '}
                              {copy.currentBorrower.user.lastName}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {copy.acquisitionType}
                            <br />
                            <span className="text-muted-foreground">
                              {new Date(copy.acquisitionDate).toLocaleDateString()}
                            </span>
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Borrowing History</CardTitle>
              <CardDescription>
                Past borrowing records for this book
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Borrowing history will be available in a future update
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Book</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{book.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Copies Dialog */}
      <Dialog open={addCopiesDialogOpen} onOpenChange={setAddCopiesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Copies</DialogTitle>
            <DialogDescription>
              Add new copies of "{book.title}" to the inventory
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                value={addCopiesForm.quantity}
                onChange={(e) =>
                  setAddCopiesForm({ ...addCopiesForm, quantity: parseInt(e.target.value) || 1 })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select
                value={addCopiesForm.condition}
                onValueChange={(v) => setAddCopiesForm({ ...addCopiesForm, condition: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">New</SelectItem>
                  <SelectItem value="GOOD">Good</SelectItem>
                  <SelectItem value="FAIR">Fair</SelectItem>
                  <SelectItem value="POOR">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Acquisition Type</Label>
              <Select
                value={addCopiesForm.acquisitionType}
                onValueChange={(v) => setAddCopiesForm({ ...addCopiesForm, acquisitionType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PURCHASE">Purchase</SelectItem>
                  <SelectItem value="DONATION">Donation</SelectItem>
                  <SelectItem value="TRANSFER">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={addCopiesForm.notes}
                onChange={(e) => setAddCopiesForm({ ...addCopiesForm, notes: e.target.value })}
                placeholder="Any additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddCopiesDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCopies}>
              Add {addCopiesForm.quantity} {addCopiesForm.quantity === 1 ? 'Copy' : 'Copies'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default BookDetailPage;
