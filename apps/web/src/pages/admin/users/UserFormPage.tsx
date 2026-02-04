import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usersApi, type CreateUserInput, type UpdateUserInput } from '@/lib/api/users';
import { rolesApi, type Role } from '@/lib/api/roles';

export function UserFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
    roleIds: [] as string[],
  });

  useEffect(() => {
    loadRoles();
    if (isEdit) {
      loadUser();
    }
  }, [id]);

  const loadRoles = async () => {
    try {
      const response = await rolesApi.getRoles();
      if (response.success && response.data) {
        setRoles(response.data);
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
    }
  };

  const loadUser = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await usersApi.getUserById(id);
      if (response.success && response.data) {
        const user = response.data;
        setFormData({
          email: user.email,
          username: user.username,
          password: '',
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone || '',
          roleIds: user.roles.map((r) => r.id),
        });
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      setError('Failed to load user');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.email || !formData.username || !formData.firstName || !formData.lastName) {
      setError('Please fill in all required fields');
      return;
    }

    if (!isEdit && !formData.password) {
      setError('Password is required for new users');
      return;
    }

    if (formData.roleIds.length === 0) {
      setError('Please select at least one role');
      return;
    }

    try {
      setSaving(true);
      if (isEdit) {
        const updateData: UpdateUserInput = {
          email: formData.email,
          username: formData.username,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || undefined,
          roleIds: formData.roleIds,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await usersApi.updateUser(id!, updateData);
      } else {
        const createData: CreateUserInput = {
          email: formData.email,
          username: formData.username,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || undefined,
          roleIds: formData.roleIds,
        };
        await usersApi.createUser(createData);
      }
      navigate('/admin/users');
    } catch (error: any) {
      console.error('Failed to save user:', error);
      setError(error.response?.data?.message || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleRoleToggle = (roleId: string) => {
    setFormData((prev) => ({
      ...prev,
      roleIds: prev.roleIds.includes(roleId)
        ? prev.roleIds.filter((id) => id !== roleId)
        : [...prev.roleIds, roleId],
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
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/users')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{isEdit ? 'Edit User' : 'Create User'}</h1>
          <p className="text-muted-foreground">
            {isEdit ? 'Update user information and roles' : 'Add a new user to the system'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>Basic user details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    placeholder="Enter first name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    placeholder="Enter last name"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Enter username"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">
                  Password {isEdit ? '(leave blank to keep current)' : '*'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder={isEdit ? 'Enter new password' : 'Enter password'}
                  required={!isEdit}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Roles *</CardTitle>
              <CardDescription>Select user roles and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {roles.map((role) => (
                  <div key={role.id} className="flex items-start space-x-3">
                    <Checkbox
                      id={role.id}
                      checked={formData.roleIds.includes(role.id)}
                      onCheckedChange={() => handleRoleToggle(role.id)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor={role.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {role.displayName}
                      </label>
                      {role.description && (
                        <p className="text-sm text-muted-foreground">{role.description}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Button type="button" variant="outline" onClick={() => navigate('/admin/users')}>
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
                {isEdit ? 'Update User' : 'Create User'}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
