import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, X, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  libraryApi,
  type BookCategory,
  type LibraryLocation,
  type CreateBookInput,
  type UpdateBookInput,
} from '@/lib/api/library';
import { useToast } from '@/hooks/use-toast';

const LANGUAGES = [
  'English',
  'Somali',
  'Arabic',
  'Swahili',
  'French',
  'Italian',
  'Other',
];

export function BookFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isEdit = Boolean(id);

  const [categories, setCategories] = useState<BookCategory[]>([]);
  const [locations, setLocations] = useState<LibraryLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [coAuthorInput, setCoAuthorInput] = useState('');

  const [form, setForm] = useState<CreateBookInput>({
    isbn: '',
    title: '',
    titleLocal: '',
    author: '',
    coAuthors: [],
    publisher: '',
    publishYear: undefined,
    edition: '',
    language: 'English',
    pages: undefined,
    categoryId: '',
    locationId: '',
    shelfNumber: '',
    coverImage: '',
    description: '',
    tags: [],
    totalCopies: 1,
  });

  useEffect(() => {
    loadFilters();
    if (isEdit && id) {
      loadBook(id);
    }
  }, [id]);

  const loadFilters = async () => {
    try {
      const [catRes, locRes] = await Promise.all([
        libraryApi.getCategories(),
        libraryApi.getLocations(),
      ]);
      if (catRes.success && catRes.data) setCategories(catRes.data);
      if (locRes.success && locRes.data) setLocations(locRes.data);
    } catch (err) {
      console.error('Failed to load filters:', err);
    }
  };

  const loadBook = async (bookId: string) => {
    try {
      setLoading(true);
      const response = await libraryApi.getBookById(bookId);
      if (response.success && response.data) {
        const book = response.data;
        setForm({
          isbn: book.isbn || '',
          title: book.title,
          titleLocal: book.titleLocal || '',
          author: book.author,
          coAuthors: book.coAuthors || [],
          publisher: book.publisher || '',
          publishYear: book.publishYear || undefined,
          edition: book.edition || '',
          language: book.language,
          pages: book.pages || undefined,
          categoryId: book.categoryId,
          locationId: book.locationId || '',
          shelfNumber: book.shelfNumber || '',
          coverImage: book.coverImage || '',
          description: book.description || '',
          tags: book.tags || [],
          totalCopies: book.totalCopies,
        });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title || !form.author || !form.categoryId) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        isbn: form.isbn || undefined,
        titleLocal: form.titleLocal || undefined,
        publisher: form.publisher || undefined,
        publishYear: form.publishYear || undefined,
        edition: form.edition || undefined,
        pages: form.pages || undefined,
        locationId: form.locationId || undefined,
        shelfNumber: form.shelfNumber || undefined,
        coverImage: form.coverImage || undefined,
        description: form.description || undefined,
      };

      let response;
      if (isEdit && id) {
        const updatePayload: UpdateBookInput = { ...payload };
        delete (updatePayload as any).totalCopies;
        response = await libraryApi.updateBook(id, updatePayload);
      } else {
        response = await libraryApi.createBook(payload);
      }

      if (response.success) {
        toast({
          title: 'Success',
          description: isEdit ? 'Book updated successfully' : 'Book created successfully',
        });
        navigate(`/library/books/${response.data?.id || id}`);
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to save book',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Failed to save book:', err);
      toast({
        title: 'Error',
        description: 'Failed to save book',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags?.includes(tagInput.trim())) {
      setForm({ ...form, tags: [...(form.tags || []), tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setForm({ ...form, tags: form.tags?.filter((t) => t !== tag) });
  };

  const addCoAuthor = () => {
    if (coAuthorInput.trim() && !form.coAuthors?.includes(coAuthorInput.trim())) {
      setForm({ ...form, coAuthors: [...(form.coAuthors || []), coAuthorInput.trim()] });
      setCoAuthorInput('');
    }
  };

  const removeCoAuthor = (author: string) => {
    setForm({ ...form, coAuthors: form.coAuthors?.filter((a) => a !== author) });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEdit ? 'Edit Book' : 'Add New Book'}
          </h1>
          <p className="text-muted-foreground">
            {isEdit ? 'Update book details' : 'Add a new book to the catalog'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Enter the book details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="isbn">ISBN</Label>
                <Input
                  id="isbn"
                  placeholder="978-0-123456-78-9"
                  value={form.isbn}
                  onChange={(e) => setForm({ ...form, isbn: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title (English) *</Label>
                <Input
                  id="title"
                  placeholder="Book title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="titleLocal">Title (Somali)</Label>
                <Input
                  id="titleLocal"
                  placeholder="Somali title"
                  value={form.titleLocal}
                  onChange={(e) => setForm({ ...form, titleLocal: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="author">Author *</Label>
                <Input
                  id="author"
                  placeholder="Primary author name"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Co-Authors</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add co-author"
                    value={coAuthorInput}
                    onChange={(e) => setCoAuthorInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCoAuthor())}
                  />
                  <Button type="button" variant="outline" onClick={addCoAuthor}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {form.coAuthors && form.coAuthors.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.coAuthors.map((author) => (
                      <Badge key={author} variant="secondary" className="gap-1">
                        {author}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeCoAuthor(author)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="publisher">Publisher</Label>
                  <Input
                    id="publisher"
                    placeholder="Publisher name"
                    value={form.publisher}
                    onChange={(e) => setForm({ ...form, publisher: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="publishYear">Year</Label>
                  <Input
                    id="publishYear"
                    type="number"
                    placeholder="2024"
                    value={form.publishYear || ''}
                    onChange={(e) =>
                      setForm({ ...form, publishYear: parseInt(e.target.value) || undefined })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edition">Edition</Label>
                  <Input
                    id="edition"
                    placeholder="3rd"
                    value={form.edition}
                    onChange={(e) => setForm({ ...form, edition: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pages">Pages</Label>
                  <Input
                    id="pages"
                    type="number"
                    placeholder="500"
                    value={form.pages || ''}
                    onChange={(e) =>
                      setForm({ ...form, pages: parseInt(e.target.value) || undefined })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Language</Label>
                <Select
                  value={form.language}
                  onValueChange={(v) => setForm({ ...form, language: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((lang) => (
                      <SelectItem key={lang} value={lang}>
                        {lang}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Location & Category */}
          <Card>
            <CardHeader>
              <CardTitle>Classification & Location</CardTitle>
              <CardDescription>Organize and locate the book</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Category *</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(v) => setForm({ ...form, categoryId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationId">Location</Label>
                <Select
                  value={form.locationId || 'NONE'}
                  onValueChange={(v) => setForm({ ...form, locationId: v === 'NONE' ? '' : v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No location</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="shelfNumber">Shelf Number</Label>
                <Input
                  id="shelfNumber"
                  placeholder="A1"
                  value={form.shelfNumber}
                  onChange={(e) => setForm({ ...form, shelfNumber: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {form.tags && form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {form.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="gap-1">
                        {tag}
                        <X
                          className="h-3 w-3 cursor-pointer"
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverImage">Cover Image URL</Label>
                <Input
                  id="coverImage"
                  placeholder="https://example.com/cover.jpg"
                  value={form.coverImage}
                  onChange={(e) => setForm({ ...form, coverImage: e.target.value })}
                />
              </div>

              {!isEdit && (
                <div className="space-y-2">
                  <Label htmlFor="totalCopies">Initial Copies</Label>
                  <Input
                    id="totalCopies"
                    type="number"
                    min={1}
                    value={form.totalCopies}
                    onChange={(e) =>
                      setForm({ ...form, totalCopies: parseInt(e.target.value) || 1 })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of copies to add initially
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Book description..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={5}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            {isEdit ? 'Update Book' : 'Create Book'}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default BookFormPage;
