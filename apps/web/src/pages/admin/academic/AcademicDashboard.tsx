import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, FolderTree, GraduationCap, BookOpen, Calendar, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { facultiesApi } from '@/lib/api/faculties';
import { departmentsApi } from '@/lib/api/departments';
import { programsApi } from '@/lib/api/programs';
import { coursesApi } from '@/lib/api/courses';
import { academicYearsApi, semestersApi } from '@/lib/api/academicCalendar';

interface DashboardStats {
  faculties: number;
  departments: number;
  programs: number;
  courses: number;
}

export function AcademicDashboard() {
  const [stats, setStats] = useState<DashboardStats>({ faculties: 0, departments: 0, programs: 0, courses: 0 });
  const [currentYear, setCurrentYear] = useState<string | null>(null);
  const [currentSemester, setCurrentSemester] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [facultiesRes, departmentsRes, programsRes, coursesRes, yearRes, semesterRes] = await Promise.all([
        facultiesApi.getFaculties({ limit: 1 }),
        departmentsApi.getDepartments({ limit: 1 }),
        programsApi.getPrograms({ limit: 1 }),
        coursesApi.getCourses({ limit: 1 }),
        academicYearsApi.getCurrentAcademicYear(),
        semestersApi.getCurrentSemester(),
      ]);

      setStats({
        faculties: facultiesRes.data?.pagination.total || 0,
        departments: departmentsRes.data?.pagination.total || 0,
        programs: programsRes.data?.pagination.total || 0,
        courses: coursesRes.data?.pagination.total || 0,
      });

      if (yearRes.success && yearRes.data) {
        setCurrentYear(yearRes.data.name);
      }

      if (semesterRes.success && semesterRes.data) {
        setCurrentSemester(semesterRes.data.name);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Faculties',
      value: stats.faculties,
      description: 'Academic faculties',
      icon: Building2,
      href: '/admin/academic/faculties',
      color: 'text-blue-600',
    },
    {
      title: 'Departments',
      value: stats.departments,
      description: 'Academic departments',
      icon: FolderTree,
      href: '/admin/academic/departments',
      color: 'text-green-600',
    },
    {
      title: 'Programs',
      value: stats.programs,
      description: 'Degree programs',
      icon: GraduationCap,
      href: '/admin/academic/programs',
      color: 'text-purple-600',
    },
    {
      title: 'Courses',
      value: stats.courses,
      description: 'Course catalog',
      icon: BookOpen,
      href: '/admin/academic/courses',
      color: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Academic Structure</h1>
        <p className="text-muted-foreground">Manage faculties, departments, programs, and courses</p>
      </div>

      {/* Current Academic Period */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Current Academic Period</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Academic Year</p>
              <p className="text-xl font-semibold">
                {loading ? '...' : currentYear || 'Not set'}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Semester</p>
              <p className="text-xl font-semibold">
                {loading ? '...' : currentSemester || 'Not set'}
              </p>
            </div>
            <div className="ml-auto">
              <Link to="/admin/academic/calendar">
                <Button variant="outline">
                  Manage Calendar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Link key={card.title} to={card.href}>
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? '...' : card.value}
                </div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks for academic structure management</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link to="/admin/academic/faculties/new">
              <Button variant="outline" className="w-full justify-start">
                <Building2 className="mr-2 h-4 w-4" />
                Add Faculty
              </Button>
            </Link>
            <Link to="/admin/academic/departments/new">
              <Button variant="outline" className="w-full justify-start">
                <FolderTree className="mr-2 h-4 w-4" />
                Add Department
              </Button>
            </Link>
            <Link to="/admin/academic/programs/new">
              <Button variant="outline" className="w-full justify-start">
                <GraduationCap className="mr-2 h-4 w-4" />
                Add Program
              </Button>
            </Link>
            <Link to="/admin/academic/courses/new">
              <Button variant="outline" className="w-full justify-start">
                <BookOpen className="mr-2 h-4 w-4" />
                Add Course
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Hierarchy Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Academic Hierarchy</CardTitle>
          <CardDescription>Structure overview: Faculty &rarr; Department &rarr; Program</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="bg-blue-50">Faculty</Badge>
            <span className="text-muted-foreground">&rarr;</span>
            <Badge variant="outline" className="bg-green-50">Department</Badge>
            <span className="text-muted-foreground">&rarr;</span>
            <Badge variant="outline" className="bg-purple-50">Program</Badge>
            <span className="text-muted-foreground">&rarr;</span>
            <Badge variant="outline" className="bg-orange-50">Courses (via Curriculum)</Badge>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Faculties contain multiple departments. Each department offers programs (degrees).
            Programs have a curriculum that includes courses organized by semester.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
