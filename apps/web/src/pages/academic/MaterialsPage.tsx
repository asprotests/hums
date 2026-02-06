import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  FileText,
  Video,
  Link as LinkIcon,
  Presentation,
  BookOpen,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  EyeOff,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import {
  courseMaterialsApi,
  type CourseMaterial,
  type MaterialType,
  type CreateMaterialInput,
} from '@/lib/api/courseMaterials';
import { classesApi } from '@/lib/api/classes';

const MATERIAL_TYPES: { value: MaterialType; label: string; icon: React.ReactNode }[] = [
  { value: 'DOCUMENT', label: 'Document', icon: <FileText className="h-4 w-4" /> },
  { value: 'VIDEO', label: 'Video', icon: <Video className="h-4 w-4" /> },
  { value: 'LINK', label: 'External Link', icon: <LinkIcon className="h-4 w-4" /> },
  { value: 'SLIDES', label: 'Slides', icon: <Presentation className="h-4 w-4" /> },
  { value: 'SYLLABUS', label: 'Syllabus', icon: <BookOpen className="h-4 w-4" /> },
  { value: 'ASSIGNMENT', label: 'Assignment', icon: <FileText className="h-4 w-4" /> },
  { value: 'OTHER', label: 'Other', icon: <FileText className="h-4 w-4" /> },
];

export function MaterialsPage() {
  const { classId } = useParams<{ classId: string }>();
  const [loading, setLoading] = useState(true);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [className, setClassName] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<CourseMaterial | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CreateMaterialInput>({
    title: '',
    description: '',
    type: 'DOCUMENT',
    externalUrl: '',
    week: undefined,
    isPublished: false,
  });

  useEffect(() => {
    if (classId) {
      loadData();
    }
  }, [classId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [materialsResult, classResult] = await Promise.all([
        courseMaterialsApi.getMaterials(classId!, true),
        classesApi.getClass(classId!),
      ]);

      if (materialsResult.success && materialsResult.data) {
        setMaterials(materialsResult.data);
      }
      if (classResult.success && classResult.data) {
        setClassName(classResult.data.name);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'DOCUMENT',
      externalUrl: '',
      week: undefined,
      isPublished: false,
    });
    setSelectedMaterial(null);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.externalUrl) {
      return;
    }

    try {
      setSaving(true);

      if (selectedMaterial) {
        // Update
        await courseMaterialsApi.updateMaterial(selectedMaterial.id, {
          title: formData.title,
          description: formData.description || null,
          type: formData.type,
          externalUrl: formData.externalUrl || null,
          week: formData.week || null,
        });
      } else {
        // Create
        await courseMaterialsApi.createMaterial(classId!, formData);
      }

      setUploadDialogOpen(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to save material');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (material: CourseMaterial) => {
    setSelectedMaterial(material);
    setFormData({
      title: material.title,
      description: material.description || '',
      type: material.type,
      externalUrl: material.externalUrl || material.fileUrl || '',
      week: material.week || undefined,
      isPublished: material.isPublished,
    });
    setUploadDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedMaterial) return;

    try {
      await courseMaterialsApi.deleteMaterial(selectedMaterial.id);
      setDeleteDialogOpen(false);
      setSelectedMaterial(null);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete material');
    }
  };

  const handleTogglePublish = async (material: CourseMaterial) => {
    try {
      if (material.isPublished) {
        await courseMaterialsApi.unpublishMaterial(material.id);
      } else {
        await courseMaterialsApi.publishMaterial(material.id);
      }
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update material');
    }
  };

  const getMaterialIcon = (type: MaterialType) => {
    const typeConfig = MATERIAL_TYPES.find((t) => t.value === type);
    return typeConfig?.icon || <FileText className="h-4 w-4" />;
  };

  // Group materials by week
  const materialsByWeek = materials.reduce((acc, material) => {
    const week = material.week || 0;
    if (!acc[week]) {
      acc[week] = [];
    }
    acc[week].push(material);
    return acc;
  }, {} as Record<number, CourseMaterial[]>);

  const sortedWeeks = Object.keys(materialsByWeek)
    .map(Number)
    .sort((a, b) => a - b);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to={`/academic/classes/${classId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Course Materials</h1>
          <p className="text-muted-foreground">{className}</p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Upload Material
        </Button>
      </div>

      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>
      )}

      {/* Materials List */}
      {materials.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Materials Yet</h3>
            <p className="text-muted-foreground mb-4">
              Upload your first material to get started.
            </p>
            <Button onClick={() => setUploadDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Upload Material
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedWeeks.map((week) => (
            <Card key={week}>
              <CardHeader>
                <CardTitle>
                  {week === 0 ? 'General Materials' : `Week ${week}`}
                </CardTitle>
                <CardDescription>
                  {materialsByWeek[week].length} material(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {materialsByWeek[week].map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {getMaterialIcon(material.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{material.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {material.type}
                          </Badge>
                          <Badge
                            variant={material.isPublished ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {material.isPublished ? 'Published' : 'Draft'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            by {material.uploadedBy.firstName} {material.uploadedBy.lastName}
                          </span>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() =>
                              window.open(material.externalUrl || material.fileUrl || '', '_blank')
                            }
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(material)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleTogglePublish(material)}>
                            {material.isPublished ? (
                              <>
                                <EyeOff className="mr-2 h-4 w-4" />
                                Unpublish
                              </>
                            ) : (
                              <>
                                <Eye className="mr-2 h-4 w-4" />
                                Publish
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => {
                              setSelectedMaterial(material);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload/Edit Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedMaterial ? 'Edit Material' : 'Upload Material'}
            </DialogTitle>
            <DialogDescription>
              {selectedMaterial
                ? 'Update the material details.'
                : 'Add a new material to this class.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., Week 1 Lecture Notes"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Brief description of the material"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) => handleInputChange('type', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          {type.icon}
                          {type.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="week">Week</Label>
                <Input
                  id="week"
                  type="number"
                  min={1}
                  max={20}
                  value={formData.week || ''}
                  onChange={(e) =>
                    handleInputChange('week', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                value={formData.externalUrl}
                onChange={(e) => handleInputChange('externalUrl', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isPublished"
                checked={formData.isPublished}
                onCheckedChange={(checked) => handleInputChange('isPublished', checked)}
              />
              <Label htmlFor="isPublished" className="text-sm font-normal">
                Publish immediately (visible to students)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !formData.title || !formData.externalUrl}>
              {saving ? 'Saving...' : selectedMaterial ? 'Update' : 'Upload'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Material</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedMaterial?.title}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MaterialsPage;
