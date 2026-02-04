import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Users, Shield, LayoutDashboard, Activity } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { UserListPage, UserFormPage, UserDetailPage } from '@/pages/admin/users';
import { RoleListPage, RoleFormPage } from '@/pages/admin/roles';

function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Portal</h1>
        <p className="text-muted-foreground">System configuration and management</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Active system users</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Active departments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">Healthy</div>
            <p className="text-xs text-muted-foreground">All services running</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Audit Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">Today's entries</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link to="/admin/users">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>Manage users, assign roles, and control access</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Link to="/admin/roles">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role Management
              </CardTitle>
              <CardDescription>Configure roles and permissions</CardDescription>
            </CardHeader>
          </Card>
        </Link>
        <Card className="opacity-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Audit Logs
            </CardTitle>
            <CardDescription>View system activity and audit trails (Coming Soon)</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}

const navItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { path: '/admin/users', label: 'Users', icon: Users },
  { path: '/admin/roles', label: 'Roles', icon: Shield },
];

function AdminNav() {
  const location = useLocation();

  return (
    <nav className="flex items-center space-x-1 mb-6 border-b pb-4">
      {navItems.map((item) => {
        const isActive = item.exact
          ? location.pathname === item.path
          : location.pathname.startsWith(item.path);

        return (
          <Link key={item.path} to={item.path}>
            <Button
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              className={cn('gap-2', isActive && 'pointer-events-none')}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminPortal() {
  return (
    <div>
      <AdminNav />
      <Routes>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<UserListPage />} />
        <Route path="users/new" element={<UserFormPage />} />
        <Route path="users/:id" element={<UserDetailPage />} />
        <Route path="users/:id/edit" element={<UserFormPage />} />
        <Route path="roles" element={<RoleListPage />} />
        <Route path="roles/new" element={<RoleFormPage />} />
        <Route path="roles/:id/edit" element={<RoleFormPage />} />
      </Routes>
    </div>
  );
}
