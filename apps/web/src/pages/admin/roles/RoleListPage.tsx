import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Shield, Users } from 'lucide-react';
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
import { rolesApi, type Role } from '@/lib/api/roles';

export function RoleListPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteRoleId, setDeleteRoleId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const response = await rolesApi.getRoles();
      if (response.success && response.data) {
        setRoles(response.data);
      }
    } catch (error) {
      console.error('Failed to load roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteRoleId) return;
    try {
      setDeleteError(null);
      await rolesApi.deleteRole(deleteRoleId);
      loadRoles();
      setDeleteRoleId(null);
    } catch (error: any) {
      console.error('Failed to delete role:', error);
      setDeleteError(error.response?.data?.message || 'Failed to delete role');
    }
  };

  const roleToDelete = roles.find((r) => r.id === deleteRoleId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Role Management</h1>
          <p className="text-muted-foreground">Manage roles and permissions</p>
        </div>
        <Link to="/admin/roles/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Role
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roles</CardTitle>
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
                  <TableHead>Role</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No roles found
                    </TableCell>
                  </TableRow>
                ) : (
                  roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{role.displayName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-muted px-1 py-0.5 rounded">
                          {role.name}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{role.userCount}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{role.permissions.length} permissions</Badge>
                      </TableCell>
                      <TableCell>
                        {role.isSystem ? (
                          <Badge variant="outline">System</Badge>
                        ) : (
                          <Badge variant="secondary">Custom</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link to={`/admin/roles/${role.id}/edit`}>
                            <Button variant="ghost" size="icon" disabled={role.isSystem}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteRoleId(role.id)}
                            disabled={role.isSystem}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteRoleId} onOpenChange={() => {
        setDeleteRoleId(null);
        setDeleteError(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Role</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the role "{roleToDelete?.displayName}"? This action cannot be undone.
              {roleToDelete && roleToDelete.userCount > 0 && (
                <span className="block mt-2 text-destructive">
                  Warning: This role is assigned to {roleToDelete.userCount} user(s).
                </span>
              )}
            </AlertDialogDescription>
            {deleteError && (
              <div className="mt-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {deleteError}
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
