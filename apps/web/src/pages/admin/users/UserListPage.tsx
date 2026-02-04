import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Eye, UserCheck, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { usersApi, type User, type PaginatedUsers } from '@/lib/api/users';
import { rolesApi, type Role } from '@/lib/api/roles';

export function UserListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [pagination, setPagination] = useState<PaginatedUsers['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [actionUserId, setActionUserId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'activate' | 'deactivate' | null>(null);

  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';
  const isActive = searchParams.get('isActive');

  useEffect(() => {
    loadUsers();
    loadRoles();
  }, [page, search, role, isActive]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await usersApi.getUsers({
        page,
        limit: 10,
        search: search || undefined,
        role: role || undefined,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      });
      if (response.success && response.data) {
        setUsers(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleRoleFilter = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set('role', value);
    } else {
      params.delete('role');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleStatusFilter = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set('isActive', value);
    } else {
      params.delete('isActive');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
  };

  const handleDelete = async () => {
    if (!deleteUserId) return;
    try {
      await usersApi.deleteUser(deleteUserId);
      loadUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    } finally {
      setDeleteUserId(null);
    }
  };

  const handleActivateDeactivate = async () => {
    if (!actionUserId || !actionType) return;
    try {
      if (actionType === 'activate') {
        await usersApi.activateUser(actionUserId);
      } else {
        await usersApi.deactivateUser(actionUserId);
      }
      loadUsers();
    } catch (error) {
      console.error(`Failed to ${actionType} user:`, error);
    } finally {
      setActionUserId(null);
      setActionType(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage system users and their roles</p>
        </div>
        <Link to="/admin/users/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or username..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={role || 'all'} onValueChange={handleRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.name}>
                    {r.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={isActive || 'all'} onValueChange={handleStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Roles</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No users found
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">
                          {user.firstName} {user.lastName}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.username}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.map((r) => (
                              <Badge key={r.id} variant="secondary">
                                {r.displayName}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.isActive ? 'success' : 'destructive'}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString()
                            : 'Never'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link to={`/admin/users/${user.id}`}>
                              <Button variant="ghost" size="icon">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link to={`/admin/users/${user.id}/edit`}>
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            {user.isActive ? (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setActionUserId(user.id);
                                  setActionType('deactivate');
                                }}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setActionUserId(user.id);
                                  setActionType('activate');
                                }}
                              >
                                <UserCheck className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteUserId(user.id)}
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

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total} users
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will deactivate the user. They will no longer be able to access the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activate/Deactivate Confirmation Dialog */}
      <AlertDialog
        open={!!actionUserId && !!actionType}
        onOpenChange={() => {
          setActionUserId(null);
          setActionType(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'activate' ? 'Activate User' : 'Deactivate User'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'activate'
                ? 'This will allow the user to access the system again.'
                : 'This will prevent the user from accessing the system.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleActivateDeactivate}>
              {actionType === 'activate' ? 'Activate' : 'Deactivate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
