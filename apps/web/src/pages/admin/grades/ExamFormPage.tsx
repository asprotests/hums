import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  examsApi,
  type ExamType,
  type ExamConflict,
  type CreateExamInput,
  type UpdateExamInput,
} from '@/lib/api/exams';
import { classesApi, type ClassEntity } from '@/lib/api/classes';
import { roomsApi, type Room } from '@/lib/api/rooms';
import { semestersApi, type Semester } from '@/lib/api/academicCalendar';

const EXAM_TYPES: { value: ExamType; label: string }[] = [
  { value: 'MIDTERM', label: 'Midterm Exam' },
  { value: 'FINAL', label: 'Final Exam' },
  { value: 'QUIZ', label: 'Quiz' },
  { value: 'MAKEUP', label: 'Makeup Exam' },
];

export function ExamFormPage() {
  const navigate = useNavigate();
  const { examId } = useParams();
  const isEditing = !!examId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [conflicts, setConflicts] = useState<ExamConflict[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    classId: '',
    semesterId: '',
    type: 'MIDTERM' as ExamType,
    title: '',
    date: '',
    startTime: '09:00',
    endTime: '11:00',
    duration: 120,
    roomId: '',
    maxScore: 100,
    instructions: '',
  });

  useEffect(() => {
    loadInitialData();
  }, [examId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // Load semesters first
      const semestersRes = await semestersApi.getSemesters();
      if (semestersRes.success && semestersRes.data) {
        setSemesters(semestersRes.data);
      }

      // Load rooms
      const roomsRes = await roomsApi.getRooms();
      if (roomsRes.success && roomsRes.data) {
        setRooms(roomsRes.data.data || []);
      }

      if (isEditing && examId) {
        // Load existing exam
        const examRes = await examsApi.getById(examId);
        if (examRes.success && examRes.data) {
          setFormData({
            classId: examRes.data.classId,
            semesterId: examRes.data.class.semester.id,
            type: examRes.data.type,
            title: examRes.data.title,
            date: new Date(examRes.data.date).toISOString().split('T')[0],
            startTime: examRes.data.startTime,
            endTime: examRes.data.endTime,
            duration: examRes.data.duration,
            roomId: examRes.data.roomId,
            maxScore: examRes.data.maxScore,
            instructions: examRes.data.instructions || '',
          });

          // Load classes for this semester
          const classesRes = await classesApi.getClasses({
            semesterId: examRes.data.class.semester.id,
          });
          if (classesRes.success && classesRes.data) {
            setClasses(classesRes.data.data);
          }
        }
      } else {
        // For new exam, load current semester's classes
        const currentRes = await semestersApi.getCurrentSemester();
        if (currentRes.success && currentRes.data) {
          setFormData((prev) => ({ ...prev, semesterId: currentRes.data!.id }));
          const classesRes = await classesApi.getClasses({
            semesterId: currentRes.data.id,
          });
          if (classesRes.success && classesRes.data) {
            setClasses(classesRes.data.data);
          }
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSemesterChange = async (semesterId: string) => {
    setFormData((prev) => ({ ...prev, semesterId, classId: '' }));
    try {
      const classesRes = await classesApi.getClasses({ semesterId });
      if (classesRes.success && classesRes.data) {
        setClasses(classesRes.data.data);
      }
    } catch (err) {
      console.error('Failed to load classes:', err);
    }
  };

  const handleClassChange = (classId: string) => {
    const selectedClass = classes.find((c) => c.id === classId);
    setFormData((prev) => ({
      ...prev,
      classId,
      title: selectedClass
        ? `${selectedClass.course.code} - ${prev.type.charAt(0) + prev.type.slice(1).toLowerCase()} Exam`
        : '',
    }));
  };

  const handleTypeChange = (type: ExamType) => {
    const selectedClass = classes.find((c) => c.id === formData.classId);
    setFormData((prev) => ({
      ...prev,
      type,
      title: selectedClass
        ? `${selectedClass.course.code} - ${type.charAt(0) + type.slice(1).toLowerCase()} Exam`
        : prev.title,
    }));
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setConflicts([]);
  };

  const calculateEndTime = (startTime: string, duration: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + duration;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
  };

  const handleStartTimeChange = (startTime: string) => {
    const endTime = calculateEndTime(startTime, formData.duration);
    setFormData((prev) => ({ ...prev, startTime, endTime }));
  };

  const handleDurationChange = (duration: number) => {
    const endTime = calculateEndTime(formData.startTime, duration);
    setFormData((prev) => ({ ...prev, duration, endTime }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);

      if (isEditing && examId) {
        const updateData: UpdateExamInput = {
          type: formData.type,
          title: formData.title,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          duration: formData.duration,
          roomId: formData.roomId,
          maxScore: formData.maxScore,
          instructions: formData.instructions || undefined,
        };
        await examsApi.update(examId, updateData);
        navigate('/admin/exams');
      } else {
        const createData: CreateExamInput = {
          classId: formData.classId,
          type: formData.type,
          title: formData.title,
          date: formData.date,
          startTime: formData.startTime,
          endTime: formData.endTime,
          duration: formData.duration,
          roomId: formData.roomId,
          maxScore: formData.maxScore,
          instructions: formData.instructions || undefined,
        };
        const result = await examsApi.create(createData);
        if (result.success && result.data && result.data.conflicts && result.data.conflicts.length > 0) {
          setConflicts(result.data.conflicts);
        }
        navigate('/admin/exams');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save exam');
    } finally {
      setSaving(false);
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
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/exams')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {isEditing ? 'Edit Exam' : 'Schedule Exam'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Update exam details' : 'Create a new exam schedule'}
          </p>
        </div>
      </div>

      {/* Conflict Warnings */}
      {conflicts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Scheduling Conflicts Detected</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2">
              {conflicts.map((conflict, idx) => (
                <li key={idx}>{conflict.description}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Exam Details</CardTitle>
            <CardDescription>Schedule an exam for a class.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
              </div>
            )}

            {/* Semester and Class Selection */}
            {!isEditing && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="semesterId">Semester *</Label>
                  <Select
                    value={formData.semesterId}
                    onValueChange={handleSemesterChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {semesters.map((sem) => (
                        <SelectItem key={sem.id} value={sem.id}>
                          {sem.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="classId">Class *</Label>
                  <Select
                    value={formData.classId}
                    onValueChange={handleClassChange}
                    disabled={!formData.semesterId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.course.code} - {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Exam Type *</Label>
                <Select value={formData.type} onValueChange={handleTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXAM_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxScore">Max Score *</Label>
                <Input
                  id="maxScore"
                  type="number"
                  min={1}
                  value={formData.maxScore}
                  onChange={(e) => handleInputChange('maxScore', parseInt(e.target.value) || 100)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Exam Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="e.g., CS101 - Midterm Exam"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="roomId">Room *</Label>
                <Select
                  value={formData.roomId}
                  onValueChange={(v) => handleInputChange('roomId', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select room" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>
                        {room.name} {room.building ? `(${room.building})` : ''} - Cap: {room.capacity}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => handleStartTimeChange(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (mins) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min={15}
                  step={15}
                  value={formData.duration}
                  onChange={(e) => handleDurationChange(parseInt(e.target.value) || 60)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  disabled
                  className="bg-muted"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="instructions">Instructions (Optional)</Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) => handleInputChange('instructions', e.target.value)}
                placeholder="Enter exam instructions for students..."
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/admin/exams')}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving || (!isEditing && (!formData.classId || !formData.roomId))}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? 'Update Exam' : 'Schedule Exam'}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

export default ExamFormPage;
