import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building,
  Users,
  BookOpen,
  GraduationCap,
  AlertTriangle,
  BarChart3,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { deanDashboardApi, type DeanDashboard } from '@/lib/api/hodDashboard';

export function DeanDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<DeanDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await deanDashboardApi.getDashboard();
      if (result.success) {
        setDashboard(result.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAttendanceBadge = (rate: number) => {
    if (rate >= 80) return 'default';
    if (rate >= 60) return 'secondary';
    return 'destructive';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-destructive">{error}</p>
        <Button onClick={loadDashboard} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const avgAttendance = dashboard.overallStats.averageAttendance;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Faculty Overview</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{dashboard.faculty.code}</Badge>
            <span className="text-muted-foreground">{dashboard.faculty.name}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {dashboard.currentSemester.name}
          </p>
        </div>
        <Link to="/academic/reports">
          <Button variant="outline">
            <BarChart3 className="mr-2 h-4 w-4" />
            Faculty Reports
          </Button>
        </Link>
      </div>

      {/* Overall Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.overallStats.totalDepartments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Faculty Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.overallStats.totalFaculty}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.overallStats.totalStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.overallStats.totalClasses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Attendance</CardTitle>
            {avgAttendance >= 75 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getAttendanceColor(avgAttendance)}`}>
              {avgAttendance}%
            </div>
            <Progress value={avgAttendance} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {dashboard.alerts.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Faculty Alerts
            </CardTitle>
            <CardDescription>
              {dashboard.alerts.length} issue(s) across departments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.alerts.map((alert, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50"
                >
                  <AlertTriangle className="h-4 w-4 text-destructive mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{alert.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.departmentName} • {alert.type}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Departments Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Department Comparison</CardTitle>
          <CardDescription>
            Performance metrics across all departments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Department</TableHead>
                <TableHead>HOD</TableHead>
                <TableHead className="text-center">Faculty</TableHead>
                <TableHead className="text-center">Students</TableHead>
                <TableHead className="text-center">Classes</TableHead>
                <TableHead className="text-center">Attendance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dashboard.departments.map((dept) => (
                <TableRow key={dept.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{dept.name}</p>
                      <p className="text-xs text-muted-foreground">{dept.code}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {dept.hodName || (
                      <span className="text-muted-foreground italic">Not assigned</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{dept.facultyCount}</TableCell>
                  <TableCell className="text-center">{dept.studentCount}</TableCell>
                  <TableCell className="text-center">{dept.classCount}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={getAttendanceBadge(dept.averageAttendance)}>
                      {dept.averageAttendance}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Department Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Department Details</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dashboard.departments.map((dept) => (
            <Card key={dept.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{dept.name}</CardTitle>
                    <CardDescription>{dept.code}</CardDescription>
                  </div>
                  <Badge variant={getAttendanceBadge(dept.averageAttendance)}>
                    {dept.averageAttendance}%
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Head of Department</span>
                    <span className="font-medium">
                      {dept.hodName || (
                        <span className="text-muted-foreground italic">Not assigned</span>
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t">
                    <div>
                      <p className="text-lg font-bold">{dept.facultyCount}</p>
                      <p className="text-xs text-muted-foreground">Faculty</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{dept.studentCount}</p>
                      <p className="text-xs text-muted-foreground">Students</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold">{dept.classCount}</p>
                      <p className="text-xs text-muted-foreground">Classes</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Average Attendance</span>
                      <span className={getAttendanceColor(dept.averageAttendance)}>
                        {dept.averageAttendance}%
                      </span>
                    </div>
                    <Progress value={dept.averageAttendance} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DeanDashboardPage;
