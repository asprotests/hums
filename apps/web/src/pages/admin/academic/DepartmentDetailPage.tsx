import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, FolderTree, GraduationCap, BookOpen, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { departmentsApi, type Department, type DepartmentStatistics } from '@/lib/api/departments';

export function DepartmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [department, setDepartment] = useState<Department | null>(null);
  const [statistics, setStatistics] = useState<DepartmentStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadDepartment();
      loadStatistics();
    }
  }, [id]);

  const loadDepartment = async () => {
    try {
      setLoading(true);
      const response = await departmentsApi.getDepartmentById(id!);
      if (response.success && response.data) {
        setDepartment(response.data);
      }
    } catch (error) {
      console.error('Failed to load department:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await departmentsApi.getStatistics(id!);
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!department) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Department not found</p>
        <Button variant="link" onClick={() => navigate('/admin/academic/departments')}>
          Back to Departments
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{department.name}</h1>
              <Badge variant="outline">{department.code}</Badge>
            </div>
            <p className="text-muted-foreground">
              {department.faculty?.name}
              {department.nameLocal && ` • ${department.nameLocal}`}
            </p>
          </div>
        </div>
        <Link to={`/admin/academic/departments/${department.id}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Edit Department
          </Button>
        </Link>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { title: 'Programs', value: statistics?.programCount || 0, icon: GraduationCap },
          { title: 'Courses', value: statistics?.courseCount || 0, icon: BookOpen },
          { title: 'Students', value: statistics?.studentCount || 0, icon: Users },
          { title: 'Employees', value: statistics?.employeeCount || 0, icon: Users },
        ].map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Department Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Code</p>
              <p className="font-medium">{department.code}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Faculty</p>
              <p className="font-medium">{department.faculty?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Head of Department</p>
              <p className="font-medium">{department.hod?.name || 'Not assigned'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Programs */}
        <Card>
          <CardHeader>
            <CardTitle>Programs</CardTitle>
            <CardDescription>{department.programs?.length || 0} program(s)</CardDescription>
          </CardHeader>
          <CardContent>
            {department.programs && department.programs.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {department.programs.map((program) => (
                    <TableRow key={program.id}>
                      <TableCell><Badge variant="outline">{program.code}</Badge></TableCell>
                      <TableCell>
                        <Link to={`/admin/academic/programs/${program.id}`} className="hover:underline">
                          {program.name}
                        </Link>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{program.type}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-4 text-muted-foreground">No programs yet</p>
            )}
            <div className="mt-4">
              <Link to={`/admin/academic/programs/new?departmentId=${department.id}`}>
                <Button variant="outline" className="w-full">Add Program</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Courses */}
      <Card>
        <CardHeader>
          <CardTitle>Courses</CardTitle>
          <CardDescription>{department.courses?.length || 0} course(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {department.courses && department.courses.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Credits</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {department.courses.map((course) => (
                  <TableRow key={course.id}>
                    <TableCell><Badge variant="outline">{course.code}</Badge></TableCell>
                    <TableCell>{course.name}</TableCell>
                    <TableCell>{course.credits}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-4 text-muted-foreground">No courses yet</p>
          )}
          <div className="mt-4">
            <Link to={`/admin/academic/courses/new?departmentId=${department.id}`}>
              <Button variant="outline" className="w-full">Add Course</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
