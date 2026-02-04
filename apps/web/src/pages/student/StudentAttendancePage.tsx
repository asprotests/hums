import { useState, useEffect } from 'react';
import { Calendar, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { studentPortalApi, type AttendanceSummary } from '@/lib/api/studentPortal';

function getAttendanceColor(rate: number): string {
  if (rate >= 80) return 'text-green-600';
  if (rate >= 75) return 'text-amber-600';
  return 'text-destructive';
}

function getProgressColor(rate: number): string {
  if (rate >= 80) return 'bg-green-600';
  if (rate >= 75) return 'bg-amber-600';
  return 'bg-destructive';
}

export function StudentAttendancePage() {
  const [attendance, setAttendance] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const response = await studentPortalApi.getAttendance();
      if (response.success && response.data) {
        setAttendance(response.data);
      }
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const lowAttendanceClasses = attendance?.byClass.filter(
    (c) => c.stats.attendanceRate < 75
  ) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Attendance Records</h1>
        <p className="text-muted-foreground">Track your class attendance</p>
      </div>

      {/* Warning for Low Attendance */}
      {lowAttendanceClasses.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Low Attendance Warning</AlertTitle>
          <AlertDescription>
            You have {lowAttendanceClasses.length} course(s) with attendance below 75%.
            Please improve your attendance to avoid academic penalties.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overall Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getAttendanceColor(attendance?.summary.attendanceRate || 0)}`}>
              {attendance?.summary.attendanceRate || 0}%
            </div>
            <Progress
              value={attendance?.summary.attendanceRate || 0}
              className="mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Present
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {attendance?.summary.present || 0}
            </div>
            <p className="text-xs text-muted-foreground">classes attended</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              Absent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">
              {attendance?.summary.absent || 0}
            </div>
            <p className="text-xs text-muted-foreground">classes missed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-600" />
              Late
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-600">
              {attendance?.summary.late || 0}
            </div>
            <p className="text-xs text-muted-foreground">late arrivals</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Excused</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {attendance?.summary.excused || 0}
            </div>
            <p className="text-xs text-muted-foreground">excused absences</p>
          </CardContent>
        </Card>
      </div>

      {/* Attendance by Course */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance by Course</CardTitle>
          <CardDescription>Your attendance record for each enrolled course</CardDescription>
        </CardHeader>
        <CardContent>
          {!attendance?.byClass || attendance.byClass.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No attendance records found</p>
            </div>
          ) : (
            <div className="space-y-6">
              {attendance.byClass.map((classAttendance, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">
                        {classAttendance.class?.course.code} - {classAttendance.class?.course.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {classAttendance.class?.semester}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${getAttendanceColor(classAttendance.stats.attendanceRate)}`}>
                        {classAttendance.stats.attendanceRate}%
                      </p>
                      {classAttendance.stats.attendanceRate < 75 && (
                        <Badge variant="destructive">Below Threshold</Badge>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <Progress
                      value={classAttendance.stats.attendanceRate}
                      className={`h-3 ${getProgressColor(classAttendance.stats.attendanceRate)}`}
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-green-600">{classAttendance.stats.present}</p>
                      <p className="text-xs text-muted-foreground">Present</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-destructive">{classAttendance.stats.absent}</p>
                      <p className="text-xs text-muted-foreground">Absent</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">{classAttendance.stats.late}</p>
                      <p className="text-xs text-muted-foreground">Late</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{classAttendance.stats.excused}</p>
                      <p className="text-xs text-muted-foreground">Excused</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance Policy Note */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Attendance Policy</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <ul className="list-disc list-inside space-y-1">
            <li>Minimum 75% attendance is required to sit for final examinations</li>
            <li>Students with attendance below 75% may face academic penalties</li>
            <li>Medical absences must be reported within 48 hours with documentation</li>
            <li>Late arrivals (more than 15 minutes) are recorded separately</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
