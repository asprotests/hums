import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { programsApi, type CreateProgramInput, type UpdateProgramInput, type ProgramType } from '@/lib/api/programs';
import { departmentsApi, type Department } from '@/lib/api/departments';

export function ProgramFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEditing = !!id;
  const defaultDepartmentId = searchParams.get('departmentId') || '';

  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateProgramInput>({
    name: '',
    nameLocal: '',
    code: '',
    type: 'BACHELOR',
    durationYears: 4,
    totalCredits: 120,
    departmentId: defaultDepartmentId,
  });

  useEffect(() => {
    loadDepartments();
    if (isEditing) loadProgram();
  }, [id]);

  const loadDepartments = async () => {
    try {
      const response = await departmentsApi.getDepartments({ limit: 100 });
      if (response.success && response.data) {
        setDepartments(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  };

  const loadProgram = async () => {
    try {
      setLoading(true);
      const response = await programsApi.getProgramById(id!);
      if (response.success && response.data) {
        const p = response.data;
        setFormData({
          name: p.name,
          nameLocal: p.nameLocal || '',
          code: p.code,
          type: p.type,
          durationYears: p.durationYears,
          totalCredits: p.totalCredits,
          departmentId: p.department?.id || '',
        });
      }
    } catch (error) {
      setError('Failed to load program');
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
        const updateData: UpdateProgramInput = { ...formData, nameLocal: formData.nameLocal || undefined };
        await programsApi.updateProgram(id!, updateData);
      } else {
        await programsApi.createProgram(formData);
      }
      navigate('/admin/academic/programs');
    } catch (error: any) {
      setError(error.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} program`);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof CreateProgramInput, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <div>
          <h1 className="text-3xl font-bold">{isEditing ? 'Edit Program' : 'New Program'}</h1>
          <p className="text-muted-foreground">{isEditing ? 'Update program' : 'Create a new degree program'}</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Program Information</CardTitle>
          <CardDescription>Fields marked with * are required.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-md">{error}</div>}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="code">Code *</Label>
                <Input id="code" placeholder="e.g., BSC-CS" value={formData.code} onChange={(e) => handleChange('code', e.target.value.toUpperCase())} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select value={formData.type} onValueChange={(v) => handleChange('type', v as ProgramType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CERTIFICATE">Certificate</SelectItem>
                    <SelectItem value="DIPLOMA">Diploma</SelectItem>
                    <SelectItem value="BACHELOR">Bachelor</SelectItem>
                    <SelectItem value="MASTER">Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name (English) *</Label>
              <Input id="name" placeholder="e.g., Bachelor of Science in Computer Science" value={formData.name} onChange={(e) => handleChange('name', e.target.value)} required minLength={3} />
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
                  {departments.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name} ({d.faculty?.name})</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="durationYears">Duration (Years) *</Label>
                <Input id="durationYears" type="number" min={1} max={6} value={formData.durationYears} onChange={(e) => handleChange('durationYears', parseInt(e.target.value))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="totalCredits">Total Credits *</Label>
                <Input id="totalCredits" type="number" min={1} max={300} value={formData.totalCredits} onChange={(e) => handleChange('totalCredits', parseInt(e.target.value))} required />
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => navigate('/admin/academic/programs')}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{isEditing ? 'Updating...' : 'Creating...'}</> : <><Save className="mr-2 h-4 w-4" />{isEditing ? 'Update' : 'Create'} Program</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
