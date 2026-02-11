import { useState, useEffect } from 'react';
import { Plus, Calendar, Clock, CheckCircle, XCircle, Ban, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { employeePortalApi } from '@/lib/api/employeePortal';
import { leaveTypesApi, type LeaveType } from '@/lib/api/leaveTypes';
import type { LeaveBalance, LeaveRequest, LeaveStatus, CreateLeaveRequestInput } from '@/lib/api/leaveRequests';
import { format } from 'date-fns';

export function MyLeavePage() {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  // Request form
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateLeaveRequestInput>({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cancel dialog
  const [cancelRequestId, setCancelRequestId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [year]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [balancesRes, requestsRes, typesRes] = await Promise.all([
        employeePortalApi.getLeaveBalances(year),
        employeePortalApi.getLeaveRequests(year),
        leaveTypesApi.getLeaveTypes(),
      ]);

      if (balancesRes.success && balancesRes.data) {
        setBalances(balancesRes.data);
      }
      if (requestsRes.success && requestsRes.data) {
        setRequests(requestsRes.data);
      }
      if (typesRes.success && typesRes.data) {
        setLeaveTypes(typesRes.data);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      await employeePortalApi.submitLeaveRequest(formData);
      setShowForm(false);
      setFormData({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelRequestId) return;
    try {
      await employeePortalApi.cancelLeaveRequest(cancelRequestId);
      setCancelRequestId(null);
      loadData();
    } catch (err) {
      console.error('Failed to cancel request:', err);
    }
  };

  const getStatusBadge = (status: LeaveStatus) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            Approved
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            Rejected
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge variant="outline" className="gap-1">
            <Ban className="h-3 w-3" />
            Cancelled
          </Badge>
        );
    }
  };

  const selectedLeaveType = leaveTypes.find((t) => t.id === formData.leaveTypeId);
  const selectedBalance = balances.find((b) => b.leaveTypeId === formData.leaveTypeId);

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Leave</h1>
          <p className="text-muted-foreground">View balances and manage leave requests</p>
        </div>
        <div className="flex gap-2">
          <Select value={String(year)} onValueChange={(v) => setYear(parseInt(v))}>
            <SelectTrigger className="w-28">
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
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Request Leave
          </Button>
        </div>
      </div>

      {/* Leave Balances */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Balances ({year})</CardTitle>
          <CardDescription>Your available leave days by type</CardDescription>
        </CardHeader>
        <CardContent>
          {balances.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No leave balances allocated for this year
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {balances.map((balance) => {
                const total = balance.allocated + balance.carriedForward;
                const used = balance.used + balance.pending;
                const available = balance.available;
                const percentage = total > 0 ? ((total - available) / total) * 100 : 0;

                return (
                  <Card key={balance.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{balance.leaveType.name}</span>
                        </div>
                        {balance.leaveType.isPaid ? (
                          <Badge variant="default" className="text-xs">Paid</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Unpaid</Badge>
                        )}
                      </div>
                      <Progress value={percentage} className="h-2 mb-2" />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {used} used of {total}
                        </span>
                        <span className="font-medium text-green-600">
                          {available} available
                        </span>
                      </div>
                      {balance.pending > 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          {balance.pending} days pending approval
                        </p>
                      )}
                      {balance.carriedForward > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Includes {balance.carriedForward} carried forward
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leave Requests */}
      <Card>
        <CardHeader>
          <CardTitle>My Requests</CardTitle>
          <CardDescription>Your leave request history for {year}</CardDescription>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No leave requests for this year
            </p>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-1 h-12 rounded-full ${
                        request.status === 'APPROVED'
                          ? 'bg-green-500'
                          : request.status === 'PENDING'
                          ? 'bg-amber-500'
                          : request.status === 'REJECTED'
                          ? 'bg-red-500'
                          : 'bg-gray-300'
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{request.leaveType.name}</span>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(request.startDate), 'MMM d')} -{' '}
                        {format(new Date(request.endDate), 'MMM d, yyyy')} ({request.totalDays}{' '}
                        days)
                      </p>
                      {request.reason && (
                        <p className="text-sm mt-1">{request.reason}</p>
                      )}
                      {request.approverRemarks && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Remarks: "{request.approverRemarks}"
                        </p>
                      )}
                    </div>
                  </div>
                  {(request.status === 'PENDING' || request.status === 'APPROVED') && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCancelRequestId(request.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Request Leave Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
            <DialogDescription>Submit a new leave request</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="leaveType">Leave Type</Label>
              <Select
                value={formData.leaveTypeId}
                onValueChange={(value) => setFormData({ ...formData, leaveTypeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBalance && (
                <p className="text-xs text-muted-foreground">
                  Available: {selectedBalance.available} days
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="Brief reason for leave request"
                rows={3}
              />
            </div>

            {selectedLeaveType?.requiresDocument && (
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                This leave type requires a supporting document. Please submit the document to HR.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                submitting ||
                !formData.leaveTypeId ||
                !formData.startDate ||
                !formData.endDate ||
                !formData.reason
              }
            >
              {submitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation */}
      <AlertDialog open={!!cancelRequestId} onOpenChange={() => setCancelRequestId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Leave Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this leave request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Request</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel}>Cancel Request</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default MyLeavePage;
