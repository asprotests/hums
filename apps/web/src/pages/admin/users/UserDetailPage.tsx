import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, UserCheck, UserX, Loader2, Clock, Mail, Phone, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { usersApi, type User, type AuditLog } from '@/lib/api/users';

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [activity, setActivity] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionType, setActionType] = useState<'activate' | 'deactivate' | null>(null);

  useEffect(() => {
    if (id) {
      loadUser();
      loadActivity();
    }
  }, [id]);

  const loadUser = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await usersApi.getUserById(id);
      if (response.success && response.data) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadActivity = async () => {
    if (!id) return;
    try {
      const response = await usersApi.getUserActivity(id, 1, 10);
      if (response.success && response.data) {
        setActivity(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load activity:', error);
    }
  };

  const handleActivateDeactivate = async () => {
    if (!id || !actionType) return;
    try {
      if (actionType === 'activate') {
        await usersApi.activateUser(id);
      } else {
        await usersApi.deactivateUser(id);
      }
      loadUser();
    } catch (error) {
      console.error(`Failed to ${actionType} user:`, error);
    } finally {
      setActionType(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">User not found</p>
        <Button variant="link" onClick={() => navigate('/admin/users')}>
          Go back to users
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/users')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-muted-foreground">User Details</p>
          </div>
        </div>
        <div className="flex gap-2">
          {user.isActive ? (
            <Button variant="outline" onClick={() => setActionType('deactivate')}>
              <UserX className="mr-2 h-4 w-4" />
              Deactivate
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setActionType('activate')}>
              <UserCheck className="mr-2 h-4 w-4" />
              Activate
            </Button>
          )}
          <Link to={`/admin/users/${id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>Basic user details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold">
                {user.firstName[0]}
                {user.lastName[0]}
              </div>
              <div>
                <p className="text-lg font-semibold">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-muted-foreground">@{user.username}</p>
              </div>
              <Badge className="ml-auto" variant={user.isActive ? 'success' : 'destructive'}>
                {user.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div className="space-y-3 pt-4">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{user.email}</span>
                {user.emailVerified && <Badge variant="secondary">Verified</Badge>}
              </div>
              {user.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>
                  Last login:{' '}
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleString()
                    : 'Never'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Roles & Permissions
            </CardTitle>
            <CardDescription>Assigned roles for this user</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user.roles.map((role) => (
                <div
                  key={role.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{role.displayName}</p>
                    <p className="text-sm text-muted-foreground">{role.name}</p>
                  </div>
                  <Badge variant="outline">{role.name}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>User's recent actions in the system</CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No recent activity</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">{log.action}</TableCell>
                    <TableCell>
                      {log.resource}
                      {log.resourceId && ` (${log.resourceId.slice(0, 8)}...)`}
                    </TableCell>
                    <TableCell>{log.ipAddress || 'N/A'}</TableCell>
                    <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Activate/Deactivate Confirmation Dialog */}
      <AlertDialog open={!!actionType} onOpenChange={() => setActionType(null)}>
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
