import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardList, Search, Eye, Edit, Users, Calendar, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { classesApi, type ClassEntity } from '@/lib/api/classes';
import { semestersApi, type Semester } from '@/lib/api/academicCalendar';
import { attendanceApi, type AttendanceExcuse } from '@/lib/api/attendance';

export function AttendanceDashboardPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [pendingExcuses, setPendingExcuses] = useState<AttendanceExcuse[]>([]);
  const [loading, setLoading] = useState(true);

  const search = searchParams.get('search') || '';
  const semesterId = searchParams.get('semesterId') || '';

  useEffect(() => {
    loadData();
  }, [search, semesterId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [classesData, semestersData, excusesData] = await Promise.all([
        classesApi.getClasses({
          limit: 100,
          search: search || undefined,
          semesterId: semesterId || undefined,
          status: 'OPEN',
        }),
        semestersApi.getSemesters(),
        attendanceApi.getPendingExcuses(),
      ]);

      if (classesData.success && classesData.data) {
        setClasses(classesData.data.data);
      }
      if (semestersData.success && semestersData.data) {
        setSemesters(semestersData.data);
      }
      setPendingExcuses(excusesData);
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

  const handleApproveExcuse = async (excuseId: string) => {
    try {
      await attendanceApi.approveExcuse(excuseId);
      loadData();
    } catch (error) {
      console.error('Failed to approve excuse:', error);
    }
  };

  const handleRejectExcuse = async (excuseId: string) => {
    const remarks = prompt('Enter rejection reason:');
    if (!remarks) return;

    try {
      await attendanceApi.rejectExcuse(excuseId, remarks);
      loadData();
    } catch (error) {
      console.error('Failed to reject excuse:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Attendance Management</h1>
        <p className="text-muted-foreground">Mark and view student attendance</p>
      </div>

      <Tabs defaultValue="classes">
        <TabsList>
          <TabsTrigger value="classes" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Classes
          </TabsTrigger>
          <TabsTrigger value="excuses" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Pending Excuses
            {pendingExcuses.length > 0 && (
              <Badge variant="destructive" className="ml-1">{pendingExcuses.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Class Attendance
              </CardTitle>
              <CardDescription>
                Select a class to mark or view attendance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by class name or course..."
                    value={search}
                    onChange={(e) => handleFilter('search', e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={semesterId || 'all'} onValueChange={(v) => handleFilter('semesterId', v)}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Semesters</SelectItem>
                    {semesters.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} {s.isCurrent && '(Current)'}
                      </SelectItem>
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
                      <TableHead>Class</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Lecturer</TableHead>
                      <TableHead>Semester</TableHead>
                      <TableHead>Students</TableHead>
                      <TableHead className="w-[150px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No classes found
                        </TableCell>
                      </TableRow>
                    ) : (
                      classes.map((cls) => (
                        <TableRow key={cls.id}>
                          <TableCell className="font-medium">{cls.name}</TableCell>
                          <TableCell>
                            <div>
                              <Badge variant="outline">{cls.course.code}</Badge>
                              <p className="text-sm text-muted-foreground mt-1">{cls.course.name}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {cls.lecturer.user.firstName} {cls.lecturer.user.lastName}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              {cls.semester.name}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              {cls.enrolledCount}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Link to={`/admin/attendance/class/${cls.id}/mark`}>
                                <Button variant="ghost" size="icon" title="Mark Attendance">
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link to={`/admin/attendance/class/${cls.id}`}>
                                <Button variant="ghost" size="icon" title="View Report">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
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
        </TabsContent>

        <TabsContent value="excuses" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pending Excuse Requests
              </CardTitle>
              <CardDescription>
                Review and approve/reject student excuse requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingExcuses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No pending excuse requests</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Document</TableHead>
                      <TableHead className="w-[150px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingExcuses.map((excuse) => (
                      <TableRow key={excuse.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {excuse.student?.user.firstName} {excuse.student?.user.lastName}
                            </p>
                            <p className="text-sm text-muted-foreground">{excuse.student?.studentId}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <Badge variant="outline">{excuse.class?.course.code}</Badge>
                            <p className="text-sm text-muted-foreground mt-1">{excuse.class?.name}</p>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(excuse.date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <p className="max-w-[200px] truncate" title={excuse.reason}>
                            {excuse.reason}
                          </p>
                        </TableCell>
                        <TableCell>
                          {excuse.documentUrl ? (
                            <a
                              href={excuse.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              View
                            </a>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleApproveExcuse(excuse.id)}
                            >
                              Approve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleRejectExcuse(excuse.id)}
                            >
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
