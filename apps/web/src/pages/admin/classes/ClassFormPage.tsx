import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Save, Loader2, Plus, Trash2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { classesApi } from '@/lib/api/classes';
import { schedulesApi, type Schedule, type ScheduleType } from '@/lib/api/schedules';
import { roomsApi, type Room } from '@/lib/api/rooms';
import { semestersApi, type Semester } from '@/lib/api/academicCalendar';
import { coursesApi, type Course } from '@/lib/api/courses';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

const SCHEDULE_TYPES: { value: ScheduleType; label: string }[] = [
  { value: 'LECTURE', label: 'Lecture' },
  { value: 'LAB', label: 'Lab' },
  { value: 'TUTORIAL', label: 'Tutorial' },
];

const TIME_SLOTS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00',
];

interface ScheduleInput {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  roomId?: string;
  scheduleType: ScheduleType;
  isNew?: boolean;
}

export function ClassFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);

  const [formData, setFormData] = useState({
    courseId: '',
    semesterId: '',
    lecturerId: '',
    capacity: 40,
    name: '',
    roomId: '',
  });

  const [schedules, setSchedules] = useState<ScheduleInput[]>([]);
  const [schedulesToDelete, setSchedulesToDelete] = useState<string[]>([]);

  useEffect(() => {
    loadDropdownData();
    if (isEdit && id) {
      loadClass(id);
    }
  }, [id]);

  const loadDropdownData = async () => {
    try {
      const [semesterRes, courseRes, roomRes] = await Promise.all([
        semestersApi.getSemesters(),
        coursesApi.getCourses({ limit: 100 }),
        roomsApi.getRooms({ limit: 100, isActive: true }),
      ]);

      if (semesterRes.success && semesterRes.data) setSemesters(semesterRes.data);
      if (courseRes.success && courseRes.data) setCourses(courseRes.data.data);
      if (roomRes.success && roomRes.data) setRooms(roomRes.data.data);
    } catch (error) {
      console.error('Failed to load dropdown data:', error);
    }
  };

  const loadClass = async (classId: string) => {
    try {
      setLoading(true);
      const [classRes, schedulesRes] = await Promise.all([
        classesApi.getClassById(classId),
        schedulesApi.getClassSchedules(classId),
      ]);

      if (classRes.success && classRes.data) {
        const cls = classRes.data;
        setFormData({
          courseId: cls.courseId,
          semesterId: cls.semesterId,
          lecturerId: cls.lecturerId,
          capacity: cls.capacity,
          name: cls.name,
          roomId: cls.roomId || '',
        });
      }

      if (schedulesRes.success && schedulesRes.data) {
        setSchedules(schedulesRes.data.map((s: Schedule) => ({
          id: s.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          roomId: s.roomId || '',
          scheduleType: s.scheduleType,
        })));
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load class');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.courseId) {
      setError('Course is required');
      return;
    }
    if (!formData.semesterId) {
      setError('Semester is required');
      return;
    }
    if (!formData.lecturerId) {
      setError('Lecturer is required');
      return;
    }
    if (formData.capacity < 1) {
      setError('Capacity must be at least 1');
      return;
    }

    try {
      setSaving(true);
      let classId = id;

      if (isEdit && id) {
        await classesApi.updateClass(id, {
          name: formData.name || undefined,
          lecturerId: formData.lecturerId,
          capacity: formData.capacity,
          roomId: formData.roomId || null,
        });
      } else {
        const result = await classesApi.createClass({
          courseId: formData.courseId,
          semesterId: formData.semesterId,
          lecturerId: formData.lecturerId,
          capacity: formData.capacity,
          name: formData.name || undefined,
          roomId: formData.roomId || undefined,
        });
        if (result.success && result.data) {
          classId = result.data.id;
        }
      }

      // Handle schedules
      if (classId) {
        // Delete removed schedules
        for (const scheduleId of schedulesToDelete) {
          await schedulesApi.deleteSchedule(scheduleId);
        }

        // Create/update schedules
        for (const schedule of schedules) {
          if (schedule.isNew) {
            await schedulesApi.createSchedule({
              classId,
              dayOfWeek: schedule.dayOfWeek,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              roomId: schedule.roomId || undefined,
              scheduleType: schedule.scheduleType,
            });
          } else if (schedule.id) {
            await schedulesApi.updateSchedule(schedule.id, {
              dayOfWeek: schedule.dayOfWeek,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
              roomId: schedule.roomId || null,
              scheduleType: schedule.scheduleType,
            });
          }
        }
      }

      navigate('/admin/classes');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to save class');
    } finally {
      setSaving(false);
    }
  };

  const addSchedule = () => {
    setSchedules([
      ...schedules,
      {
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '09:30',
        roomId: formData.roomId || '',
        scheduleType: 'LECTURE',
        isNew: true,
      },
    ]);
  };

  const updateSchedule = (index: number, updates: Partial<ScheduleInput>) => {
    setSchedules(schedules.map((s, i) => (i === index ? { ...s, ...updates } : s)));
  };

  const removeSchedule = (index: number) => {
    const schedule = schedules[index];
    if (schedule.id && !schedule.isNew) {
      setSchedulesToDelete([...schedulesToDelete, schedule.id]);
    }
    setSchedules(schedules.filter((_, i) => i !== index));
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/classes')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{isEdit ? 'Edit Class' : 'New Class'}</h1>
          <p className="text-muted-foreground">
            {isEdit ? 'Update class details and schedule' : 'Create a new class section'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />Class Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="semesterId">Semester *</Label>
                  <Select
                    value={formData.semesterId}
                    onValueChange={(v) => setFormData({ ...formData, semesterId: v })}
                    disabled={isEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {semesters.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="courseId">Course *</Label>
                  <Select
                    value={formData.courseId}
                    onValueChange={(v) => setFormData({ ...formData, courseId: v })}
                    disabled={isEdit}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Section Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., CS101-A (auto-generated if empty)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lecturerId">Lecturer *</Label>
                  <Input
                    id="lecturerId"
                    value={formData.lecturerId}
                    onChange={(e) => setFormData({ ...formData, lecturerId: e.target.value })}
                    placeholder="Enter lecturer ID"
                  />
                  <p className="text-xs text-muted-foreground">Enter the lecturer's employee ID</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity *</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min={1}
                    max={500}
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="roomId">Default Room</Label>
                  <Select
                    value={formData.roomId || 'none'}
                    onValueChange={(v) => setFormData({ ...formData, roomId: v === 'none' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No room assigned</SelectItem>
                      {rooms.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} {r.building && `(${r.building})`} - Cap: {r.capacity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />Schedule
                </CardTitle>
                <Button type="button" variant="outline" size="sm" onClick={addSchedule}>
                  <Plus className="mr-2 h-4 w-4" />Add Time Slot
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {schedules.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">
                  No schedule added. Click "Add Time Slot" to add class times.
                </p>
              ) : (
                <div className="space-y-4">
                  {schedules.map((schedule, index) => (
                    <div key={index} className="flex flex-wrap items-end gap-4 p-4 border rounded-lg">
                      <div className="space-y-2">
                        <Label>Day</Label>
                        <Select
                          value={String(schedule.dayOfWeek)}
                          onValueChange={(v) => updateSchedule(index, { dayOfWeek: parseInt(v) })}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {DAYS_OF_WEEK.map((d) => (
                              <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Start Time</Label>
                        <Select
                          value={schedule.startTime}
                          onValueChange={(v) => updateSchedule(index, { startTime: v })}
                        >
                          <SelectTrigger className="w-[110px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_SLOTS.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Select
                          value={schedule.endTime}
                          onValueChange={(v) => updateSchedule(index, { endTime: v })}
                        >
                          <SelectTrigger className="w-[110px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TIME_SLOTS.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Room</Label>
                        <Select
                          value={schedule.roomId || 'none'}
                          onValueChange={(v) => updateSchedule(index, { roomId: v === 'none' ? '' : v })}
                        >
                          <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Select room" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">TBD</SelectItem>
                            {rooms.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name} ({r.capacity})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={schedule.scheduleType}
                          onValueChange={(v) => updateSchedule(index, { scheduleType: v as ScheduleType })}
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SCHEDULE_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSchedule(index)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/admin/classes')}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" />Save Class</>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
