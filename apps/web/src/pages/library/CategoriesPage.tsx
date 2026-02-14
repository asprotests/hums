import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, FolderTree, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { libraryApi, type BookCategory, type CategoryTreeNode } from '@/lib/api/library';
import { useToast } from '@/hooks/use-toast';

export function CategoriesPage() {
  const { toast } = useToast();

  const [categories, setCategories] = useState<BookCategory[]>([]);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<BookCategory | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [form, setForm] = useState({
    name: '',
    nameLocal: '',
    code: '',
    parentId: '',
    description: '',
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const [catRes, treeRes] = await Promise.all([
        libraryApi.getCategories(),
        libraryApi.getCategoryTree(),
      ]);
      if (catRes.success && catRes.data) setCategories(catRes.data);
      if (treeRes.success && treeRes.data) setCategoryTree(treeRes.data);
    } catch (err) {
      console.error('Failed to load categories:', err);
      toast({
        title: 'Error',
        description: 'Failed to load categories',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      nameLocal: '',
      code: '',
      parentId: '',
      description: '',
    });
    setSelectedCategory(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (category: BookCategory) => {
    setSelectedCategory(category);
    setForm({
      name: category.name,
      nameLocal: category.nameLocal || '',
      code: category.code,
      parentId: category.parentId || '',
      description: category.description || '',
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (category: BookCategory) => {
    setSelectedCategory(category);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.code) {
      toast({
        title: 'Validation Error',
        description: 'Name and code are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const payload = {
        name: form.name,
        nameLocal: form.nameLocal || undefined,
        code: form.code.toUpperCase(),
        parentId: form.parentId || undefined,
        description: form.description || undefined,
      };

      let response;
      if (selectedCategory) {
        response = await libraryApi.updateCategory(selectedCategory.id, payload);
      } else {
        response = await libraryApi.createCategory(payload);
      }

      if (response.success) {
        toast({
          title: 'Success',
          description: selectedCategory ? 'Category updated' : 'Category created',
        });
        setDialogOpen(false);
        resetForm();
        loadCategories();
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to save category',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to save category',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedCategory) return;

    try {
      const response = await libraryApi.deleteCategory(selectedCategory.id);
      if (response.success) {
        toast({ title: 'Success', description: 'Category deleted' });
        setDeleteDialogOpen(false);
        setSelectedCategory(null);
        loadCategories();
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to delete category',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete category',
        variant: 'destructive',
      });
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const renderTreeNode = (node: CategoryTreeNode, level = 0): JSX.Element => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds.has(node.id);

    return (
      <div key={node.id}>
        <div
          className={`flex items-center justify-between py-2 px-3 hover:bg-muted/50 rounded ${
            level > 0 ? 'ml-' + (level * 6) : ''
          }`}
          style={{ marginLeft: level * 24 }}
        >
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => toggleExpand(node.id)}
                className="p-1 hover:bg-muted rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <span className="w-6" />
            )}
            <FolderTree className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{node.name}</span>
            {node.nameLocal && (
              <span className="text-muted-foreground text-sm">({node.nameLocal})</span>
            )}
            <Badge variant="outline" className="text-xs">
              {node.code}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {node.bookCount} books
            </Badge>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const cat = categories.find((c) => c.id === node.id);
                if (cat) openEditDialog(cat);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const cat = categories.find((c) => c.id === node.id);
                if (cat) openDeleteDialog(cat);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div>
            {node.children.map((child) => renderTreeNode(child, level + 1))}
          </div>
        )}
      </div>
    );
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Book Categories</h1>
          <p className="text-muted-foreground">
            Organize books into categories and subcategories
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Category
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Tree */}
        <Card>
          <CardHeader>
            <CardTitle>Category Hierarchy</CardTitle>
            <CardDescription>
              View categories in a tree structure
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryTree.length === 0 ? (
              <div className="text-center py-8">
                <FolderTree className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No categories yet</p>
              </div>
            ) : (
              <div className="space-y-1">
                {categoryTree.map((node) => renderTreeNode(node))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category List */}
        <Card>
          <CardHeader>
            <CardTitle>All Categories</CardTitle>
            <CardDescription>
              Complete list of all categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <div className="text-center py-8">
                <FolderTree className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No categories yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Books</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{cat.name}</span>
                          {cat.nameLocal && (
                            <span className="text-muted-foreground text-sm block">
                              {cat.nameLocal}
                            </span>
                          )}
                          {cat.parent && (
                            <span className="text-xs text-muted-foreground">
                              Parent: {cat.parent.name}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{cat.code}</Badge>
                      </TableCell>
                      <TableCell>{cat.bookCount}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEditDialog(cat)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => openDeleteDialog(cat)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCategory ? 'Edit Category' : 'Add Category'}
            </DialogTitle>
            <DialogDescription>
              {selectedCategory
                ? 'Update category details'
                : 'Create a new book category'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name (English) *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Computer Science"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nameLocal">Name (Somali)</Label>
              <Input
                id="nameLocal"
                value={form.nameLocal}
                onChange={(e) => setForm({ ...form, nameLocal: e.target.value })}
                placeholder="Cilmiga Kombiyuutarka"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="CS"
                maxLength={10}
              />
              <p className="text-xs text-muted-foreground">
                Short unique code for the category
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentId">Parent Category</Label>
              <Select
                value={form.parentId || 'NONE'}
                onValueChange={(v) => setForm({ ...form, parentId: v === 'NONE' ? '' : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="No parent (top-level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">No parent (top-level)</SelectItem>
                  {categories
                    .filter((c) => c.id !== selectedCategory?.id)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name} ({cat.code})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Category description..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {selectedCategory ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedCategory?.name}"?
              {selectedCategory && selectedCategory.bookCount > 0 && (
                <span className="text-red-500 block mt-2">
                  This category has {selectedCategory.bookCount} books. You cannot delete it
                  until all books are moved to another category.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={selectedCategory ? selectedCategory.bookCount > 0 : true}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CategoriesPage;
