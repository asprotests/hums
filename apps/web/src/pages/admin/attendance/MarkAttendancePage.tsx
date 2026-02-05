import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Save, Users, Calendar, CheckCircle2, XCircle, Clock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { attendanceApi, type AttendanceStatus, type ClassAttendanceItem } from '@/lib/api/attendance';
import { classesApi, type ClassEntity } from '@/lib/api/classes';
import { cn } from '@/lib/utils';

interface AttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
  remarks: string;
}

export function MarkAttendancePage() {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [classInfo, setClassInfo] = useState<ClassEntity | null>(null);
  const [attendance, setAttendance] = useState<ClassAttendanceItem[]>([]);
  const [entries, setEntries] = useState<Map<string, AttendanceEntry>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(searchParams.get('date') || new Date().toISOString().split('T')[0]);
  const [remarksDialog, setRemarksDialog] = useState<{ studentId: string; name: string } | null>(null);
  const [tempRemarks, setTempRemarks] = useState('');

  useEffect(() => {
    if (classId) {
      loadData();
    }
  }, [classId, date]);

  const loadData = async () => {
    if (!classId) return;

    try {
      setLoading(true);
      const [classData, attendanceData] = await Promise.all([
        classesApi.getClassById(classId),
        attendanceApi.getClassAttendance(classId, date),
      ]);

      if (classData.success && classData.data) {
        setClassInfo(classData.data);
      }

      setAttendance(attendanceData);

      // Initialize entries from existing attendance or with default PRESENT
      const newEntries = new Map<string, AttendanceEntry>();
      attendanceData.forEach(item => {
        newEntries.set(item.studentId, {
          studentId: item.studentId,
          status: item.attendance?.status || 'PRESENT',
          remarks: item.attendance?.remarks || '',
        });
      });
      setEntries(newEntries);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = (studentId: string, status: AttendanceStatus) => {
    setEntries(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(studentId);
      newMap.set(studentId, {
        studentId,
        status,
        remarks: existing?.remarks || '',
      });
      return newMap;
    });
  };

  const updateRemarks = (studentId: string, remarks: string) => {
    setEntries(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(studentId);
      if (existing) {
        newMap.set(studentId, { ...existing, remarks });
      }
      return newMap;
    });
  };

  const markAll = (status: AttendanceStatus) => {
    setEntries(prev => {
      const newMap = new Map(prev);
      attendance.forEach(item => {
        const existing = newMap.get(item.studentId);
        newMap.set(item.studentId, {
          studentId: item.studentId,
          status,
          remarks: existing?.remarks || '',
        });
      });
      return newMap;
    });
  };

  const handleSave = async () => {
    if (!classId) return;

    try {
      setSaving(true);
      const records = Array.from(entries.values()).map(e => ({
        studentId: e.studentId,
        status: e.status,
        remarks: e.remarks || undefined,
      }));

      await attendanceApi.markAttendance(classId, { date, records });
      navigate(`/admin/attendance/class/${classId}`);
    } catch (error) {
      console.error('Failed to save attendance:', error);
    } finally {
      setSaving(false);
    }
  };

  const getSummary = () => {
    const values = Array.from(entries.values());
    return {
      present: values.filter(e => e.status === 'PRESENT').length,
      absent: values.filter(e => e.status === 'ABSENT').length,
      late: values.filter(e => e.status === 'LATE').length,
      excused: values.filter(e => e.status === 'EXCUSED').length,
    };
  };

  const summary = getSummary();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
          <h1 className="text-3xl font-bold">Mark Attendance</h1>
          <p className="text-muted-foreground">
            {classInfo?.course.code} - {classInfo?.course.name} ({classInfo?.name})
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{summary.present}</p>
                <p className="text-sm text-muted-foreground">Present</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{summary.absent}</p>
                <p className="text-sm text-muted-foreground">Absent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{summary.late}</p>
                <p className="text-sm text-muted-foreground">Late</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{summary.excused}</p>
                <p className="text-sm text-muted-foreground">Excused</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Student Attendance
              </CardTitle>
              <CardDescription>
                Mark attendance for each student
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-[180px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={() => markAll('PRESENT')}>
              Mark All Present
            </Button>
            <Button variant="outline" size="sm" onClick={() => markAll('ABSENT')}>
              Mark All Absent
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No students enrolled in this class
                  </TableCell>
                </TableRow>
              ) : (
                attendance.map((item, index) => {
                  const entry = entries.get(item.studentId);
                  return (
                    <TableRow key={item.studentId}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{item.student.studentId}</TableCell>
                      <TableCell>
                        {item.student.user.firstName} {item.student.user.lastName}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant={entry?.status === 'PRESENT' ? 'default' : 'outline'}
                            className={cn(
                              'w-8 h-8 p-0',
                              entry?.status === 'PRESENT' && 'bg-green-500 hover:bg-green-600'
                            )}
                            onClick={() => updateStatus(item.studentId, 'PRESENT')}
                          >
                            P
                          </Button>
                          <Button
                            size="sm"
                            variant={entry?.status === 'ABSENT' ? 'default' : 'outline'}
                            className={cn(
                              'w-8 h-8 p-0',
                              entry?.status === 'ABSENT' && 'bg-red-500 hover:bg-red-600'
                            )}
                            onClick={() => updateStatus(item.studentId, 'ABSENT')}
                          >
                            A
                          </Button>
                          <Button
                            size="sm"
                            variant={entry?.status === 'LATE' ? 'default' : 'outline'}
                            className={cn(
                              'w-8 h-8 p-0',
                              entry?.status === 'LATE' && 'bg-yellow-500 hover:bg-yellow-600'
                            )}
                            onClick={() => updateStatus(item.studentId, 'LATE')}
                          >
                            L
                          </Button>
                          <Button
                            size="sm"
                            variant={entry?.status === 'EXCUSED' ? 'default' : 'outline'}
                            className={cn(
                              'w-8 h-8 p-0',
                              entry?.status === 'EXCUSED' && 'bg-blue-500 hover:bg-blue-600'
                            )}
                            onClick={() => updateStatus(item.studentId, 'EXCUSED')}
                          >
                            E
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRemarksDialog({
                              studentId: item.studentId,
                              name: `${item.student.user.firstName} ${item.student.user.lastName}`,
                            });
                            setTempRemarks(entry?.remarks || '');
                          }}
                        >
                          {entry?.remarks ? (
                            <Badge variant="outline" className="truncate max-w-[80px]">
                              {entry.remarks}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">Add</span>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="flex justify-end gap-4 mt-6">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || attendance.length === 0}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save Attendance'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Remarks Dialog */}
      <Dialog open={!!remarksDialog} onOpenChange={() => setRemarksDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Remarks</DialogTitle>
            <DialogDescription>
              Add remarks for {remarksDialog?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={tempRemarks}
              onChange={(e) => setTempRemarks(e.target.value)}
              placeholder="Enter remarks..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemarksDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (remarksDialog) {
                  updateRemarks(remarksDialog.studentId, tempRemarks);
                }
                setRemarksDialog(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
