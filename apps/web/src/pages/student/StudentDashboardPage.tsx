import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap,
  BookOpen,
  DollarSign,
  Calendar,
  Clock,
  Bell,
  FileText,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { studentPortalApi, type DashboardData } from '@/lib/api/studentPortal';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export function StudentDashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const response = await studentPortalApi.getDashboard();
      if (response.success && response.data) {
        setDashboard(response.data);
      }
    } catch (err: any) {
      console.error('Failed to load dashboard:', err);
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
      <div className="text-center py-12">
        <p className="text-destructive">{error}</p>
        <Button className="mt-4" onClick={loadDashboard}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={dashboard?.student.avatar} />
            <AvatarFallback className="text-lg">
              {dashboard?.student.name.split(' ').map((n) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">Welcome, {dashboard?.student.name.split(' ')[0]}!</h1>
            <p className="text-muted-foreground">
              {dashboard?.student.studentId} | {dashboard?.student.program?.code}
            </p>
            {dashboard?.semester && (
              <Badge variant="outline" className="mt-1">
                {dashboard.semester.name}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enrolled Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.stats.enrolledCourses || 0}</div>
            <p className="text-xs text-muted-foreground">This semester</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cumulative GPA</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard?.stats.cumulativeGPA?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.stats.totalCredits || 0} credits earned
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Attendance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              (dashboard?.stats.attendanceRate || 0) < 75 ? 'text-destructive' :
              (dashboard?.stats.attendanceRate || 0) < 80 ? 'text-amber-600' : 'text-green-600'
            }`}>
              {dashboard?.stats.attendanceRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">Overall rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              (dashboard?.stats.outstandingBalance || 0) > 0 ? 'text-amber-600' : 'text-green-600'
            }`}>
              {formatCurrency(dashboard?.stats.outstandingBalance || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Outstanding</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Today's Classes
            </CardTitle>
            <CardDescription>Your schedule for today</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard?.todayClasses && dashboard.todayClasses.length > 0 ? (
              <div className="space-y-3">
                {dashboard.todayClasses.map((cls, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {formatTime(cls.startTime)} - {formatTime(cls.endTime)}
                      </div>
                      <div>
                        <p className="font-medium">{cls.course.code}</p>
                        <p className="text-sm text-muted-foreground">{cls.course.name}</p>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      {cls.room && <p className="font-medium">{cls.room}</p>}
                      {cls.lecturer && (
                        <p className="text-muted-foreground">{cls.lecturer}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No classes scheduled for today</p>
              </div>
            )}
            <Link to="/student/schedule" className="block mt-4">
              <Button variant="outline" className="w-full">
                View Full Schedule
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Announcements
            </CardTitle>
            <CardDescription>Latest updates</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard?.recentAnnouncements && dashboard.recentAnnouncements.length > 0 ? (
              <div className="space-y-3">
                {dashboard.recentAnnouncements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{announcement.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(announcement.publishedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline">{announcement.type}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No recent announcements</p>
              </div>
            )}
            <Link to="/student/announcements" className="block mt-4">
              <Button variant="outline" className="w-full">
                View All Announcements
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and services</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Link to="/student/grades">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                <GraduationCap className="h-6 w-6" />
                <span>View Grades</span>
              </Button>
            </Link>
            <Link to="/student/schedule">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                <Calendar className="h-6 w-6" />
                <span>View Schedule</span>
              </Button>
            </Link>
            <Link to="/student/finance">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                <DollarSign className="h-6 w-6" />
                <span>View Balance</span>
              </Button>
            </Link>
            <Link to="/student/transcript">
              <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2">
                <FileText className="h-6 w-6" />
                <span>Download Transcript</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
