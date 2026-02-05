import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, Users, Clock, AlertTriangle, Calendar, Building, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { employeeAttendanceApi, type MonthlyReport } from '@/lib/api/employeeAttendance';
import { departmentsApi, type Department } from '@/lib/api/departments';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export function EmployeeAttendanceReportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get('year') || String(currentYear));
  const departmentId = searchParams.get('departmentId') || '';

  useEffect(() => {
    loadData();
  }, [month, year, departmentId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reportData, deptData] = await Promise.all([
        employeeAttendanceApi.getMonthlyReport(month, year, departmentId || undefined),
        departmentsApi.getDepartments({ limit: 100 }),
      ]);
      setReport(reportData);
      if (deptData.success && deptData.data) {
        setDepartments(deptData.data.data);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') params.set(key, value);
    else params.delete(key);
    setSearchParams(params);
  };

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-green-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Employee Attendance Report</h1>
        <p className="text-muted-foreground">
          Monthly attendance summary for {MONTHS.find(m => m.value === month)?.label} {year}
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Select value={String(month)} onValueChange={(v) => handleFilter('month', v)}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m) => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={(v) => handleFilter('year', v)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={departmentId || 'all'} onValueChange={(v) => handleFilter('departmentId', v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Departments" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {report && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-2xl font-bold">{report.totalEmployees}</p>
                    <p className="text-sm text-muted-foreground">Total Employees</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className={`h-5 w-5 ${getAttendanceColor(report.overallStatistics.averageAttendancePercentage)}`} />
                  <div>
                    <p className={`text-2xl font-bold ${getAttendanceColor(report.overallStatistics.averageAttendancePercentage)}`}>
                      {report.overallStatistics.averageAttendancePercentage}%
                    </p>
                    <p className="text-sm text-muted-foreground">Average Attendance</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-2xl font-bold">{report.overallStatistics.totalPresent}</p>
                    <p className="text-sm text-muted-foreground">Total Present Days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{report.overallStatistics.totalLateArrivals}</p>
                    <p className="text-sm text-muted-foreground">Late Arrivals</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Employee Report Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Employee Details
              </CardTitle>
              <CardDescription>
                Individual attendance statistics for each employee
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Present</TableHead>
                    <TableHead>Absent</TableHead>
                    <TableHead>Half Day</TableHead>
                    <TableHead>Leave</TableHead>
                    <TableHead>Late</TableHead>
                    <TableHead>Avg Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.employees.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No employee data found
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.employees.map((emp) => (
                      <TableRow key={emp.employee.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{emp.employee.name}</p>
                            <p className="text-sm text-muted-foreground">{emp.employee.employeeId}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Building className="h-4 w-4 text-muted-foreground" />
                            {emp.employee.department || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={emp.attendancePercentage}
                              className={`h-2 w-16 ${getProgressColor(emp.attendancePercentage)}`}
                            />
                            <span className={`font-medium ${getAttendanceColor(emp.attendancePercentage)}`}>
                              {emp.attendancePercentage}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-green-600">{emp.present}</TableCell>
                        <TableCell className="text-red-600">{emp.absent}</TableCell>
                        <TableCell className="text-yellow-600">{emp.halfDay}</TableCell>
                        <TableCell className="text-purple-600">{emp.onLeave}</TableCell>
                        <TableCell>
                          {emp.lateArrivals > 0 ? (
                            <Badge variant="outline" className="text-orange-600">
                              {emp.lateArrivals}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {emp.averageWorkHours.toFixed(1)}h
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Present Days</span>
                    <span className="font-medium text-green-600">{report.overallStatistics.totalPresent}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Absent Days</span>
                    <span className="font-medium text-red-600">{report.overallStatistics.totalAbsent}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Late Arrivals</span>
                    <span className="font-medium text-yellow-600">{report.overallStatistics.totalLateArrivals}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Report Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Report Period</span>
                    <span className="font-medium">
                      {MONTHS.find(m => m.value === report.month)?.label} {report.year}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Employees</span>
                    <span className="font-medium">{report.totalEmployees}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Average Attendance</span>
                    <span className={`font-medium ${getAttendanceColor(report.overallStatistics.averageAttendancePercentage)}`}>
                      {report.overallStatistics.averageAttendancePercentage}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
