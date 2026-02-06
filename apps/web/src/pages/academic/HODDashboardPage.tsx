import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  Users,
  BookOpen,
  GraduationCap,
  AlertTriangle,
  BarChart3,
  UserPlus,
  Eye,
  Clock,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  hodDashboardApi,
  type HODDashboard,
  type ClassOverview,
} from '@/lib/api/hodDashboard';

export function HODDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<HODDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Assign lecturer dialog
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassOverview | null>(null);
  const [selectedLecturerId, setSelectedLecturerId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await hodDashboardApi.getDashboard();
      if (result.success) {
        setDashboard(result.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignLecturer = async () => {
    if (!selectedClass || !selectedLecturerId) return;

    try {
      setAssigning(true);
      await hodDashboardApi.assignLecturerToClass(selectedClass.id, selectedLecturerId);
      setAssignDialogOpen(false);
      setSelectedClass(null);
      setSelectedLecturerId('');
      await loadDashboard();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to assign lecturer');
    } finally {
      setAssigning(false);
    }
  };

  const openAssignDialog = (cls: ClassOverview) => {
    setSelectedClass(cls);
    setSelectedLecturerId(cls.lecturerId || '');
    setAssignDialogOpen(true);
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'LOW_ATTENDANCE':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'MISSING_ATTENDANCE':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Department Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{dashboard.department.code}</Badge>
            <span className="text-muted-foreground">{dashboard.department.name}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {dashboard.department.facultyName} • {dashboard.currentSemester.name}
          </p>
        </div>
        <Link to="/academic/reports">
          <Button variant="outline">
            <BarChart3 className="mr-2 h-4 w-4" />
            View Reports
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Faculty Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.facultyCount}</div>
            <p className="text-xs text-muted-foreground">Active lecturers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.courseCount}</div>
            <p className="text-xs text-muted-foreground">Department courses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.studentCount}</div>
            <p className="text-xs text-muted-foreground">Enrolled this semester</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Classes</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.classCount}</div>
            <p className="text-xs text-muted-foreground">Active classes</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {dashboard.attendanceAlerts.length > 0 && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Attention Required
            </CardTitle>
            <CardDescription>
              {dashboard.attendanceAlerts.length} issue(s) need your attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.attendanceAlerts.map((alert, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-3 rounded-lg border bg-muted/50"
                >
                  {getAlertIcon(alert.alertType)}
                  <div className="flex-1">
                    <p className="font-medium text-sm">{alert.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {alert.className} • {alert.courseName} • {alert.lecturerName}
                    </p>
                  </div>
                  <Link to={`/academic/classes/${alert.classId}`}>
                    <Button size="sm" variant="outline">
                      View
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Classes Overview and Faculty Workload */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Classes Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Classes Overview</CardTitle>
              <CardDescription>
                All classes in the department
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {dashboard.classesOverview.map((cls) => (
                <div
                  key={cls.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{cls.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {cls.courseCode}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {cls.lecturerName || 'No lecturer assigned'}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs">
                      <span>
                        <Users className="inline h-3 w-3 mr-1" />
                        {cls.enrolledCount}/{cls.capacity}
                      </span>
                      <span className={getAttendanceColor(cls.attendanceRate)}>
                        Att: {cls.attendanceRate}%
                      </span>
                      <span>
                        Grades: {cls.gradingProgress}%
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openAssignDialog(cls)}
                      title="Assign Lecturer"
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                    <Link to={`/academic/classes/${cls.id}`}>
                      <Button size="sm" variant="ghost">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Faculty Workload */}
        <Card>
          <CardHeader>
            <CardTitle>Faculty Workload</CardTitle>
            <CardDescription>
              Lecturer assignments and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lecturer</TableHead>
                  <TableHead className="text-center">Classes</TableHead>
                  <TableHead className="text-center">Students</TableHead>
                  <TableHead className="text-center">Attendance</TableHead>
                  <TableHead className="text-center">Grading</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.facultyWorkload.map((faculty) => (
                  <TableRow key={faculty.lecturerId}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{faculty.lecturerName}</p>
                        <p className="text-xs text-muted-foreground">{faculty.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{faculty.classCount}</TableCell>
                    <TableCell className="text-center">{faculty.totalStudents}</TableCell>
                    <TableCell className="text-center">
                      <span className={getAttendanceColor(faculty.averageAttendance)}>
                        {faculty.averageAttendance}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Progress value={faculty.gradingProgress} className="w-16 mx-auto" />
                      <span className="text-xs">{faculty.gradingProgress}%</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Grading Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Grading Progress</CardTitle>
          <CardDescription>
            Track grade component completion across all classes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dashboard.gradingProgress.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No grading data available</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class</TableHead>
                  <TableHead>Lecturer</TableHead>
                  <TableHead>Components</TableHead>
                  <TableHead className="text-right">Progress</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboard.gradingProgress.map((report) => (
                  <TableRow key={report.classId}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{report.className}</p>
                        <p className="text-xs text-muted-foreground">{report.courseName}</p>
                      </div>
                    </TableCell>
                    <TableCell>{report.lecturerName}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {report.components.map((comp, idx) => (
                          <Badge
                            key={idx}
                            variant={comp.isOverdue ? 'destructive' : comp.progress === 100 ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {comp.name}: {comp.progress}%
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Progress value={report.overallProgress} className="w-20" />
                        <span className="text-sm font-medium">{report.overallProgress}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Assign Lecturer Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Lecturer</DialogTitle>
            <DialogDescription>
              Assign a lecturer to {selectedClass?.name} ({selectedClass?.courseCode})
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select value={selectedLecturerId} onValueChange={setSelectedLecturerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a lecturer" />
              </SelectTrigger>
              <SelectContent>
                {dashboard.facultyWorkload.map((faculty) => (
                  <SelectItem key={faculty.lecturerId} value={faculty.lecturerId}>
                    {faculty.lecturerName} ({faculty.classCount} classes)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignLecturer} disabled={assigning || !selectedLecturerId}>
              {assigning ? 'Assigning...' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default HODDashboardPage;
