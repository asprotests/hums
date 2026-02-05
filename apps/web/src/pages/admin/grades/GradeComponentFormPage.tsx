import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { classesApi, type ClassEntity } from '@/lib/api/classes';
import {
  gradeComponentsApi,
  type GradeComponent,
  type GradeComponentType,
  type CreateGradeComponentInput,
  type UpdateGradeComponentInput,
} from '@/lib/api/grading';

const COMPONENT_TYPES: { value: GradeComponentType; label: string }[] = [
  { value: 'MIDTERM', label: 'Midterm Exam' },
  { value: 'FINAL', label: 'Final Exam' },
  { value: 'QUIZ', label: 'Quiz' },
  { value: 'ASSIGNMENT', label: 'Assignment' },
  { value: 'PROJECT', label: 'Project' },
  { value: 'PARTICIPATION', label: 'Participation' },
  { value: 'LAB', label: 'Lab Work' },
  { value: 'OTHER', label: 'Other' },
];

export function GradeComponentFormPage() {
  const navigate = useNavigate();
  const { classId, componentId } = useParams();
  const isEditing = !!componentId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classEntity, setClassEntity] = useState<ClassEntity | null>(null);
  const [component, setComponent] = useState<GradeComponent | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'ASSIGNMENT' as GradeComponentType,
    weight: 10,
    maxScore: 100,
    dueDate: '',
  });

  useEffect(() => {
    loadData();
  }, [classId, componentId]);

  const loadData = async () => {
    try {
      setLoading(true);

      if (isEditing && componentId) {
        // Load component for editing
        const componentRes = await gradeComponentsApi.getById(componentId);
        if (componentRes.success && componentRes.data) {
          setComponent(componentRes.data);
          setFormData({
            name: componentRes.data.name,
            type: componentRes.data.type,
            weight: componentRes.data.weight,
            maxScore: componentRes.data.maxScore,
            dueDate: componentRes.data.dueDate
              ? new Date(componentRes.data.dueDate).toISOString().split('T')[0]
              : '',
          });
          // Load class info from component
          if (componentRes.data.class) {
            setClassEntity(componentRes.data.class as unknown as ClassEntity);
          }
        }
      } else if (classId) {
        // Load class for new component
        const classRes = await classesApi.getClassById(classId);
        if (classRes.success && classRes.data) {
          setClassEntity(classRes.data);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);

      if (isEditing && componentId) {
        const updateData: UpdateGradeComponentInput = {
          name: formData.name,
          type: formData.type,
          weight: formData.weight,
          maxScore: formData.maxScore,
          dueDate: formData.dueDate || null,
        };
        await gradeComponentsApi.update(componentId, updateData);
        navigate(`/admin/classes/${component?.classId}/grades`);
      } else if (classId) {
        const createData: CreateGradeComponentInput = {
          name: formData.name,
          type: formData.type,
          weight: formData.weight,
          maxScore: formData.maxScore,
          dueDate: formData.dueDate || undefined,
        };
        await gradeComponentsApi.create(classId, createData);
        navigate(`/admin/classes/${classId}/grades`);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save component');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const backUrl = isEditing && component
    ? `/admin/classes/${component.classId}/grades`
    : classId
      ? `/admin/classes/${classId}/grades`
      : '/admin/classes';

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(backUrl)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Edit Grade Component' : 'New Grade Component'}
          </h1>
          {classEntity && (
            <p className="text-muted-foreground">
              {classEntity.course.code} - {classEntity.name}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Component Details</CardTitle>
            <CardDescription>
              Define the grading component with its weight and maximum score.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Component Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Midterm Exam, Assignment 1, Lab Report"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleInputChange('type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPONENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (%) *</Label>
                <Input
                  id="weight"
                  type="number"
                  min={0}
                  max={100}
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || 0)}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Percentage of the total grade (0-100)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxScore">Max Score *</Label>
                <Input
                  id="maxScore"
                  type="number"
                  min={1}
                  value={formData.maxScore}
                  onChange={(e) => handleInputChange('maxScore', parseFloat(e.target.value) || 0)}
                  required
                />
                <p className="text-xs text-muted-foreground">Maximum points for this component</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate(backUrl)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? 'Update Component' : 'Create Component'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

export default GradeComponentFormPage;
