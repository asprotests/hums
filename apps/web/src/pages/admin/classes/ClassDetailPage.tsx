import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Users, Calendar, Clock, Building2, User, GraduationCap, BookOpen, Split } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { classesApi, type ClassEntity, type ClassStudent, type ClassStatus } from '@/lib/api/classes';
import { schedulesApi, type Schedule } from '@/lib/api/schedules';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function ClassDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [classEntity, setClassEntity] = useState<ClassEntity | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [students, setStudents] = useState<ClassStudent[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadClassData(id);
    }
  }, [id]);

  const loadClassData = async (classId: string) => {
    try {
      setLoading(true);
      const [classRes, schedulesRes, studentsRes] = await Promise.all([
        classesApi.getClassById(classId),
        schedulesApi.getClassSchedules(classId),
        classesApi.getStudents(classId),
      ]);

      if (classRes.success && classRes.data) {
        setClassEntity(classRes.data);
      }
      if (schedulesRes.success && schedulesRes.data) {
        setSchedules(schedulesRes.data);
      }
      if (studentsRes.success && studentsRes.data) {
        setStudents(studentsRes.data);
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load class');
    } finally {
      setLoading(false);
    }
  };

  const handleSplitClass = async () => {
    if (!id) return;
    try {
      const result = await classesApi.splitClass(id);
      if (result.success && result.data) {
        navigate(`/admin/classes/${result.data.id}/edit`);
      }
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to split class');
    }
  };

  const getStatusBadge = (status: ClassStatus) => {
    switch (status) {
      case 'OPEN': return <Badge className="bg-green-500">Open</Badge>;
      case 'CLOSED': return <Badge variant="secondary">Closed</Badge>;
      case 'CANCELLED': return <Badge variant="destructive">Cancelled</Badge>;
    }
  };

  const getCapacityColor = (enrolled: number, capacity: number) => {
    const percentage = (enrolled / capacity) * 100;
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 70) return 'text-yellow-500';
    return 'text-green-500';
  };

  const getScheduleTypeBadge = (type: string) => {
    switch (type) {
      case 'LECTURE': return <Badge>Lecture</Badge>;
      case 'LAB': return <Badge variant="secondary">Lab</Badge>;
      case 'TUTORIAL': return <Badge variant="outline">Tutorial</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !classEntity) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-destructive">{error || 'Class not found'}</p>
        <Button variant="outline" onClick={() => navigate('/admin/classes')}>
          <ArrowLeft className="mr-2 h-4 w-4" />Back to Classes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/classes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{classEntity.name}</h1>
              {getStatusBadge(classEntity.status)}
            </div>
            <p className="text-muted-foreground">
              {classEntity.course.code} - {classEntity.course.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSplitClass}>
            <Split className="mr-2 h-4 w-4" />Split Class
          </Button>
          <Link to={`/admin/classes/${id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrollment</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getCapacityColor(classEntity.enrolledCount, classEntity.capacity)}`}>
              {classEntity.enrolledCount}/{classEntity.capacity}
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round((classEntity.enrolledCount / classEntity.capacity) * 100)}% capacity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lecturer</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {classEntity.lecturer.user.firstName} {classEntity.lecturer.user.lastName}
            </div>
            <p className="text-xs text-muted-foreground">{classEntity.lecturer.user.email}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Semester</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{classEntity.semester.name}</div>
            <p className="text-xs text-muted-foreground">
              {new Date(classEntity.semester.startDate).toLocaleDateString()} - {new Date(classEntity.semester.endDate).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Room</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {classEntity.room ? (
              <>
                <div className="text-lg font-bold">{classEntity.room.name}</div>
                <p className="text-xs text-muted-foreground">
                  {classEntity.room.building || 'No building'} - Capacity: {classEntity.room.capacity}
                </p>
              </>
            ) : (
              <div className="text-muted-foreground">Not assigned</div>
            )}
          </CardContent>
        </Card>
      </div>

      {classEntity.cancelReason && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">
              <strong>Cancellation Reason:</strong> {classEntity.cancelReason}
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="schedule" className="space-y-4">
        <TabsList>
          <TabsTrigger value="schedule" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />Schedule
          </TabsTrigger>
          <TabsTrigger value="students" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />Students ({students.length})
          </TabsTrigger>
          <TabsTrigger value="course" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />Course Info
          </TabsTrigger>
        </TabsList>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {schedules.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No schedule set</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Room</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules
                      .sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime))
                      .map((schedule) => (
                        <TableRow key={schedule.id}>
                          <TableCell className="font-medium">
                            {DAYS_OF_WEEK[schedule.dayOfWeek]}
                          </TableCell>
                          <TableCell>
                            {schedule.startTime} - {schedule.endTime}
                          </TableCell>
                          <TableCell>
                            {schedule.room ? (
                              <span>{schedule.room.name} {schedule.room.building && `(${schedule.room.building})`}</span>
                            ) : (
                              <span className="text-muted-foreground">TBD</span>
                            )}
                          </TableCell>
                          <TableCell>{getScheduleTypeBadge(schedule.scheduleType)}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Students</CardTitle>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No students enrolled</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Enrolled At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((enrollment) => (
                      <TableRow key={enrollment.enrollmentId}>
                        <TableCell>
                          <Badge variant="outline">{enrollment.student.studentId}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {enrollment.student.firstName} {enrollment.student.lastName}
                        </TableCell>
                        <TableCell>{enrollment.student.email}</TableCell>
                        <TableCell>{enrollment.student.program || '-'}</TableCell>
                        <TableCell>
                          {new Date(enrollment.enrolledAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="course">
          <Card>
            <CardHeader>
              <CardTitle>Course Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Course Code</p>
                  <p className="font-medium">{classEntity.course.code}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Course Name</p>
                  <p className="font-medium">{classEntity.course.name}</p>
                </div>
                {classEntity.course.nameLocal && (
                  <div>
                    <p className="text-sm text-muted-foreground">Name (Local)</p>
                    <p className="font-medium">{classEntity.course.nameLocal}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Credits</p>
                  <p className="font-medium">{classEntity.course.credits}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
