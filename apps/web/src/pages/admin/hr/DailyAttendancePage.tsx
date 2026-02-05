import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, Users, UserCheck, UserX, AlertTriangle, Calendar, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { employeeAttendanceApi, type DailyAttendanceItem, type EmployeeAttendanceStatus } from '@/lib/api/employeeAttendance';
import { departmentsApi, type Department } from '@/lib/api/departments';

export function DailyAttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [attendance, setAttendance] = useState<DailyAttendanceItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [manualEntryDialog, setManualEntryDialog] = useState<DailyAttendanceItem | null>(null);
  const [manualForm, setManualForm] = useState({
    checkIn: '',
    checkOut: '',
    remarks: '',
  });
  const [saving, setSaving] = useState(false);

  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const departmentId = searchParams.get('departmentId') || '';

  useEffect(() => {
    loadData();
  }, [date, departmentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [attendanceData, deptData] = await Promise.all([
        employeeAttendanceApi.getDailyAttendance(date, departmentId || undefined),
        departmentsApi.getDepartments({ limit: 100 }),
      ]);
      setAttendance(attendanceData);
      if (deptData.success && deptData.data) {
        setDepartments(deptData.data.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  const handleCheckIn = async (employeeId: string) => {
    try {
      await employeeAttendanceApi.checkIn(employeeId);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to check in');
    }
  };

  const handleCheckOut = async (employeeId: string) => {
    try {
      await employeeAttendanceApi.checkOut(employeeId);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to check out');
    }
  };

  const handleManualEntry = async () => {
    if (!manualEntryDialog) return;

    try {
      setSaving(true);
      await employeeAttendanceApi.manualEntry({
        employeeId: manualEntryDialog.employee.id,
        date,
        checkIn: `${date}T${manualForm.checkIn}:00`,
        checkOut: `${date}T${manualForm.checkOut}:00`,
        remarks: manualForm.remarks || undefined,
      });
      setManualEntryDialog(null);
      setManualForm({ checkIn: '', checkOut: '', remarks: '' });
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkLeave = async (employeeId: string) => {
    const remarks = prompt('Enter leave remarks (optional):');
    try {
      await employeeAttendanceApi.markOnLeave({
        employeeId,
        date,
        remarks: remarks || undefined,
      });
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to mark leave');
    }
  };

  const getStatusBadge = (status: EmployeeAttendanceStatus | 'ABSENT') => {
    switch (status) {
      case 'PRESENT': return <Badge className="bg-green-500">Present</Badge>;
      case 'ABSENT': return <Badge variant="destructive">Absent</Badge>;
      case 'HALF_DAY': return <Badge className="bg-yellow-500">Half Day</Badge>;
      case 'ON_LEAVE': return <Badge variant="secondary">On Leave</Badge>;
      case 'HOLIDAY': return <Badge className="bg-blue-500">Holiday</Badge>;
    }
  };

  const formatTime = (datetime: string | null) => {
    if (!datetime) return '-';
    return new Date(datetime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const stats = {
    total: attendance.length,
    present: attendance.filter(a => a.status === 'PRESENT').length,
    absent: attendance.filter(a => a.status === 'ABSENT').length,
    late: attendance.filter(a => {
      if (!a.checkIn) return false;
      const checkIn = new Date(a.checkIn);
      const graceTime = new Date(date);
      graceTime.setHours(8, 15, 0, 0);
      return checkIn > graceTime;
    }).length,
    onLeave: attendance.filter(a => a.status === 'ON_LEAVE').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Daily Attendance</h1>
        <p className="text-muted-foreground">Employee attendance for {new Date(date).toLocaleDateString()}</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Employees</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.present}</p>
                <p className="text-sm text-muted-foreground">Present</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <UserX className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{stats.absent}</p>
                <p className="text-sm text-muted-foreground">Absent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{stats.late}</p>
                <p className="text-sm text-muted-foreground">Late Arrivals</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stats.onLeave}</p>
                <p className="text-sm text-muted-foreground">On Leave</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Attendance Records
          </CardTitle>
          <CardDescription>
            View and manage employee attendance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={date}
                onChange={(e) => handleFilter('date', e.target.value)}
                className="w-[180px]"
              />
            </div>
            <Select value={departmentId || 'all'} onValueChange={(v) => handleFilter('departmentId', v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Work Hours</TableHead>
                  <TableHead className="w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No employees found
                    </TableCell>
                  </TableRow>
                ) : (
                  attendance.map((item) => (
                    <TableRow key={item.employee.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{item.employee.name}</p>
                          <p className="text-sm text-muted-foreground">{item.employee.employeeId}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4 text-muted-foreground" />
                          {item.employee.department?.name || '-'}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(item.status)}</TableCell>
                      <TableCell>{formatTime(item.checkIn)}</TableCell>
                      <TableCell>{formatTime(item.checkOut)}</TableCell>
                      <TableCell>
                        {item.workHours ? `${Number(item.workHours).toFixed(1)}h` : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {!item.checkIn && item.status !== 'ON_LEAVE' && item.status !== 'HOLIDAY' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCheckIn(item.employee.id)}
                            >
                              Check In
                            </Button>
                          )}
                          {item.checkIn && !item.checkOut && item.status !== 'ON_LEAVE' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCheckOut(item.employee.id)}
                            >
                              Check Out
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setManualEntryDialog(item);
                              if (item.checkIn) {
                                const checkInTime = new Date(item.checkIn);
                                setManualForm(prev => ({
                                  ...prev,
                                  checkIn: checkInTime.toTimeString().slice(0, 5),
                                }));
                              }
                              if (item.checkOut) {
                                const checkOutTime = new Date(item.checkOut);
                                setManualForm(prev => ({
                                  ...prev,
                                  checkOut: checkOutTime.toTimeString().slice(0, 5),
                                }));
                              }
                            }}
                          >
                            Edit
                          </Button>
                          {item.status !== 'ON_LEAVE' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkLeave(item.employee.id)}
                            >
                              Leave
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Manual Entry Dialog */}
      <Dialog open={!!manualEntryDialog} onOpenChange={() => setManualEntryDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual Attendance Entry</DialogTitle>
            <DialogDescription>
              Enter attendance for {manualEntryDialog?.employee.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="checkIn">Check In Time</Label>
                <Input
                  id="checkIn"
                  type="time"
                  value={manualForm.checkIn}
                  onChange={(e) => setManualForm(prev => ({ ...prev, checkIn: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checkOut">Check Out Time</Label>
                <Input
                  id="checkOut"
                  type="time"
                  value={manualForm.checkOut}
                  onChange={(e) => setManualForm(prev => ({ ...prev, checkOut: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={manualForm.remarks}
                onChange={(e) => setManualForm(prev => ({ ...prev, remarks: e.target.value }))}
                placeholder="Optional remarks..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManualEntryDialog(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleManualEntry}
              disabled={saving || !manualForm.checkIn || !manualForm.checkOut}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
