import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  gradeComponentsApi,
  gradeEntriesApi,
  type GradeComponent,
  type ComponentGradesResult,
  type GradeEntryInput,
} from '@/lib/api/grading';

interface GradeFormEntry {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  email?: string;
  score: number | string;
  remarks: string;
  existingEntryId?: string;
}

export function GradeEntryPage() {
  const navigate = useNavigate();
  const { componentId } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [component, setComponent] = useState<GradeComponent | null>(null);
  const [gradesData, setGradesData] = useState<ComponentGradesResult | null>(null);
  const [formEntries, setFormEntries] = useState<GradeFormEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (componentId) {
      loadData();
    }
  }, [componentId]);

  const loadData = async () => {
    if (!componentId) return;
    try {
      setLoading(true);
      const [componentRes, gradesRes] = await Promise.all([
        gradeComponentsApi.getById(componentId),
        gradeEntriesApi.getByComponent(componentId),
      ]);

      if (componentRes.success && componentRes.data) {
        setComponent(componentRes.data);
      }

      if (gradesRes.success && gradesRes.data) {
        setGradesData(gradesRes.data);

        // Build form entries from existing grades and students without grades
        const entries: GradeFormEntry[] = [];

        // Add students with existing grades
        for (const entry of gradesRes.data.entries) {
          entries.push({
            enrollmentId: entry.enrollmentId,
            studentId: entry.enrollment.student.studentId,
            studentName: `${entry.enrollment.student.user.firstName} ${entry.enrollment.student.user.lastName}`,
            email: entry.enrollment.student.user.email,
            score: entry.score,
            remarks: entry.remarks || '',
            existingEntryId: entry.id,
          });
        }

        // Add students without grades
        for (const enrollment of gradesRes.data.enrolledWithoutGrades) {
          entries.push({
            enrollmentId: enrollment.id,
            studentId: enrollment.student.studentId,
            studentName: `${enrollment.student.user.firstName} ${enrollment.student.user.lastName}`,
            email: enrollment.student.user.email,
            score: '',
            remarks: '',
          });
        }

        // Sort by student name
        entries.sort((a, b) => a.studentName.localeCompare(b.studentName));
        setFormEntries(entries);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleScoreChange = (enrollmentId: string, value: string) => {
    setFormEntries((prev) =>
      prev.map((entry) =>
        entry.enrollmentId === enrollmentId ? { ...entry, score: value } : entry
      )
    );
    setError(null);
    setSuccessMessage(null);
  };

  const handleRemarksChange = (enrollmentId: string, value: string) => {
    setFormEntries((prev) =>
      prev.map((entry) =>
        entry.enrollmentId === enrollmentId ? { ...entry, remarks: value } : entry
      )
    );
  };

  const handleSaveGrades = async () => {
    if (!componentId || !gradesData) return;

    const maxScore = gradesData.component.maxScore;
    const gradesToSave: GradeEntryInput[] = [];

    for (const entry of formEntries) {
      const score = typeof entry.score === 'string' ? parseFloat(entry.score) : entry.score;
      if (!isNaN(score) && score >= 0) {
        if (score > maxScore) {
          setError(`Score for ${entry.studentName} exceeds maximum (${maxScore})`);
          return;
        }
        gradesToSave.push({
          enrollmentId: entry.enrollmentId,
          score,
          remarks: entry.remarks || undefined,
        });
      }
    }

    if (gradesToSave.length === 0) {
      setError('No valid grades to save');
      return;
    }

    try {
      setSaving(true);
      const result = await gradeEntriesApi.enterGrades(componentId, gradesToSave);
      if (result.success) {
        setSuccessMessage(`${result.data?.length || 0} grades saved successfully`);
        await loadData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save grades');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublish = async () => {
    if (!componentId || !component) return;

    try {
      setPublishing(true);
      if (component.isPublished) {
        await gradeComponentsApi.unpublish(componentId);
      } else {
        await gradeComponentsApi.publish(componentId);
      }
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update publish status');
    } finally {
      setPublishing(false);
    }
  };

  const getPercentage = (score: number | string) => {
    if (!gradesData) return 0;
    const numScore = typeof score === 'string' ? parseFloat(score) : score;
    if (isNaN(numScore)) return 0;
    return ((numScore / gradesData.component.maxScore) * 100).toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!component || !gradesData) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-destructive">{error || 'Component not found'}</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
      </div>
    );
  }

  const classId = component.class?.id || component.classId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/admin/classes/${classId}/grades`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Enter Grades</h1>
            <p className="text-muted-foreground">
              {component.name} ({gradesData.component.weight}% of total)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleTogglePublish} disabled={publishing}>
            {publishing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : component.isPublished ? (
              <EyeOff className="mr-2 h-4 w-4" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            {component.isPublished ? 'Unpublish' : 'Publish to Students'}
          </Button>
          <Button onClick={handleSaveGrades} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save All Grades
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Component Info */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Max Score</div>
            <div className="text-2xl font-bold">{gradesData.component.maxScore}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Entries</div>
            <div className="text-2xl font-bold">
              {gradesData.entries.length}/{formEntries.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Average</div>
            <div className="text-2xl font-bold">{gradesData.statistics.average.toFixed(1)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Status</div>
            <div className="mt-1">
              {component.isPublished ? (
                <Badge className="bg-green-500">Published</Badge>
              ) : (
                <Badge variant="secondary">Draft</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">{error}</div>
      )}
      {successMessage && (
        <div className="p-3 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 rounded-md flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          {successMessage}
        </div>
      )}

      {/* Grade Entry Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Grades</CardTitle>
          <CardDescription>
            Enter scores for each student. Maximum score: {gradesData.component.maxScore}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Student Name</TableHead>
                <TableHead className="w-[120px]">Score</TableHead>
                <TableHead className="w-[80px]">%</TableHead>
                <TableHead>Remarks</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formEntries.map((entry, index) => (
                <TableRow key={entry.enrollmentId}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-mono text-sm">{entry.studentId}</TableCell>
                  <TableCell className="font-medium">{entry.studentName}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      max={gradesData.component.maxScore}
                      step="0.1"
                      value={entry.score}
                      onChange={(e) => handleScoreChange(entry.enrollmentId, e.target.value)}
                      placeholder="0"
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {entry.score !== '' ? `${getPercentage(entry.score)}%` : '-'}
                  </TableCell>
                  <TableCell>
                    <Input
                      value={entry.remarks}
                      onChange={(e) => handleRemarksChange(entry.enrollmentId, e.target.value)}
                      placeholder="Optional remarks"
                      className="w-full"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {formEntries.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No students enrolled in this class.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default GradeEntryPage;
