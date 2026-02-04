import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  rolesApi,
  type Permission,
  type CreateRoleInput,
  type UpdateRoleInput,
} from '@/lib/api/roles';

export function RoleFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({});
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    permissionIds: [] as string[],
  });

  useEffect(() => {
    loadPermissions();
    if (isEdit) {
      loadRole();
    }
  }, [id]);

  const loadPermissions = async () => {
    try {
      const response = await rolesApi.getPermissions();
      if (response.success && response.data) {
        setPermissions(response.data.grouped);
      }
    } catch (error) {
      console.error('Failed to load permissions:', error);
    }
  };

  const loadRole = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await rolesApi.getRoleById(id);
      if (response.success && response.data) {
        const role = response.data;
        setFormData({
          name: role.name,
          displayName: role.displayName,
          description: role.description || '',
          permissionIds: role.permissions.map((p) => p.id),
        });
      }
    } catch (error) {
      console.error('Failed to load role:', error);
      setError('Failed to load role');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name || !formData.displayName) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      if (isEdit) {
        const updateData: UpdateRoleInput = {
          name: formData.name,
          displayName: formData.displayName,
          description: formData.description || undefined,
          permissionIds: formData.permissionIds,
        };
        await rolesApi.updateRole(id!, updateData);
      } else {
        const createData: CreateRoleInput = {
          name: formData.name,
          displayName: formData.displayName,
          description: formData.description || undefined,
          permissionIds: formData.permissionIds,
        };
        await rolesApi.createRole(createData);
      }
      navigate('/admin/roles');
    } catch (error: any) {
      console.error('Failed to save role:', error);
      setError(error.response?.data?.message || 'Failed to save role');
    } finally {
      setSaving(false);
    }
  };

  const handlePermissionToggle = (permissionId: string) => {
    setFormData((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permissionId)
        ? prev.permissionIds.filter((id) => id !== permissionId)
        : [...prev.permissionIds, permissionId],
    }));
  };

  const handleResourceToggle = (resourcePermissions: Permission[]) => {
    const resourcePermissionIds = resourcePermissions.map((p) => p.id);
    const allSelected = resourcePermissionIds.every((id) => formData.permissionIds.includes(id));

    setFormData((prev) => ({
      ...prev,
      permissionIds: allSelected
        ? prev.permissionIds.filter((id) => !resourcePermissionIds.includes(id))
        : [...new Set([...prev.permissionIds, ...resourcePermissionIds])],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/roles')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{isEdit ? 'Edit Role' : 'Create Role'}</h1>
          <p className="text-muted-foreground">
            {isEdit ? 'Update role details and permissions' : 'Create a new role with permissions'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Role Information</CardTitle>
              <CardDescription>Basic role details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value.toUpperCase().replace(/\s+/g, '_'),
                      })
                    }
                    placeholder="ROLE_NAME"
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Uppercase letters and underscores only
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name *</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    placeholder="Role Display Name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of this role"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permissions</CardTitle>
              <CardDescription>
                Select permissions for this role ({formData.permissionIds.length} selected)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {Object.entries(permissions).map(([resource, resourcePermissions]) => {
                  const allSelected = resourcePermissions.every((p) =>
                    formData.permissionIds.includes(p.id)
                  );
                  const someSelected = resourcePermissions.some((p) =>
                    formData.permissionIds.includes(p.id)
                  );

                  return (
                    <div key={resource} className="space-y-3">
                      <div className="flex items-center space-x-3 border-b pb-2">
                        <Checkbox
                          id={`resource-${resource}`}
                          checked={allSelected}
                          onCheckedChange={() => handleResourceToggle(resourcePermissions)}
                          className={someSelected && !allSelected ? 'data-[state=checked]:bg-muted' : ''}
                        />
                        <label
                          htmlFor={`resource-${resource}`}
                          className="text-sm font-semibold cursor-pointer capitalize"
                        >
                          {resource}
                        </label>
                        <span className="text-xs text-muted-foreground">
                          ({resourcePermissions.filter((p) => formData.permissionIds.includes(p.id)).length}/{resourcePermissions.length})
                        </span>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 pl-6">
                        {resourcePermissions.map((permission) => (
                          <div key={permission.id} className="flex items-start space-x-2">
                            <Checkbox
                              id={permission.id}
                              checked={formData.permissionIds.includes(permission.id)}
                              onCheckedChange={() => handlePermissionToggle(permission.id)}
                            />
                            <div className="grid gap-0.5 leading-none">
                              <label
                                htmlFor={permission.id}
                                className="text-sm font-medium cursor-pointer"
                              >
                                {permission.displayName}
                              </label>
                              <p className="text-xs text-muted-foreground">
                                {permission.action}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/roles')}>
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
                {isEdit ? 'Update Role' : 'Create Role'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
