import { useState, useEffect } from 'react';
import { GraduationCap, Download, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  studentPortalApi,
  type CurrentGrade,
  type GradeHistory,
  type GPAInfo,
} from '@/lib/api/studentPortal';

function getGradeColor(grade: string): string {
  if (grade.startsWith('A')) return 'text-green-600';
  if (grade.startsWith('B')) return 'text-blue-600';
  if (grade.startsWith('C')) return 'text-amber-600';
  if (grade.startsWith('D')) return 'text-orange-600';
  return 'text-destructive';
}

function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 80) return 'text-blue-600';
  if (score >= 70) return 'text-amber-600';
  if (score >= 60) return 'text-orange-600';
  return 'text-destructive';
}

export function StudentGradesPage() {
  const [currentGrades, setCurrentGrades] = useState<CurrentGrade[]>([]);
  const [gradeHistory, setGradeHistory] = useState<GradeHistory[]>([]);
  const [gpaInfo, setGpaInfo] = useState<GPAInfo | null>(null);
  const [semester, setSemester] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [gradesRes, historyRes, gpaRes] = await Promise.all([
        studentPortalApi.getGrades(),
        studentPortalApi.getGradeHistory(),
        studentPortalApi.getGPA(),
      ]);

      if (gradesRes.success && gradesRes.data) {
        setCurrentGrades(gradesRes.data.grades);
        setSemester(gradesRes.data.semester);
      }
      if (historyRes.success && historyRes.data) {
        setGradeHistory(historyRes.data);
      }
      if (gpaRes.success && gpaRes.data) {
        setGpaInfo(gpaRes.data);
      }
    } catch (err) {
      console.error('Failed to load grades:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTranscript = async () => {
    try {
      const response = await studentPortalApi.getTranscript();
      if (response.success && response.data) {
        // Create a simple text-based transcript for download
        const transcript = response.data;
        let content = `
HORMUUD UNIVERSITY
UNOFFICIAL TRANSCRIPT
=====================================

Student: ${transcript.student.name}
Student ID: ${transcript.student.studentId}
Program: ${transcript.program.name} (${transcript.program.code})
Department: ${transcript.program.department || 'N/A'}
Faculty: ${transcript.program.faculty || 'N/A'}

=====================================
ACADEMIC RECORD
=====================================

`;
        for (const sem of transcript.academicRecord.semesters) {
          content += `\n${sem.name}\n${'-'.repeat(40)}\n`;
          content += `${'Course'.padEnd(10)} ${'Name'.padEnd(25)} ${'Cr'.padEnd(4)} ${'Score'.padEnd(6)} ${'Grade'.padEnd(6)} Points\n`;
          for (const course of sem.courses) {
            content += `${course.courseCode.padEnd(10)} ${course.courseName.substring(0, 24).padEnd(25)} ${course.credits.toString().padEnd(4)} ${course.finalScore.toFixed(1).padEnd(6)} ${course.letterGrade.padEnd(6)} ${(course.gradePoints * course.credits).toFixed(1)}\n`;
          }
          content += `\nSemester GPA: ${sem.semesterGPA.toFixed(2)} | Credits: ${sem.semesterCredits}\n`;
        }

        content += `
=====================================
SUMMARY
=====================================
Total Credits: ${transcript.academicRecord.totalCredits}
Cumulative GPA: ${transcript.academicRecord.cumulativeGPA.toFixed(2)}

=====================================
${transcript.disclaimer}
Generated: ${new Date(transcript.generatedAt).toLocaleString()}
`;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transcript_${transcript.student.studentId}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to download transcript:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Academic Grades</h1>
          <p className="text-muted-foreground">View your academic performance</p>
        </div>
        <Button onClick={handleDownloadTranscript}>
          <Download className="mr-2 h-4 w-4" />
          Download Transcript
        </Button>
      </div>

      {/* GPA Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Cumulative GPA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{gpaInfo?.cumulativeGPA.toFixed(2) || '0.00'}</div>
            <Progress value={(gpaInfo?.cumulativeGPA || 0) * 25} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{gpaInfo?.totalCredits || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Credits earned</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Semesters Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{gpaInfo?.semesters.length || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Academic semesters</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="current">
        <TabsList>
          <TabsTrigger value="current">Current Semester</TabsTrigger>
          <TabsTrigger value="history">Grade History</TabsTrigger>
          <TabsTrigger value="gpa">GPA by Semester</TabsTrigger>
        </TabsList>

        {/* Current Semester Grades */}
        <TabsContent value="current" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{semester?.name || 'Current Semester'}</CardTitle>
              <CardDescription>Your grades for enrolled courses</CardDescription>
            </CardHeader>
            <CardContent>
              {currentGrades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <GraduationCap className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No grades recorded yet this semester</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {currentGrades.map((courseGrade) => (
                    <div key={courseGrade.enrollmentId} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">
                            {courseGrade.course.code} - {courseGrade.course.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {courseGrade.course.credits} credits
                          </p>
                        </div>
                        {courseGrade.currentScore !== null && (
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${getScoreColor(courseGrade.currentScore)}`}>
                              {courseGrade.currentScore.toFixed(1)}%
                            </p>
                            <p className="text-sm text-muted-foreground">Current Score</p>
                          </div>
                        )}
                      </div>

                      {courseGrade.grades.length > 0 && (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Assessment</TableHead>
                              <TableHead className="text-right">Score</TableHead>
                              <TableHead className="text-right">Max</TableHead>
                              <TableHead className="text-right">Percentage</TableHead>
                              <TableHead className="text-right">Weight</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {courseGrade.grades.map((grade) => (
                              <TableRow key={grade.id}>
                                <TableCell>
                                  {grade.type}
                                  {grade.isFinalized && (
                                    <Badge variant="outline" className="ml-2">Final</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">{grade.score}</TableCell>
                                <TableCell className="text-right">{grade.maxScore}</TableCell>
                                <TableCell className={`text-right ${getScoreColor(grade.percentage)}`}>
                                  {grade.percentage}%
                                </TableCell>
                                <TableCell className="text-right">{grade.weight}%</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grade History */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Complete Grade History</CardTitle>
              <CardDescription>All completed courses</CardDescription>
            </CardHeader>
            <CardContent>
              {gradeHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <GraduationCap className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No completed courses yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Semester</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead className="text-right">Credits</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                      <TableHead className="text-right">Grade</TableHead>
                      <TableHead className="text-right">Points</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gradeHistory.map((record, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{record.semester}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{record.course.code}</p>
                            <p className="text-sm text-muted-foreground">{record.course.name}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{record.course.credits}</TableCell>
                        <TableCell className="text-right">{record.finalScore.toFixed(1)}</TableCell>
                        <TableCell className={`text-right font-bold ${getGradeColor(record.letterGrade)}`}>
                          {record.letterGrade}
                        </TableCell>
                        <TableCell className="text-right">{record.gradePoints.toFixed(1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* GPA by Semester */}
        <TabsContent value="gpa" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>GPA Progress</CardTitle>
              <CardDescription>Your GPA over time</CardDescription>
            </CardHeader>
            <CardContent>
              {!gpaInfo || gpaInfo.semesters.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No GPA data available yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {gpaInfo.semesters.map((sem, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-32 flex-shrink-0">
                        <p className="font-medium">{sem.name}</p>
                        <p className="text-xs text-muted-foreground">{sem.credits} credits</p>
                      </div>
                      <div className="flex-1">
                        <Progress value={sem.gpa * 25} className="h-4" />
                      </div>
                      <div className="w-16 text-right">
                        <span className="text-lg font-bold">{sem.gpa.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="border-t pt-4 mt-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">Cumulative GPA</p>
                      <p className="text-sm text-muted-foreground">
                        {gpaInfo.totalCredits} total credits
                      </p>
                    </div>
                    <div className="text-3xl font-bold">{gpaInfo.cumulativeGPA.toFixed(2)}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
