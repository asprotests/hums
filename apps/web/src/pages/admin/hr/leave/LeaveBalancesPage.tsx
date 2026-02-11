import { useState, useEffect } from 'react';
import { Calendar, RefreshCw, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  leaveRequestsApi,
} from '@/lib/api/leaveRequests';
import { leaveTypesApi, type LeaveType } from '@/lib/api/leaveTypes';

export function LeaveBalancesPage() {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  // Allocation dialog
  const [showAllocate, setShowAllocate] = useState(false);
  const [allocateForm, setAllocateForm] = useState({
    employeeId: '',
    leaveTypeId: '',
    days: 0,
  });
  const [allocating, setAllocating] = useState(false);

  // Carry forward dialog
  const [showCarryForward, setShowCarryForward] = useState(false);
  const [carryForwardYear, setCarryForwardYear] = useState(new Date().getFullYear() - 1);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadLeaveTypes();
  }, []);

  const loadLeaveTypes = async () => {
    try {
      setLoading(true);
      const response = await leaveTypesApi.getLeaveTypes();
      if (response.success && response.data) {
        setLeaveTypes(response.data);
      }
    } catch (err) {
      console.error('Failed to load leave types:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAllocate = async () => {
    try {
      setAllocating(true);
      await leaveRequestsApi.allocateLeave({
        employeeId: allocateForm.employeeId,
        leaveTypeId: allocateForm.leaveTypeId,
        year,
        days: allocateForm.days,
      });
      setShowAllocate(false);
      setAllocateForm({ employeeId: '', leaveTypeId: '', days: 0 });
    } catch (err) {
      console.error('Failed to allocate leave:', err);
    } finally {
      setAllocating(false);
    }
  };

  const handleCarryForward = async () => {
    try {
      setProcessing(true);
      await leaveRequestsApi.carryForwardLeaves({ year: carryForwardYear });
      setShowCarryForward(false);
    } catch (err) {
      console.error('Failed to carry forward leaves:', err);
    } finally {
      setProcessing(false);
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Balances</h1>
          <p className="text-muted-foreground">Manage employee leave allocations and balances</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setShowCarryForward(true)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Year-End Carry Forward
          </Button>
          <Button onClick={() => setShowAllocate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Allocate Leave
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        {leaveTypes.slice(0, 6).map((type) => (
          <Card key={type.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">{type.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{type.daysPerYear}</div>
              <p className="text-xs text-muted-foreground">days/year</p>
              {type.carryForward && (
                <Badge variant="outline" className="mt-2 text-xs">
                  Carry: max {type.maxCarryDays}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leave Types Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Type Configuration</CardTitle>
          <CardDescription>
            Overview of leave types and their annual allocations for {year}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Days/Year</TableHead>
                  <TableHead>Carry Forward</TableHead>
                  <TableHead>Max Carry</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaveTypes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No leave types configured
                    </TableCell>
                  </TableRow>
                ) : (
                  leaveTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <span className="font-medium">{type.name}</span>
                            {type.nameLocal && (
                              <span className="block text-sm text-muted-foreground">
                                {type.nameLocal}
                              </span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{type.daysPerYear} days</Badge>
                      </TableCell>
                      <TableCell>
                        {type.carryForward ? (
                          <Badge variant="default">Yes</Badge>
                        ) : (
                          <Badge variant="outline">No</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {type.carryForward ? `${type.maxCarryDays} days` : '-'}
                      </TableCell>
                      <TableCell>
                        {type.isPaid ? (
                          <Badge variant="default">Paid</Badge>
                        ) : (
                          <Badge variant="outline">Unpaid</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {type.isActive ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Balance Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">Allocate Leave</h4>
              <p className="text-sm text-muted-foreground">
                Use "Allocate Leave" to manually set or adjust an employee's leave balance for a
                specific leave type and year.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Year-End Carry Forward</h4>
              <p className="text-sm text-muted-foreground">
                Run the carry forward process at the end of each year to automatically transfer
                unused leave days to the next year (for eligible leave types).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allocate Leave Dialog */}
      <Dialog open={showAllocate} onOpenChange={setShowAllocate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate Leave</DialogTitle>
            <DialogDescription>
              Allocate leave days to an employee for {year}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee ID</Label>
              <Input
                id="employeeId"
                value={allocateForm.employeeId}
                onChange={(e) =>
                  setAllocateForm({ ...allocateForm, employeeId: e.target.value })
                }
                placeholder="Enter employee ID"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="leaveType">Leave Type</Label>
              <Select
                value={allocateForm.leaveTypeId}
                onValueChange={(value) =>
                  setAllocateForm({ ...allocateForm, leaveTypeId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} ({type.daysPerYear} days/year)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="days">Days to Allocate</Label>
              <Input
                id="days"
                type="number"
                min={0}
                value={allocateForm.days}
                onChange={(e) =>
                  setAllocateForm({ ...allocateForm, days: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAllocate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAllocate}
              disabled={
                allocating ||
                !allocateForm.employeeId ||
                !allocateForm.leaveTypeId ||
                allocateForm.days <= 0
              }
            >
              {allocating ? 'Allocating...' : 'Allocate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Carry Forward Dialog */}
      <Dialog open={showCarryForward} onOpenChange={setShowCarryForward}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Year-End Carry Forward</DialogTitle>
            <DialogDescription>
              Carry forward unused leave days from the previous year
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="carryYear">Carry Forward From Year</Label>
              <Select
                value={String(carryForwardYear)}
                onValueChange={(v) => setCarryForwardYear(parseInt(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.slice(0, -1).map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y} to {y + 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-md bg-muted p-4">
              <h4 className="font-medium mb-2">What this will do:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  - Calculate unused leave for all employees for {carryForwardYear}
                </li>
                <li>- Apply carry forward rules based on leave type settings</li>
                <li>
                  - Create {carryForwardYear + 1} balances with carried forward days
                </li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCarryForward(false)}>
              Cancel
            </Button>
            <Button onClick={handleCarryForward} disabled={processing}>
              {processing ? 'Processing...' : 'Run Carry Forward'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LeaveBalancesPage;
