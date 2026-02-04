import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
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
import {
  feeStructuresApi,
  type CreateFeeStructureInput,
  type OtherFee,
} from '@/lib/api/feeStructures';
import { programsApi, type Program } from '@/lib/api/programs';

export function FeeStructureFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;

  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    programId: string;
    academicYear: string;
    tuitionFee: string;
    registrationFee: string;
    libraryFee: string;
    labFee: string;
    otherFees: OtherFee[];
  }>({
    programId: '',
    academicYear: '',
    tuitionFee: '',
    registrationFee: '',
    libraryFee: '',
    labFee: '',
    otherFees: [],
  });

  useEffect(() => {
    loadPrograms();
    if (isEditing) {
      loadFeeStructure();
    }
  }, [id]);

  const loadPrograms = async () => {
    try {
      const response = await programsApi.getPrograms({ limit: 100 });
      if (response.success && response.data) {
        setPrograms(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load programs:', error);
    }
  };

  const loadFeeStructure = async () => {
    try {
      setLoading(true);
      const response = await feeStructuresApi.getFeeStructureById(id!);
      if (response.success && response.data) {
        const fs = response.data;
        setFormData({
          programId: fs.programId,
          academicYear: fs.academicYear,
          tuitionFee: String(fs.tuitionFee),
          registrationFee: String(fs.registrationFee),
          libraryFee: String(fs.libraryFee),
          labFee: String(fs.labFee),
          otherFees: fs.otherFees || [],
        });
      }
    } catch (error) {
      console.error('Failed to load fee structure:', error);
      setError('Failed to load fee structure');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.programId) {
      setError('Please select a program');
      return;
    }
    if (!formData.academicYear) {
      setError('Please select an academic year');
      return;
    }

    try {
      setSaving(true);
      const data = {
        programId: formData.programId,
        academicYear: formData.academicYear,
        tuitionFee: parseFloat(formData.tuitionFee) || 0,
        registrationFee: parseFloat(formData.registrationFee) || 0,
        libraryFee: parseFloat(formData.libraryFee) || 0,
        labFee: parseFloat(formData.labFee) || 0,
        otherFees: formData.otherFees.length > 0 ? formData.otherFees : undefined,
      };

      if (isEditing) {
        await feeStructuresApi.updateFeeStructure(id!, {
          tuitionFee: data.tuitionFee,
          registrationFee: data.registrationFee,
          libraryFee: data.libraryFee,
          labFee: data.labFee,
          otherFees: data.otherFees,
        });
      } else {
        await feeStructuresApi.createFeeStructure(data as CreateFeeStructureInput);
      }
      navigate('/admin/finance/fee-structures');
    } catch (error: any) {
      console.error('Failed to save fee structure:', error);
      setError(error.response?.data?.message || 'Failed to save fee structure');
    } finally {
      setSaving(false);
    }
  };

  const addOtherFee = () => {
    setFormData({
      ...formData,
      otherFees: [...formData.otherFees, { name: '', amount: 0 }],
    });
  };

  const removeOtherFee = (index: number) => {
    const newOtherFees = [...formData.otherFees];
    newOtherFees.splice(index, 1);
    setFormData({ ...formData, otherFees: newOtherFees });
  };

  const updateOtherFee = (index: number, field: 'name' | 'amount', value: string) => {
    const newOtherFees = [...formData.otherFees];
    if (field === 'name') {
      newOtherFees[index].name = value;
    } else {
      newOtherFees[index].amount = parseFloat(value) || 0;
    }
    setFormData({ ...formData, otherFees: newOtherFees });
  };

  // Generate academic years
  const currentYear = new Date().getFullYear();
  const academicYears = Array.from({ length: 5 }, (_, i) => {
    const year = currentYear - 1 + i;
    return `${year}-${year + 1}`;
  });

  // Calculate total
  const calculateTotal = () => {
    const tuition = parseFloat(formData.tuitionFee) || 0;
    const registration = parseFloat(formData.registrationFee) || 0;
    const library = parseFloat(formData.libraryFee) || 0;
    const lab = parseFloat(formData.labFee) || 0;
    const otherTotal = formData.otherFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
    return tuition + registration + library + lab + otherTotal;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
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
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Edit Fee Structure' : 'Create Fee Structure'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update fee amounts' : 'Set up fees for a program'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Program Details</CardTitle>
              <CardDescription>Select the program and academic year</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="program">Program *</Label>
                <Select
                  value={formData.programId}
                  onValueChange={(value) => setFormData({ ...formData, programId: value })}
                  disabled={isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.code} - {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="academicYear">Academic Year *</Label>
                <Select
                  value={formData.academicYear}
                  onValueChange={(value) => setFormData({ ...formData, academicYear: value })}
                  disabled={isEditing}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select academic year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Fee Amounts</CardTitle>
              <CardDescription>Enter fee amounts in USD</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tuitionFee">Tuition Fee *</Label>
                  <Input
                    id="tuitionFee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.tuitionFee}
                    onChange={(e) => setFormData({ ...formData, tuitionFee: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registrationFee">Registration Fee *</Label>
                  <Input
                    id="registrationFee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.registrationFee}
                    onChange={(e) => setFormData({ ...formData, registrationFee: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="libraryFee">Library Fee *</Label>
                  <Input
                    id="libraryFee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.libraryFee}
                    onChange={(e) => setFormData({ ...formData, libraryFee: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="labFee">Lab Fee</Label>
                  <Input
                    id="labFee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.labFee}
                    onChange={(e) => setFormData({ ...formData, labFee: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Other Fees</CardTitle>
                <CardDescription>Add any additional fees</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addOtherFee}>
                <Plus className="mr-2 h-4 w-4" />
                Add Fee
              </Button>
            </CardHeader>
            <CardContent>
              {formData.otherFees.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No additional fees. Click "Add Fee" to add one.
                </p>
              ) : (
                <div className="space-y-4">
                  {formData.otherFees.map((fee, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className="flex-1">
                        <Input
                          placeholder="Fee name (e.g., Sports Fee)"
                          value={fee.name}
                          onChange={(e) => updateOtherFee(index, 'name', e.target.value)}
                        />
                      </div>
                      <div className="w-40">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Amount"
                          value={fee.amount || ''}
                          onChange={(e) => updateOtherFee(index, 'amount', e.target.value)}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeOtherFee(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">Total Fee</p>
                <p className="text-3xl font-bold">
                  ${calculateTotal().toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex gap-4">
                {error && <p className="text-destructive text-sm self-center">{error}</p>}
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : isEditing ? 'Update Fee Structure' : 'Create Fee Structure'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
