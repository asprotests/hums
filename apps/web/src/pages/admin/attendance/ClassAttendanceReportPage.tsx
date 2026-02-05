import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Users, BarChart3, AlertTriangle, CalendarDays, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { attendanceApi, type ClassAttendanceReport, type StudentBelowThreshold } from '@/lib/api/attendance';

export function ClassAttendanceReportPage() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();

  const [report, setReport] = useState<ClassAttendanceReport | null>(null);
  const [studentsAtRisk, setStudentsAtRisk] = useState<StudentBelowThreshold[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (classId) {
      loadReport();
    }
  }, [classId]);

  const loadReport = async () => {
    if (!classId) return;

    try {
      setLoading(true);
      const [reportData, atRiskData] = await Promise.all([
        attendanceApi.getClassAttendanceReport(classId),
        attendanceApi.getStudentsBelowThreshold(classId, 75),
      ]);
      setReport(reportData);
      setStudentsAtRisk(atRiskData);
    } catch (error) {
      console.error('Failed to load report:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Report not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold">Class Attendance Report</h1>
          <p className="text-muted-foreground">
            {report.class.course.code} - {report.class.course.name} ({report.class.name})
          </p>
        </div>
        <Link to={`/admin/attendance/class/${classId}/mark`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Mark Attendance
          </Button>
        </Link>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{report.statistics.totalStudents}</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{report.statistics.totalSessions}</p>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BarChart3 className={`h-5 w-5 ${getAttendanceColor(report.statistics.averageAttendance)}`} />
              <div>
                <p className={`text-2xl font-bold ${getAttendanceColor(report.statistics.averageAttendance)}`}>
                  {report.statistics.averageAttendance}%
                </p>
                <p className="text-sm text-muted-foreground">Average Attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{report.statistics.studentsAtRisk}</p>
                <p className="text-sm text-muted-foreground">Students at Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Breakdown</CardTitle>
          <CardDescription>Overall attendance statistics for this class</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Present</span>
                <span className="font-medium text-green-600">{report.statistics.present}</span>
              </div>
              <Progress value={(report.statistics.present / (report.statistics.totalStudents * report.statistics.totalSessions)) * 100} className="h-2 bg-green-100" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Absent</span>
                <span className="font-medium text-red-600">{report.statistics.absent}</span>
              </div>
              <Progress value={(report.statistics.absent / (report.statistics.totalStudents * report.statistics.totalSessions)) * 100} className="h-2 bg-red-100" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Late</span>
                <span className="font-medium text-yellow-600">{report.statistics.late}</span>
              </div>
              <Progress value={(report.statistics.late / (report.statistics.totalStudents * report.statistics.totalSessions)) * 100} className="h-2 bg-yellow-100" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Excused</span>
                <span className="font-medium text-blue-600">{report.statistics.excused}</span>
              </div>
              <Progress value={(report.statistics.excused / (report.statistics.totalStudents * report.statistics.totalSessions)) * 100} className="h-2 bg-blue-100" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students at Risk */}
      {studentsAtRisk.length > 0 && (
        <Card className="border-orange-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Students Below 75% Threshold
            </CardTitle>
            <CardDescription>
              These students are at risk due to low attendance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Present</TableHead>
                  <TableHead>Absent</TableHead>
                  <TableHead>Late</TableHead>
                  <TableHead>Excused</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentsAtRisk.map((student) => (
                  <TableRow key={student.studentId}>
                    <TableCell className="font-medium">{student.studentName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={student.percentage}
                          className={`h-2 w-20 ${getProgressColor(student.percentage)}`}
                        />
                        <span className={`font-medium ${getAttendanceColor(student.percentage)}`}>
                          {student.percentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-green-600">{student.present}</TableCell>
                    <TableCell className="text-red-600">{student.absent}</TableCell>
                    <TableCell className="text-yellow-600">{student.late}</TableCell>
                    <TableCell className="text-blue-600">{student.excused}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Class Info */}
      <Card>
        <CardHeader>
          <CardTitle>Class Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Course</p>
              <p className="font-medium">{report.class.course.code} - {report.class.course.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Semester</p>
              <p className="font-medium">{report.class.semester.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lecturer</p>
              <p className="font-medium">
                {report.class.lecturer?.user.firstName} {report.class.lecturer?.user.lastName}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sessions Conducted</p>
              <p className="font-medium">{report.sessions.length} sessions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Sessions */}
      {report.sessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Recent Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {report.sessions.slice(0, 20).map((session, index) => (
                <Link key={index} to={`/admin/attendance/class/${classId}/mark?date=${session.split('T')[0]}`}>
                  <Badge variant="outline" className="cursor-pointer hover:bg-muted">
                    {new Date(session).toLocaleDateString()}
                  </Badge>
                </Link>
              ))}
              {report.sessions.length > 20 && (
                <Badge variant="secondary">+{report.sessions.length - 20} more</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
