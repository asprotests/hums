import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { coursesApi, type CreateCourseInput, type UpdateCourseInput } from '@/lib/api/courses';
import { departmentsApi, type Department } from '@/lib/api/departments';

export function CourseFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEditing = !!id;
  const defaultDepartmentId = searchParams.get('departmentId') || '';

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateCourseInput>({
    name: '',
    nameLocal: '',
    code: '',
    credits: 3,
    description: '',
    departmentId: defaultDepartmentId,
    prerequisiteIds: [],
  });

  useEffect(() => {
    loadDepartments();
    if (isEditing) loadCourse();
  }, [id]);

  const loadDepartments = async () => {
    try {
      const response = await departmentsApi.getDepartments({ limit: 100 });
      if (response.success && response.data) setDepartments(response.data.data);
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const loadCourse = async () => {
    try {
      setLoading(true);
      const response = await coursesApi.getCourseById(id!);
      if (response.success && response.data) {
        const c = response.data;
        setFormData({
          name: c.name,
          nameLocal: c.nameLocal || '',
          code: c.code,
          credits: c.credits,
          description: c.description || '',
          departmentId: c.department?.id || '',
          prerequisiteIds: c.prerequisites.map((p) => p.id),
        });
      }
    } catch (error) {
      setError('Failed to load course');
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
        const updateData: UpdateCourseInput = {
          name: formData.name,
          nameLocal: formData.nameLocal || undefined,
          code: formData.code,
          credits: formData.credits,
          description: formData.description || undefined,
          departmentId: formData.departmentId,
        };
        await coursesApi.updateCourse(id!, updateData);
      } else {
        await coursesApi.createCourse(formData);
      }
      navigate('/admin/academic/courses');
    } catch (error: any) {
      setError(error.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} course`);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof CreateCourseInput, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) return <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-3xl font-bold">{isEditing ? 'Edit Course' : 'New Course'}</h1>
          <p className="text-muted-foreground">{isEditing ? 'Update course' : 'Create a new course'}</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Course Information</CardTitle>
          <CardDescription>Fields marked with * are required.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">{error}</div>}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input id="code" placeholder="e.g., CS101" value={formData.code} onChange={(e) => handleChange('code', e.target.value.toUpperCase())} required pattern="^[A-Z]{2,4}\d{3,4}$" title="Format: CS101 or MATH2001" />
                <p className="text-xs text-muted-foreground">Format: CS101, MATH2001</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="credits">Credits *</Label>
                <Input id="credits" type="number" min={1} max={10} value={formData.credits} onChange={(e) => handleChange('credits', parseInt(e.target.value))} required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name (English) *</Label>
              <Input id="name" placeholder="e.g., Introduction to Programming" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} required minLength={3} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nameLocal">Name (Somali)</Label>
              <Input id="nameLocal" placeholder="Local name" value={formData.nameLocal} onChange={(e) => handleChange('nameLocal', e.target.value)} dir="auto" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="departmentId">Department *</Label>
              <Select value={formData.departmentId} onValueChange={(v) => handleChange('departmentId', v)} required>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Course description..." value={formData.description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('description', e.target.value)} rows={4} />
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/admin/academic/courses')}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEditing ? 'Updating...' : 'Creating...'}</> : <><Save className="mr-2 h-4 w-4" />{isEditing ? 'Update' : 'Create'} Course</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
