import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, GraduationCap, BookOpen, Users, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { programsApi, type Program, type CurriculumBySemester } from '@/lib/api/programs';

const typeColors: Record<string, string> = {
  CERTIFICATE: 'bg-gray-100 text-gray-800',
  DIPLOMA: 'bg-blue-100 text-blue-800',
  BACHELOR: 'bg-green-100 text-green-800',
  MASTER: 'bg-purple-100 text-purple-800',
};

export function ProgramDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [program, setProgram] = useState<Program | null>(null);
  const [curriculum, setCurriculum] = useState<CurriculumBySemester | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadProgram();
      loadCurriculum();
    }
  }, [id]);

  const loadProgram = async () => {
    try {
      setLoading(true);
      const response = await programsApi.getProgramById(id!);
      if (response.success && response.data) setProgram(response.data);
    } catch (error) {
      console.error('Failed to load program:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCurriculum = async () => {
    try {
      const response = await programsApi.getCurriculum(id!);
      if (response.success && response.data) setCurriculum(response.data);
    } catch (error) {
      console.error('Failed to load curriculum:', error);
    }
  };

  if (loading) return <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!program) return <div className="text-center py-8"><p className="text-muted-foreground">Program not found</p><Button variant="link" onClick={() => navigate('/admin/academic/programs')}>Back</Button></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-bold">{program.name}</h1>
              <Badge variant="outline">{program.code}</Badge>
              <Badge className={typeColors[program.type]}>{program.type}</Badge>
            </div>
            <p className="text-muted-foreground">{program.department?.faculty?.name} &gt; {program.department?.name}</p>
          </div>
        </div>
        <Link to={`/admin/academic/programs/${program.id}/edit`}><Button><Edit className="mr-2 h-4 w-4" />Edit</Button></Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { title: 'Duration', value: `${program.durationYears} years`, icon: Calendar },
          { title: 'Total Credits', value: program.totalCredits, icon: BookOpen },
          { title: 'Courses', value: program.courseCount, icon: BookOpen },
          { title: 'Students', value: program.studentCount, icon: Users },
        ].map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent><div className="text-2xl font-bold">{stat.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader><CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5" />Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div><p className="text-sm text-muted-foreground">Code</p><p className="font-medium">{program.code}</p></div>
            <div><p className="text-sm text-muted-foreground">Type</p><p className="font-medium">{program.type}</p></div>
            <div><p className="text-sm text-muted-foreground">Department</p><p className="font-medium">{program.department?.name}</p></div>
            <div><p className="text-sm text-muted-foreground">Faculty</p><p className="font-medium">{program.department?.faculty?.name}</p></div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Curriculum</CardTitle>
            <CardDescription>Courses organized by semester</CardDescription>
          </CardHeader>
          <CardContent>
            {curriculum && curriculum.semesters.length > 0 ? (
              <div className="space-y-6">
                {curriculum.semesters.map((sem) => (
                  <div key={sem.semester}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Semester {sem.semester}</h4>
                      <Badge variant="secondary">{sem.totalCredits} credits</Badge>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>Course</TableHead>
                          <TableHead>Credits</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sem.courses.map((course) => (
                          <TableRow key={course.courseId}>
                            <TableCell><Badge variant="outline">{course.code}</Badge></TableCell>
                            <TableCell>{course.name}</TableCell>
                            <TableCell>{course.credits}</TableCell>
                            <TableCell><Badge variant={course.isElective ? 'secondary' : 'default'}>{course.isElective ? 'Elective' : 'Required'}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-muted-foreground">No curriculum defined yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
