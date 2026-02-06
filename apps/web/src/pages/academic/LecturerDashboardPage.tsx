import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Users,
  MapPin,
  AlertTriangle,
  Calendar,
  GraduationCap,
  ChevronRight,
  Play,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  lecturerDashboardApi,
  type LecturerDashboard,
  type LecturerClassSummary,
  type ScheduleItem,
  type PendingTask,
} from '@/lib/api/lecturerDashboard';

export function LecturerDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<LecturerDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await lecturerDashboardApi.getDashboard();
      if (result.success) {
        setDashboard(result.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
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

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-destructive">{error}</p>
        <Button onClick={loadDashboard} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Welcome back!</h1>
          <p className="text-muted-foreground">
            {dashboard.currentSemester.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {today}
          </Badge>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.statistics.totalClasses}</div>
            <p className="text-xs text-muted-foreground">Active this semester</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.statistics.totalStudents}</div>
            <p className="text-xs text-muted-foreground">Enrolled in your classes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Attendance</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.statistics.averageAttendance}%</div>
            <Progress value={dashboard.statistics.averageAttendance} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Grades</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.statistics.pendingGrades}</div>
            <p className="text-xs text-muted-foreground">Grades to be entered</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today's Schedule
          </CardTitle>
          <CardDescription>
            {dashboard.todaySchedule.length === 0
              ? 'No classes scheduled for today'
              : `${dashboard.todaySchedule.length} class(es) today`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dashboard.todaySchedule.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No classes scheduled for today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {dashboard.todaySchedule.map((item, index) => (
                <ScheduleItemCard key={index} item={item} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Classes and Pending Tasks Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* My Classes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>My Classes</CardTitle>
              <CardDescription>
                {dashboard.classes.length} active class(es)
              </CardDescription>
            </div>
            <Link to="/academic/classes">
              <Button variant="ghost" size="sm">
                View All
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboard.classes.slice(0, 4).map((cls) => (
                <ClassCard key={cls.classId} classData={cls} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Pending Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pending Tasks</CardTitle>
              <CardDescription>
                {dashboard.pendingTasks.length} task(s) requiring attention
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {dashboard.pendingTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No pending tasks</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dashboard.pendingTasks.map((task, index) => (
                  <TaskCard key={index} task={task} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {dashboard.recentActivity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard.recentActivity.map((activity, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 text-sm border-l-2 border-muted pl-4"
                >
                  <div className="flex-1">
                    <p className="font-medium">{activity.description}</p>
                    {activity.className && (
                      <p className="text-muted-foreground">{activity.className}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Sub-components

function ScheduleItemCard({ item }: { item: ScheduleItem }) {
  return (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <div className="flex flex-col items-center justify-center bg-primary/10 rounded-lg px-3 py-2">
        <span className="text-lg font-bold text-primary">{item.startTime}</span>
        <span className="text-xs text-muted-foreground">{item.endTime}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{item.className}</span>
          <Badge variant="outline" className="text-xs">
            {item.scheduleType}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground truncate">{item.courseName}</p>
        {item.roomName && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <MapPin className="h-3 w-3" />
            {item.roomName}
          </div>
        )}
      </div>
      <Link to={`/academic/classes/${item.classId}/attendance`}>
        <Button size="sm">
          <Play className="h-4 w-4 mr-1" />
          Start
        </Button>
      </Link>
    </div>
  );
}

function ClassCard({ classData }: { classData: LecturerClassSummary }) {
  return (
    <Link to={`/academic/classes/${classData.classId}`}>
      <div className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="font-semibold">{classData.className}</span>
            <Badge variant="outline" className="ml-2 text-xs">
              {classData.courseCode}
            </Badge>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground mb-3 truncate">{classData.courseName}</p>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span>{classData.enrolledCount}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Att:</span>
            <span>{classData.attendancePercentage}%</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Grades:</span>
            <span>{classData.gradingProgress}%</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function TaskCard({ task }: { task: PendingTask }) {
  const getPriorityColor = (priority: PendingTask['priority']) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-500';
      case 'MEDIUM':
        return 'bg-yellow-500';
      case 'LOW':
        return 'bg-blue-500';
    }
  };

  const getTaskIcon = (type: PendingTask['type']) => {
    switch (type) {
      case 'ATTENDANCE':
        return <Users className="h-4 w-4" />;
      case 'GRADING':
        return <GraduationCap className="h-4 w-4" />;
      case 'EXAM':
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getActionLink = () => {
    switch (task.type) {
      case 'ATTENDANCE':
        return `/academic/classes/${task.classId}/attendance`;
      case 'GRADING':
        return `/academic/classes/${task.classId}/grades`;
      case 'EXAM':
        return `/academic/exams`;
    }
  };

  return (
    <div className="flex items-start gap-3 rounded-lg border p-3">
      <div className={`rounded-full p-1.5 ${getPriorityColor(task.priority)} text-white`}>
        {getTaskIcon(task.type)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{task.description}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">{task.className}</span>
          {task.dueDate && (
            <span className="text-xs text-muted-foreground">
              Due: {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <Link to={getActionLink()}>
        <Button size="sm" variant="outline">
          {task.type === 'ATTENDANCE' ? 'Mark' : task.type === 'GRADING' ? 'Enter' : 'View'}
        </Button>
      </Link>
    </div>
  );
}

export default LecturerDashboardPage;
