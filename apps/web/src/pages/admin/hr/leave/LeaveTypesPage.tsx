import { useState, useEffect } from 'react';
import { Plus, Edit, Calendar, FileText, Check, X } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { leaveTypesApi, type LeaveType, type CreateLeaveTypeInput } from '@/lib/api/leaveTypes';

export function LeaveTypesPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingType, setEditingType] = useState<LeaveType | null>(null);
  const [deleteTypeId, setDeleteTypeId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateLeaveTypeInput>({
    name: '',
    nameLocal: '',
    type: 'ANNUAL',
    daysPerYear: 21,
    carryForward: false,
    maxCarryDays: 0,
    requiresDocument: false,
    isPaid: true,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaveTypes();
  }, []);

  const loadLeaveTypes = async () => {
    try {
      setLoading(true);
      const response = await leaveTypesApi.getLeaveTypes(true);
      if (response.success && response.data) {
        setLeaveTypes(response.data);
      }
    } catch (err) {
      console.error('Failed to load leave types:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    try {
      await leaveTypesApi.initializeDefaults();
      loadLeaveTypes();
    } catch (err) {
      console.error('Failed to initialize leave types:', err);
    }
  };

  const handleOpenForm = (type?: LeaveType) => {
    if (type) {
      setEditingType(type);
      setFormData({
        name: type.name,
        nameLocal: type.nameLocal || '',
        type: type.type,
        daysPerYear: type.daysPerYear,
        carryForward: type.carryForward,
        maxCarryDays: type.maxCarryDays,
        requiresDocument: type.requiresDocument,
        isPaid: type.isPaid,
        isActive: type.isActive,
      });
    } else {
      setEditingType(null);
      setFormData({
        name: '',
        nameLocal: '',
        type: 'ANNUAL',
        daysPerYear: 21,
        carryForward: false,
        maxCarryDays: 0,
        requiresDocument: false,
        isPaid: true,
        isActive: true,
      });
    }
    setError(null);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      if (editingType) {
        await leaveTypesApi.updateLeaveType(editingType.id, formData);
      } else {
        await leaveTypesApi.createLeaveType(formData);
      }

      setShowForm(false);
      loadLeaveTypes();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save leave type');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTypeId) return;
    try {
      // Note: API doesn't have delete endpoint for leave types as they should be deactivated instead
      setDeleteTypeId(null);
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const typeToDelete = leaveTypes.find((t) => t.id === deleteTypeId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Types</h1>
          <p className="text-muted-foreground">Configure leave types and allocation rules</p>
        </div>
        <div className="flex gap-2">
          {leaveTypes.length === 0 && (
            <Button variant="outline" onClick={handleInitialize}>
              Initialize Defaults
            </Button>
          )}
          <Button onClick={() => handleOpenForm()}>
            <Plus className="mr-2 h-4 w-4" />
            Add Leave Type
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Leave Types Configuration</CardTitle>
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
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Days/Year</TableHead>
                  <TableHead>Carry Forward</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No leave types configured. Click "Initialize Defaults" to set up standard leave types.
                    </TableCell>
                  </TableRow>
                ) : (
                  leaveTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium">{type.name}</span>
                            {type.nameLocal && (
                              <span className="block text-sm text-muted-foreground">
                                {type.nameLocal}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{type.daysPerYear} days</Badge>
                      </TableCell>
                      <TableCell>
                        {type.carryForward ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <Check className="h-4 w-4" />
                            <span className="text-sm">Max {type.maxCarryDays}</span>
                          </div>
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        {type.requiresDocument ? (
                          <FileText className="h-4 w-4 text-amber-500" />
                        ) : (
                          <X className="h-4 w-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell>
                        {type.isPaid ? (
                          <Badge variant="default">Paid</Badge>
                        ) : (
                          <Badge variant="outline">Unpaid</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {type.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenForm(type)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Leave Type Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingType ? 'Edit Leave Type' : 'Add Leave Type'}</DialogTitle>
            <DialogDescription>
              {editingType
                ? 'Update leave type configuration'
                : 'Create a new leave type with allocation rules'}
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
                <Label htmlFor="name">Name (English)</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Annual Leave"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nameLocal">Name (Somali)</Label>
                <Input
                  id="nameLocal"
                  value={formData.nameLocal}
                  onChange={(e) => setFormData({ ...formData, nameLocal: e.target.value })}
                  placeholder="e.g., Fasaxa Sanadka"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Leave Category</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANNUAL">Annual</SelectItem>
                    <SelectItem value="SICK">Sick</SelectItem>
                    <SelectItem value="MATERNITY">Maternity</SelectItem>
                    <SelectItem value="PATERNITY">Paternity</SelectItem>
                    <SelectItem value="UNPAID">Unpaid</SelectItem>
                    <SelectItem value="COMPASSIONATE">Compassionate</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="daysPerYear">Days Per Year</Label>
                <Input
                  id="daysPerYear"
                  type="number"
                  min={0}
                  value={formData.daysPerYear}
                  onChange={(e) =>
                    setFormData({ ...formData, daysPerYear: parseInt(e.target.value) || 0 })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="carryForward">Allow Carry Forward</Label>
                <Switch
                  id="carryForward"
                  checked={formData.carryForward}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, carryForward: checked })
                  }
                />
              </div>

              {formData.carryForward && (
                <div className="space-y-2">
                  <Label htmlFor="maxCarryDays">Max Carry Days</Label>
                  <Input
                    id="maxCarryDays"
                    type="number"
                    min={0}
                    value={formData.maxCarryDays}
                    onChange={(e) =>
                      setFormData({ ...formData, maxCarryDays: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                <Label htmlFor="requiresDocument">Requires Document</Label>
                <Switch
                  id="requiresDocument"
                  checked={formData.requiresDocument}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, requiresDocument: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isPaid">Paid Leave</Label>
                <Switch
                  id="isPaid"
                  checked={formData.isPaid}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPaid: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="isActive">Active</Label>
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.name}>
              {saving ? 'Saving...' : editingType ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTypeId} onOpenChange={() => setDeleteTypeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Leave Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate "{typeToDelete?.name}"? Employees will no longer
              be able to request this leave type.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Deactivate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default LeaveTypesPage;
