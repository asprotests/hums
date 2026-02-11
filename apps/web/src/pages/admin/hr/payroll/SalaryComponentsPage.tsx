import { useState, useEffect } from 'react';
import { Plus, Edit, DollarSign, Percent, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  salaryComponentsApi,
  type SalaryComponent,
  type CreateSalaryComponentInput,
  type SalaryComponentType,
  type CalculationType,
} from '@/lib/api/salaryComponents';

export function SalaryComponentsPage() {
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingComponent, setEditingComponent] = useState<SalaryComponent | null>(null);
  const [formData, setFormData] = useState<CreateSalaryComponentInput>({
    name: '',
    type: 'ALLOWANCE',
    calculationType: 'FIXED',
    defaultValue: 0,
    isActive: true,
    appliesToAll: false,
    description: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadComponents();
  }, []);

  const loadComponents = async () => {
    try {
      setLoading(true);
      const response = await salaryComponentsApi.getComponents(true);
      if (response.success && response.data) {
        setComponents(response.data);
      }
    } catch (err) {
      console.error('Failed to load salary components:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    try {
      await salaryComponentsApi.initializeDefaults();
      loadComponents();
    } catch (err) {
      console.error('Failed to initialize components:', err);
    }
  };

  const handleOpenForm = (component?: SalaryComponent) => {
    if (component) {
      setEditingComponent(component);
      setFormData({
        name: component.name,
        type: component.type,
        calculationType: component.calculationType,
        defaultValue: component.defaultValue,
        isActive: component.isActive,
        appliesToAll: component.appliesToAll,
        description: component.description || '',
      });
    } else {
      setEditingComponent(null);
      setFormData({
        name: '',
        type: 'ALLOWANCE',
        calculationType: 'FIXED',
        defaultValue: 0,
        isActive: true,
        appliesToAll: false,
        description: '',
      });
    }
    setError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (editingComponent) {
        await salaryComponentsApi.updateComponent(editingComponent.id, formData);
      } else {
        await salaryComponentsApi.createComponent(formData);
      }

      setShowForm(false);
      loadComponents();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save component');
    } finally {
      setSaving(false);
    }
  };

  const allowances = components.filter((c) => c.type === 'ALLOWANCE');
  const deductions = components.filter((c) => c.type === 'DEDUCTION');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Salary Components</h1>
          <p className="text-muted-foreground">Manage allowances and deductions for payroll</p>
        </div>
        <div className="flex gap-2">
          {components.length === 0 && (
            <Button variant="outline" onClick={handleInitialize}>
              Initialize Defaults
            </Button>
          )}
          <Button onClick={() => handleOpenForm()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Component
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Components</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{components.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Allowances</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{allowances.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Deductions</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{deductions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Universal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {components.filter((c) => c.appliesToAll).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Allowances Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Allowances
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Calculation</TableHead>
                  <TableHead>Default Value</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allowances.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                      No allowances configured
                    </TableCell>
                  </TableRow>
                ) : (
                  allowances.map((component) => (
                    <TableRow key={component.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{component.name}</span>
                          {component.description && (
                            <span className="block text-sm text-muted-foreground">
                              {component.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {component.calculationType === 'PERCENTAGE' ? (
                            <Percent className="h-3 w-3" />
                          ) : (
                            <DollarSign className="h-3 w-3" />
                          )}
                          {component.calculationType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {component.calculationType === 'PERCENTAGE'
                          ? `${component.defaultValue}%`
                          : `$${component.defaultValue}`}
                      </TableCell>
                      <TableCell>
                        {component.appliesToAll ? (
                          <Badge variant="default">All Employees</Badge>
                        ) : (
                          <Badge variant="secondary">Assigned Only</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {component.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenForm(component)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Deductions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-red-500" />
            Deductions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Calculation</TableHead>
                  <TableHead>Default Value</TableHead>
                  <TableHead>Applies To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deductions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                      No deductions configured
                    </TableCell>
                  </TableRow>
                ) : (
                  deductions.map((component) => (
                    <TableRow key={component.id}>
                      <TableCell>
                        <div>
                          <span className="font-medium">{component.name}</span>
                          {component.description && (
                            <span className="block text-sm text-muted-foreground">
                              {component.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {component.calculationType === 'PERCENTAGE' ? (
                            <Percent className="h-3 w-3" />
                          ) : (
                            <DollarSign className="h-3 w-3" />
                          )}
                          {component.calculationType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {component.calculationType === 'PERCENTAGE'
                          ? `${component.defaultValue}%`
                          : `$${component.defaultValue}`}
                      </TableCell>
                      <TableCell>
                        {component.appliesToAll ? (
                          <Badge variant="default">All Employees</Badge>
                        ) : (
                          <Badge variant="secondary">Assigned Only</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {component.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenForm(component)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Component Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingComponent ? 'Edit Salary Component' : 'Add Salary Component'}
            </DialogTitle>
            <DialogDescription>
              {editingComponent
                ? 'Update salary component configuration'
                : 'Create a new allowance or deduction'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Component Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Housing Allowance"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) =>
                    setFormData({ ...formData, type: value as SalaryComponentType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALLOWANCE">Allowance (+)</SelectItem>
                    <SelectItem value="DEDUCTION">Deduction (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="calculationType">Calculation Method</Label>
                <Select
                  value={formData.calculationType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, calculationType: value as CalculationType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FIXED">Fixed Amount</SelectItem>
                    <SelectItem value="PERCENTAGE">Percentage of Base Salary</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="defaultValue">
                  Default Value{' '}
                  {formData.calculationType === 'PERCENTAGE' ? '(%)' : '($)'}
                </Label>
                <Input
                  id="defaultValue"
                  type="number"
                  min={0}
                  step={formData.calculationType === 'PERCENTAGE' ? 0.1 : 1}
                  value={formData.defaultValue}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      defaultValue: parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this component"
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="appliesToAll">Applies to All Employees</Label>
                <Switch
                  id="appliesToAll"
                  checked={formData.appliesToAll}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, appliesToAll: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name}>
              {saving ? 'Saving...' : editingComponent ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SalaryComponentsPage;
