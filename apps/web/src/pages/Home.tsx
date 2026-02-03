import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const portals = [
  {
    title: 'Admin Portal',
    description: 'System configuration, user management, reports, and audit logs',
    href: '/admin',
    color: 'bg-purple-500',
  },
  {
    title: 'Academic Portal',
    description: 'Course management, scheduling, grading, and attendance',
    href: '/academic',
    color: 'bg-blue-500',
  },
  {
    title: 'Student Portal',
    description: 'Registration, grades, schedule, payments, and library',
    href: '/student',
    color: 'bg-green-500',
  },
  {
    title: 'Staff Portal',
    description: 'HR management, payroll, leave, and evaluations',
    href: '/staff',
    color: 'bg-yellow-500',
  },
  {
    title: 'Finance Portal',
    description: 'Billing, payments, budgeting, and financial reports',
    href: '/finance',
    color: 'bg-red-500',
  },
  {
    title: 'Library Portal',
    description: 'Catalog, borrowing, digital resources, and reservations',
    href: '/library',
    color: 'bg-teal-500',
  },
];

export function Home() {
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Hormuud University Management System
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Select a portal to get started
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {portals.map((portal) => (
          <Card key={portal.href} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className={`w-12 h-12 rounded-lg ${portal.color} mb-4`} />
              <CardTitle>{portal.title}</CardTitle>
              <CardDescription>{portal.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to={portal.href}>Enter Portal</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
