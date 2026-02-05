import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  FileText,
  CheckCircle,
  AlertTriangle,
  BookOpen,
  Calculator,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { classesApi, type ClassEntity } from '@/lib/api/classes';
import {
  gradeComponentsApi,
  gradeCalculationApi,
  type GradeComponent,
  type CalculatedGrade,
  type WeightValidationResult,
} from '@/lib/api/grading';

export function ClassGradesPage() {
  const navigate = useNavigate();
  const { classId } = useParams();

  const [loading, setLoading] = useState(true);
  const [classEntity, setClassEntity] = useState<ClassEntity | null>(null);
  const [components, setComponents] = useState<GradeComponent[]>([]);
  const [grades, setGrades] = useState<CalculatedGrade[]>([]);
  const [weightValidation, setWeightValidation] = useState<WeightValidationResult | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const [showFinalizeDialog, setShowFinalizeDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (classId) {
      loadData();
    }
  }, [classId]);

  const loadData = async () => {
    if (!classId) return;
    try {
      setLoading(true);
      const [classRes, componentsRes, gradesRes, validationRes] = await Promise.all([
        classesApi.getClassById(classId),
        gradeComponentsApi.getByClass(classId),
        gradeCalculationApi.getClassGrades(classId),
        gradeComponentsApi.validateWeights(classId),
      ]);

      if (classRes.success && classRes.data) {
        setClassEntity(classRes.data);
      }
      if (componentsRes.success && componentsRes.data) {
        setComponents(componentsRes.data);
      }
      if (gradesRes.success && gradesRes.data) {
        setGrades(gradesRes.data);
      }
      if (validationRes.success && validationRes.data) {
        setWeightValidation(validationRes.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load grade data');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeGrades = async () => {
    if (!classId) return;
    try {
      setFinalizing(true);
      const result = await gradeCalculationApi.finalizeGrades(classId);
      if (result.success) {
        await loadData();
        setShowFinalizeDialog(false);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to finalize grades');
    } finally {
      setFinalizing(false);
    }
  };

  const getComponentTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      MIDTERM: 'bg-blue-500',
      FINAL: 'bg-purple-500',
      QUIZ: 'bg-yellow-500',
      ASSIGNMENT: 'bg-green-500',
      PROJECT: 'bg-orange-500',
      PARTICIPATION: 'bg-pink-500',
      LAB: 'bg-cyan-500',
      OTHER: 'bg-gray-500',
    };
    return <Badge className={colors[type] || 'bg-gray-500'}>{type}</Badge>;
  };

  const getGradeColor = (letter: string) => {
    if (letter.startsWith('A')) return 'text-green-600 font-bold';
    if (letter.startsWith('B')) return 'text-blue-600 font-semibold';
    if (letter.startsWith('C')) return 'text-yellow-600';
    if (letter.startsWith('D')) return 'text-orange-600';
    return 'text-red-600';
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
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Classes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/admin/classes/${classId}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Grade Management</h1>
            <p className="text-muted-foreground">
              {classEntity.course.code} - {classEntity.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {weightValidation?.valid && grades.length > 0 && (
            <Button onClick={() => setShowFinalizeDialog(true)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Finalize Grades
            </Button>
          )}
        </div>
      </div>

      {/* Weight Validation Alert */}
      {weightValidation && !weightValidation.valid && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-500">
              <AlertTriangle className="h-5 w-5" />
              <span>
                Component weights total {weightValidation.total}%. They should sum to 100% before
                finalizing grades.
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Components</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{components.length}</div>
            <p className="text-xs text-muted-foreground">
              Total weight: {weightValidation?.total || 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{grades.length}</div>
            <p className="text-xs text-muted-foreground">Enrolled students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Class Average</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {grades.length > 0
                ? (grades.reduce((sum, g) => sum + g.totalPercentage, 0) / grades.length).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Average percentage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {grades.length > 0
                ? ((grades.filter((g) => !g.letterGrade.startsWith('F')).length / grades.length) * 100).toFixed(0)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Students passing</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="components" className="space-y-4">
        <TabsList>
          <TabsTrigger value="components">Grade Components</TabsTrigger>
          <TabsTrigger value="grades">Student Grades</TabsTrigger>
        </TabsList>

        {/* Components Tab */}
        <TabsContent value="components" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Grade Components</h2>
            <Link to={`/admin/classes/${classId}/components/new`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Component
              </Button>
            </Link>
          </div>

          {components.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Grade Components</h3>
                <p className="text-muted-foreground mb-4">
                  Add grade components to start entering grades for this class.
                </p>
                <Link to={`/admin/classes/${classId}/components/new`}>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add First Component
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Component</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead className="text-right">Max Score</TableHead>
                    <TableHead className="text-right">Entries</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {components.map((component) => (
                    <TableRow key={component.id}>
                      <TableCell className="font-medium">{component.name}</TableCell>
                      <TableCell>{getComponentTypeBadge(component.type)}</TableCell>
                      <TableCell className="text-right">{component.weight}%</TableCell>
                      <TableCell className="text-right">{component.maxScore}</TableCell>
                      <TableCell className="text-right">{component._count?.entries || 0}</TableCell>
                      <TableCell>
                        {component.isPublished ? (
                          <Badge className="bg-green-500">Published</Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/admin/grade-components/${component.id}/grades`}>
                            <Button variant="outline" size="sm">
                              Enter Grades
                            </Button>
                          </Link>
                          <Link to={`/admin/grade-components/${component.id}/edit`}>
                            <Button variant="ghost" size="sm">
                              Edit
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        {/* Student Grades Tab */}
        <TabsContent value="grades" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Student Grades</h2>
          </div>

          {grades.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Grades Yet</h3>
                <p className="text-muted-foreground">
                  Add grade components and enter grades to see student performance.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">#</TableHead>
                    <TableHead>Student</TableHead>
                    {components.map((c) => (
                      <TableHead key={c.id} className="text-right">
                        {c.name}
                        <br />
                        <span className="text-xs text-muted-foreground">({c.weight}%)</span>
                      </TableHead>
                    ))}
                    <TableHead className="text-right">Total %</TableHead>
                    <TableHead className="text-center">Grade</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.map((grade, index) => (
                    <TableRow key={grade.enrollmentId}>
                      <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="font-medium">{grade.studentName}</TableCell>
                      {components.map((c) => {
                        const score = grade.componentScores.find(
                          (s) => s.componentId === c.id
                        );
                        return (
                          <TableCell key={c.id} className="text-right">
                            {score ? `${score.score}/${score.maxScore}` : '-'}
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-right font-medium">
                        {grade.totalPercentage.toFixed(1)}%
                      </TableCell>
                      <TableCell className={`text-center ${getGradeColor(grade.letterGrade)}`}>
                        {grade.letterGrade}
                      </TableCell>
                      <TableCell className="text-right">{grade.gradePoints.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Finalize Dialog */}
      <AlertDialog open={showFinalizeDialog} onOpenChange={setShowFinalizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize Grades</AlertDialogTitle>
            <AlertDialogDescription>
              This will finalize grades for all {grades.length} students in this class. Finalized
              grades cannot be changed without admin approval. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinalizeGrades} disabled={finalizing}>
              {finalizing ? 'Finalizing...' : 'Finalize Grades'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ClassGradesPage;
