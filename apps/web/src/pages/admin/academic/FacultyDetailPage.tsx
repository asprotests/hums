import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Building2, FolderTree, GraduationCap, BookOpen, Users } from 'lucide-react';
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
import { facultiesApi, type Faculty, type FacultyStatistics } from '@/lib/api/faculties';

export function FacultyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [faculty, setFaculty] = useState<Faculty | null>(null);
  const [statistics, setStatistics] = useState<FacultyStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadFaculty();
      loadStatistics();
    }
  }, [id]);

  const loadFaculty = async () => {
    try {
      setLoading(true);
      const response = await facultiesApi.getFacultyById(id!);
      if (response.success && response.data) {
        setFaculty(response.data);
      }
    } catch (error) {
      console.error('Failed to load faculty:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await facultiesApi.getStatistics(id!);
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

  if (!faculty) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Faculty not found</p>
        <Button variant="link" onClick={() => navigate('/admin/academic/faculties')}>
          Back to Faculties
        </Button>
      </div>
    );
  }

  const statCards = [
    { title: 'Departments', value: statistics?.departmentCount || 0, icon: FolderTree },
    { title: 'Programs', value: statistics?.programCount || 0, icon: GraduationCap },
    { title: 'Courses', value: statistics?.courseCount || 0, icon: BookOpen },
    { title: 'Students', value: statistics?.studentCount || 0, icon: Users },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{faculty.name}</h1>
              <Badge variant="outline">{faculty.code}</Badge>
            </div>
            {faculty.nameLocal && (
              <p className="text-muted-foreground">{faculty.nameLocal}</p>
            )}
          </div>
        </div>
        <Link to={`/admin/academic/faculties/${faculty.id}/edit`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Edit Faculty
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((stat) => (
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

      {/* Faculty Details */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Faculty Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Code</p>
              <p className="font-medium">{faculty.code}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Name (English)</p>
              <p className="font-medium">{faculty.name}</p>
            </div>
            {faculty.nameLocal && (
              <div>
                <p className="text-sm text-muted-foreground">Name (Somali)</p>
                <p className="font-medium">{faculty.nameLocal}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Dean</p>
              <p className="font-medium">{faculty.dean?.name || 'Not assigned'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Departments List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderTree className="h-5 w-5" />
              Departments
            </CardTitle>
            <CardDescription>
              {faculty.departments?.length || 0} department(s) in this faculty
            </CardDescription>
          </CardHeader>
          <CardContent>
            {faculty.departments && faculty.departments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Programs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faculty.departments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell>
                        <Badge variant="outline">{dept.code}</Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/admin/academic/departments/${dept.id}`}
                          className="hover:underline"
                        >
                          {dept.name}
                        </Link>
                      </TableCell>
                      <TableCell>{dept.programCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-center py-4 text-muted-foreground">No departments yet</p>
            )}
            <div className="mt-4">
              <Link to={`/admin/academic/departments/new?facultyId=${faculty.id}`}>
                <Button variant="outline" className="w-full">
                  Add Department
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
