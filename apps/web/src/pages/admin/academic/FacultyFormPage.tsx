import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { facultiesApi, type CreateFacultyInput, type UpdateFacultyInput } from '@/lib/api/faculties';

export function FacultyFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateFacultyInput>({
    name: '',
    nameLocal: '',
    code: '',
    deanId: undefined,
  });

  useEffect(() => {
    if (isEditing) {
      loadFaculty();
    }
  }, [id]);

  const loadFaculty = async () => {
    try {
      setLoading(true);
      const response = await facultiesApi.getFacultyById(id!);
      if (response.success && response.data) {
        setFormData({
          name: response.data.name,
          nameLocal: response.data.nameLocal || '',
          code: response.data.code,
          deanId: response.data.dean?.id,
        });
      }
    } catch (error) {
      console.error('Failed to load faculty:', error);
      setError('Failed to load faculty');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setSaving(true);
      if (isEditing) {
        const updateData: UpdateFacultyInput = {
          name: formData.name,
          nameLocal: formData.nameLocal || undefined,
          code: formData.code,
          deanId: formData.deanId || null,
        };
        await facultiesApi.updateFaculty(id!, updateData);
      } else {
        await facultiesApi.createFaculty(formData);
      }
      navigate('/admin/academic/faculties');
    } catch (error: any) {
      setError(error.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} faculty`);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof CreateFacultyInput, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
          <h1 className="text-3xl font-bold">{isEditing ? 'Edit Faculty' : 'New Faculty'}</h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update faculty information' : 'Create a new academic faculty'}
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Faculty Information</CardTitle>
          <CardDescription>
            Enter the faculty details. Fields marked with * are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input
                  id="code"
                  placeholder="e.g., FCS"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                  required
                  pattern="^[A-Z0-9-]+$"
                  title="Code must be uppercase alphanumeric with optional hyphens"
                />
                <p className="text-xs text-muted-foreground">
                  Unique code (uppercase letters, numbers, hyphens)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name (English) *</Label>
              <Input
                id="name"
                placeholder="e.g., Faculty of Computer Science"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                minLength={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nameLocal">Name (Somali)</Label>
              <Input
                id="nameLocal"
                placeholder="e.g., Kulliyadda Sayniska Kombuyuutarka"
                value={formData.nameLocal}
                onChange={(e) => handleChange('nameLocal', e.target.value)}
                dir="auto"
              />
              <p className="text-xs text-muted-foreground">
                Optional local language name for bilingual support
              </p>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/academic/faculties')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? 'Update Faculty' : 'Create Faculty'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
