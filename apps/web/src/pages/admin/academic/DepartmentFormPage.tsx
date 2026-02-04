import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { departmentsApi, type CreateDepartmentInput, type UpdateDepartmentInput } from '@/lib/api/departments';
import { facultiesApi, type Faculty } from '@/lib/api/faculties';

export function DepartmentFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEditing = !!id;
  const defaultFacultyId = searchParams.get('facultyId') || '';

  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateDepartmentInput>({
    name: '',
    nameLocal: '',
    code: '',
    facultyId: defaultFacultyId,
    hodId: undefined,
  });

  useEffect(() => {
    loadFaculties();
    if (isEditing) {
      loadDepartment();
    }
  }, [id]);

  const loadFaculties = async () => {
    try {
      const response = await facultiesApi.getFaculties({ limit: 100 });
      if (response.success && response.data) {
        setFaculties(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load faculties:', error);
    }
  };

  const loadDepartment = async () => {
    try {
      setLoading(true);
      const response = await departmentsApi.getDepartmentById(id!);
      if (response.success && response.data) {
        setFormData({
          name: response.data.name,
          nameLocal: response.data.nameLocal || '',
          code: response.data.code,
          facultyId: response.data.faculty?.id || '',
          hodId: response.data.hod?.id,
        });
      }
    } catch (error) {
      console.error('Failed to load department:', error);
      setError('Failed to load department');
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
        const updateData: UpdateDepartmentInput = {
          name: formData.name,
          nameLocal: formData.nameLocal || undefined,
          code: formData.code,
          facultyId: formData.facultyId,
          hodId: formData.hodId || null,
        };
        await departmentsApi.updateDepartment(id!, updateData);
      } else {
        await departmentsApi.createDepartment(formData);
      }
      navigate('/admin/academic/departments');
    } catch (error: any) {
      setError(error.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} department`);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof CreateDepartmentInput, value: string) => {
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
          <h1 className="text-3xl font-bold">{isEditing ? 'Edit Department' : 'New Department'}</h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update department information' : 'Create a new academic department'}
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Department Information</CardTitle>
          <CardDescription>
            Enter the department details. Fields marked with * are required.
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
                  placeholder="e.g., CS"
                  value={formData.code}
                  onChange={(e) => handleChange('code', e.target.value.toUpperCase())}
                  required
                  pattern="^[A-Z0-9-]+$"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="facultyId">Faculty *</Label>
                <Select
                  value={formData.facultyId}
                  onValueChange={(value) => handleChange('facultyId', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select faculty" />
                  </SelectTrigger>
                  <SelectContent>
                    {faculties.map((faculty) => (
                      <SelectItem key={faculty.id} value={faculty.id}>
                        {faculty.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name (English) *</Label>
              <Input
                id="name"
                placeholder="e.g., Department of Computer Science"
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
                placeholder="e.g., Waaxda Sayniska Kombuyuutarka"
                value={formData.nameLocal}
                onChange={(e) => handleChange('nameLocal', e.target.value)}
                dir="auto"
              />
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/academic/departments')}
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
                    {isEditing ? 'Update Department' : 'Create Department'}
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
