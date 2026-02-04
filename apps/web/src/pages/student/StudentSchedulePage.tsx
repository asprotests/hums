import { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { studentPortalApi, type ScheduleItem } from '@/lib/api/studentPortal';

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Monday',
  TUESDAY: 'Tuesday',
  WEDNESDAY: 'Wednesday',
  THURSDAY: 'Thursday',
  FRIDAY: 'Friday',
  SATURDAY: 'Saturday',
  SUNDAY: 'Sunday',
};

const COLORS = [
  'bg-blue-100 border-blue-300 text-blue-800',
  'bg-green-100 border-green-300 text-green-800',
  'bg-purple-100 border-purple-300 text-purple-800',
  'bg-orange-100 border-orange-300 text-orange-800',
  'bg-pink-100 border-pink-300 text-pink-800',
  'bg-cyan-100 border-cyan-300 text-cyan-800',
];

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export function StudentSchedulePage() {
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [semester, setSemester] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'week' | 'list'>('week');

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const response = await studentPortalApi.getSchedule();
      if (response.success && response.data) {
        setSchedule(response.data.schedule);
        setSemester(response.data.semester);
      }
    } catch (err) {
      console.error('Failed to load schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create color map for courses
  const courseColors = new Map<string, string>();
  schedule.forEach((item) => {
    if (!courseColors.has(item.course.code)) {
      courseColors.set(item.course.code, COLORS[courseColors.size % COLORS.length]);
    }
  });

  // Group schedule by day
  const scheduleByDay = DAYS.reduce((acc, day) => {
    acc[day] = schedule.filter((s) => s.day === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
    return acc;
  }, {} as Record<string, ScheduleItem[]>);

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
          <h1 className="text-3xl font-bold">Class Schedule</h1>
          <p className="text-muted-foreground">
            {semester ? semester.name : 'No active semester'}
          </p>
        </div>
      </div>

      <Tabs value={view} onValueChange={(v) => setView(v as 'week' | 'list')}>
        <TabsList>
          <TabsTrigger value="week">Week View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="mt-4">
          {schedule.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No classes scheduled this semester</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {DAYS.map((day) => (
                <Card key={day}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">{DAY_LABELS[day]}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {scheduleByDay[day].length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No classes</p>
                    ) : (
                      scheduleByDay[day].map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded-lg border ${courseColors.get(item.course.code)}`}
                        >
                          <p className="font-medium text-sm">{item.course.code}</p>
                          <p className="text-xs opacity-80">{item.course.name}</p>
                          <div className="flex items-center gap-1 mt-1 text-xs">
                            <Clock className="h-3 w-3" />
                            {formatTime(item.startTime)} - {formatTime(item.endTime)}
                          </div>
                          {item.room && (
                            <div className="flex items-center gap-1 mt-1 text-xs">
                              <MapPin className="h-3 w-3" />
                              {item.room}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-4">
          {schedule.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No classes scheduled this semester</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {DAYS.map((day) => {
                const dayClasses = scheduleByDay[day];
                if (dayClasses.length === 0) return null;

                return (
                  <Card key={day}>
                    <CardHeader className="pb-2">
                      <CardTitle>{DAY_LABELS[day]}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="divide-y">
                        {dayClasses.map((item, idx) => (
                          <div key={idx} className="py-3 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="text-center min-w-[80px]">
                                <p className="text-sm font-medium">{formatTime(item.startTime)}</p>
                                <p className="text-xs text-muted-foreground">{formatTime(item.endTime)}</p>
                              </div>
                              <div>
                                <p className="font-medium">
                                  {item.course.code} - {item.course.name}
                                </p>
                                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                  {item.room && (
                                    <span className="flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {item.room}
                                    </span>
                                  )}
                                  {item.lecturer && (
                                    <span className="flex items-center gap-1">
                                      <User className="h-3 w-3" />
                                      {item.lecturer.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={courseColors.get(item.course.code)}
                            >
                              {item.class.name}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Course Legend */}
      {schedule.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Enrolled Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Array.from(courseColors.entries()).map(([code, color]) => {
                const course = schedule.find((s) => s.course.code === code)?.course;
                return (
                  <Badge key={code} variant="outline" className={color}>
                    {code} - {course?.name}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
