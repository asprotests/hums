import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { leaveRequestsApi, type LeaveRequest } from '@/lib/api/leaveRequests';
import { departmentsApi, type Department } from '@/lib/api/departments';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isWithinInterval, getDay } from 'date-fns';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const LEAVE_COLORS: Record<string, string> = {
  ANNUAL: 'bg-blue-500',
  SICK: 'bg-red-500',
  MATERNITY: 'bg-pink-500',
  PATERNITY: 'bg-purple-500',
  UNPAID: 'bg-gray-500',
  COMPASSIONATE: 'bg-amber-500',
  OTHER: 'bg-green-500',
};

export function LeaveCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    loadLeaves();
  }, [month, year, departmentFilter]);

  const loadDepartments = async () => {
    try {
      const response = await departmentsApi.getDepartments({ limit: 100 });
      if (response.success && response.data) {
        setDepartments(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load departments:', err);
    }
  };

  const loadLeaves = async () => {
    try {
      setLoading(true);
      const response = await leaveRequestsApi.getLeaveCalendar(
        month,
        year,
        departmentFilter !== 'ALL' ? departmentFilter : undefined
      );
      if (response.success && response.data) {
        setLeaves(response.data);
      }
    } catch (err) {
      console.error('Failed to load leave calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const getDaysInMonth = (): Date[] => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const getFirstDayOfMonth = () => {
    return getDay(startOfMonth(currentDate));
  };

  const getLeavesForDay = (day: Date) => {
    return leaves.filter((leave) => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      return isWithinInterval(day, { start, end }) || isSameDay(day, start) || isSameDay(day, end);
    });
  };

  const isWeekend = (day: Date) => {
    const dayOfWeek = getDay(day);
    return dayOfWeek === 5 || dayOfWeek === 6; // Friday and Saturday (Somalia work week)
  };

  const days = getDaysInMonth();
  const firstDayOffset = getFirstDayOfMonth();
  const emptyDays = Array(firstDayOffset).fill(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Calendar</h1>
          <p className="text-muted-foreground">View approved leaves across the organization</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Calendar Navigation */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl">
            {MONTHS[month - 1]} {year}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateMonth(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateMonth(1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-px bg-muted rounded-lg overflow-hidden">
              {/* Day Headers */}
              {DAYS.map((day) => (
                <div
                  key={day}
                  className="bg-background p-2 text-center text-sm font-medium text-muted-foreground"
                >
                  {day}
                </div>
              ))}

              {/* Empty cells for offset */}
              {emptyDays.map((_, i) => (
                <div key={`empty-${i}`} className="bg-background p-2 min-h-[100px]" />
              ))}

              {/* Days */}
              {days.map((day) => {
                const dayLeaves = getLeavesForDay(day);
                const weekend = isWeekend(day);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={day.toISOString()}
                    className={`bg-background p-2 min-h-[100px] ${
                      weekend ? 'bg-muted/50' : ''
                    }`}
                  >
                    <div
                      className={`text-sm font-medium mb-1 ${
                        isToday
                          ? 'bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center'
                          : ''
                      }`}
                    >
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      <TooltipProvider>
                        {dayLeaves.slice(0, 3).map((leave) => (
                          <Tooltip key={leave.id}>
                            <TooltipTrigger asChild>
                              <div
                                className={`text-xs px-1 py-0.5 rounded text-white truncate cursor-pointer ${
                                  LEAVE_COLORS[leave.leaveType.name.split(' ')[0].toUpperCase()] ||
                                  'bg-gray-500'
                                }`}
                              >
                                {leave.employee.user.firstName} {leave.employee.user.lastName[0]}.
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm">
                                <p className="font-medium">
                                  {leave.employee.user.firstName} {leave.employee.user.lastName}
                                </p>
                                <p className="text-muted-foreground">{leave.leaveType.name}</p>
                                <p className="text-xs">
                                  {format(new Date(leave.startDate), 'MMM d')} -{' '}
                                  {format(new Date(leave.endDate), 'MMM d')}
                                </p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        ))}
                        {dayLeaves.length > 3 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-xs text-muted-foreground cursor-pointer">
                                +{dayLeaves.length - 3} more
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="text-sm space-y-1">
                                {dayLeaves.slice(3).map((leave) => (
                                  <div key={leave.id}>
                                    {leave.employee.user.firstName} {leave.employee.user.lastName} -{' '}
                                    {leave.leaveType.name}
                                  </div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TooltipProvider>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {Object.entries(LEAVE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${color}`} />
                <span className="text-sm capitalize">{type.toLowerCase()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>
            Leaves this Month ({leaves.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaves.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No approved leaves for this month
            </p>
          ) : (
            <div className="space-y-2">
              {leaves.map((leave) => (
                <div
                  key={leave.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-8 rounded ${
                        LEAVE_COLORS[leave.leaveType.name.split(' ')[0].toUpperCase()] ||
                        'bg-gray-500'
                      }`}
                    />
                    <div>
                      <p className="font-medium">
                        {leave.employee.user.firstName} {leave.employee.user.lastName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {leave.employee.department?.name || 'No Department'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{leave.leaveType.name}</Badge>
                    <p className="text-sm text-muted-foreground mt-1">
                      {format(new Date(leave.startDate), 'MMM d')} -{' '}
                      {format(new Date(leave.endDate), 'MMM d')} ({leave.totalDays} days)
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default LeaveCalendarPage;
