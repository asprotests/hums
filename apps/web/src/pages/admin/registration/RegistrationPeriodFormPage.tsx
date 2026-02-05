import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import {
  registrationPeriodsApi,
  type RegistrationPeriodType,
} from '@/lib/api/registrationPeriods';
import { semestersApi, type Semester } from '@/lib/api/academicCalendar';
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
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export function RegistrationPeriodFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [formData, setFormData] = useState({
    semesterId: '',
    type: 'REGULAR' as RegistrationPeriodType,
    startDate: '',
    endDate: '',
    lateFee: '',
    isActive: true,
  });

  useEffect(() => {
    loadSemesters();
    if (isEditing) {
      loadPeriod();
    }
  }, [id]);

  const loadSemesters = async () => {
    try {
      const response = await semestersApi.getSemesters();
      setSemesters(response.data || []);
    } catch (error) {
      console.error('Failed to load semesters:', error);
    }
  };

  const loadPeriod = async () => {
    try {
      const data = await registrationPeriodsApi.getById(id!);
      setFormData({
        semesterId: data.semesterId,
        type: data.type,
        startDate: formatDateTimeLocal(data.startDate),
        endDate: formatDateTimeLocal(data.endDate),
        lateFee: data.lateFee ? String(data.lateFee) : '',
        isActive: data.isActive,
      });
    } catch (error) {
      console.error('Failed to load period:', error);
      toast({ variant: 'destructive', title: 'Failed to load registration period' });
      navigate('/admin/registration/periods');
    }
  };

  const formatDateTimeLocal = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toISOString().slice(0, 16);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.semesterId || !formData.startDate || !formData.endDate) {
      toast({ variant: 'destructive', title: 'Please fill in all required fields' });
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      toast({ variant: 'destructive', title: 'End date must be after start date' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        semesterId: formData.semesterId,
        type: formData.type,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        lateFee: formData.lateFee ? parseFloat(formData.lateFee) : undefined,
        isActive: formData.isActive,
      };

      if (isEditing) {
        await registrationPeriodsApi.update(id!, payload);
        toast({ title: 'Registration period updated successfully' });
      } else {
        await registrationPeriodsApi.create(payload);
        toast({ title: 'Registration period created successfully' });
      }
      navigate('/admin/registration/periods');
    } catch (error: any) {
      console.error('Failed to save period:', error);
      toast({
        variant: 'destructive',
        title: error.response?.data?.message || 'Failed to save registration period',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? 'Edit Registration Period' : 'Create Registration Period'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing
              ? 'Update the registration period details'
              : 'Add a new registration period for a semester'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Period Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="semesterId">Semester</Label>
                <Select
                  value={formData.semesterId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, semesterId: value })
                  }
                  disabled={isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {semesters.map((semester) => (
                      <SelectItem key={semester.id} value={semester.id}>
                        {semester.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Period Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as RegistrationPeriodType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REGULAR">Regular Registration</SelectItem>
                    <SelectItem value="LATE">Late Registration</SelectItem>
                    <SelectItem value="DROP_ADD">Drop/Add Period</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date & Time</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date & Time</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lateFee">Late Fee (Optional)</Label>
                <Input
                  id="lateFee"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.lateFee}
                  onChange={(e) =>
                    setFormData({ ...formData, lateFee: e.target.value })
                  }
                />
                <p className="text-sm text-muted-foreground">
                  Additional fee charged during late registration
                </p>
              </div>

              <div className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable this registration period
                  </p>
                </div>
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Update Period' : 'Create Period'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
