import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  MapPin,
  GraduationCap,
  FileText,
  ClipboardCheck,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { classesApi, type ClassEntity } from '@/lib/api/classes';
import { courseMaterialsApi, type CourseMaterial } from '@/lib/api/courseMaterials';

export function ClassDetailPage() {
  const { classId } = useParams<{ classId: string }>();
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState<ClassEntity | null>(null);
  const [materials, setMaterials] = useState<CourseMaterial[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (classId) {
      loadClassData();
    }
  }, [classId]);

  const loadClassData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [classResult, materialsResult] = await Promise.all([
        classesApi.getClass(classId!),
        courseMaterialsApi.getMaterials(classId!, true),
      ]);

      if (classResult.success && classResult.data) {
        setClassData(classResult.data);
      }
      if (materialsResult.success && materialsResult.data) {
        setMaterials(materialsResult.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load class data');
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

  if (error || !classData) {
    return (
      <div className="p-4 text-center">
        <p className="text-destructive">{error || 'Class not found'}</p>
        <Link to="/academic/classes">
          <Button className="mt-4">Back to Classes</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Link to="/academic/classes">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold">{classData.name}</h1>
            <Badge variant="outline">{classData.course?.code}</Badge>
            <Badge
              className={
                classData.status === 'OPEN'
                  ? 'bg-green-500'
                  : classData.status === 'CLOSED'
                  ? 'bg-red-500'
                  : 'bg-yellow-500'
              }
            >
              {classData.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">{classData.course?.name}</p>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{classData.enrolledCount || 0} students</span>
            </div>
            {classData.room && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                <span>{classData.room.name}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link to={`/academic/classes/${classId}/attendance`}>
            <Button variant="outline">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Mark Attendance
            </Button>
          </Link>
          <Link to={`/academic/classes/${classId}/grades`}>
            <Button>
              <GraduationCap className="mr-2 h-4 w-4" />
              Enter Grades
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 md:w-auto md:grid-cols-none md:flex">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          <TabsTrigger value="materials">Materials</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">85%</div>
                <Progress value={85} className="mt-2" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Grade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">78.5%</div>
                <p className="text-xs text-muted-foreground">B average</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{materials.length}</div>
                <p className="text-xs text-muted-foreground">
                  {materials.filter((m) => m.isPublished).length} published
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Class Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              {classData.schedules && classData.schedules.length > 0 ? (
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
                    {classData.schedules.map((schedule: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][schedule.dayOfWeek]}
                        </TableCell>
                        <TableCell>
                          {schedule.startTime} - {schedule.endTime}
                        </TableCell>
                        <TableCell>{schedule.room?.name || classData.room?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{schedule.scheduleType}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-muted-foreground text-center py-4">No schedule set</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Students Tab */}
        <TabsContent value="students" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Enrolled Students</CardTitle>
                  <CardDescription>
                    {classData.enrollments?.length || 0} students enrolled
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {classData.enrollments && classData.enrollments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classData.enrollments.map((enrollment: any) => (
                      <TableRow key={enrollment.id}>
                        <TableCell className="font-mono">
                          {enrollment.student?.studentId}
                        </TableCell>
                        <TableCell>
                          {enrollment.student?.user?.firstName} {enrollment.student?.user?.lastName}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={85} className="w-16 h-2" />
                            <span className="text-sm">85%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {enrollment.finalGrade || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={enrollment.status === 'REGISTERED' ? 'default' : 'secondary'}
                          >
                            {enrollment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No students enrolled yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Attendance Records</CardTitle>
                  <CardDescription>Mark and view attendance</CardDescription>
                </div>
                <Link to={`/academic/classes/${classId}/attendance`}>
                  <Button>
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Mark Attendance
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Click "Mark Attendance" to record today's attendance</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grades Tab */}
        <TabsContent value="grades" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Grade Components</CardTitle>
                  <CardDescription>Manage grades for this class</CardDescription>
                </div>
                <Link to={`/academic/classes/${classId}/grades`}>
                  <Button>
                    <GraduationCap className="mr-2 h-4 w-4" />
                    Manage Grades
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Click "Manage Grades" to view and enter grades</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Materials Tab */}
        <TabsContent value="materials" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Course Materials</CardTitle>
                  <CardDescription>
                    {materials.length} material(s) uploaded
                  </CardDescription>
                </div>
                <Link to={`/academic/classes/${classId}/materials`}>
                  <Button>
                    <FileText className="mr-2 h-4 w-4" />
                    Manage Materials
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {materials.length > 0 ? (
                <div className="space-y-3">
                  {materials.slice(0, 5).map((material) => (
                    <div
                      key={material.id}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{material.title}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {material.type}
                          </Badge>
                          <Badge
                            variant={material.isPublished ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {material.isPublished ? 'Published' : 'Draft'}
                          </Badge>
                          {material.week && (
                            <span className="text-xs text-muted-foreground">
                              Week {material.week}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {materials.length > 5 && (
                    <Link
                      to={`/academic/classes/${classId}/materials`}
                      className="block text-center text-sm text-primary hover:underline"
                    >
                      View all {materials.length} materials
                    </Link>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No materials uploaded yet</p>
                  <Link to={`/academic/classes/${classId}/materials`}>
                    <Button variant="outline" className="mt-4">
                      Upload First Material
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ClassDetailPage;
