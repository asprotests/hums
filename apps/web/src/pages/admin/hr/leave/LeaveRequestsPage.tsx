import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, Check, X, Eye, Clock, CheckCircle, XCircle, Ban } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  leaveRequestsApi,
  type LeaveRequest,
  type LeaveStatus,
} from '@/lib/api/leaveRequests';
import { leaveTypesApi, type LeaveType } from '@/lib/api/leaveTypes';
import { Pagination } from '@/components/ui/pagination';
import { format } from 'date-fns';

export function LeaveRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'ALL'>(
    (searchParams.get('status') as LeaveStatus) || 'ALL'
  );
  const [leaveTypeFilter, setLeaveTypeFilter] = useState<string>(
    searchParams.get('leaveTypeId') || 'ALL'
  );

  // Action dialogs
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [actionType, setActionType] = useState<'view' | 'approve' | 'reject' | null>(null);
  const [remarks, setRemarks] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadLeaveTypes();
  }, []);

  useEffect(() => {
    loadRequests();
  }, [searchParams]);

  const loadLeaveTypes = async () => {
    try {
      const response = await leaveTypesApi.getLeaveTypes();
      if (response.success && response.data) {
        setLeaveTypes(response.data);
      }
    } catch (err) {
      console.error('Failed to load leave types:', err);
    }
  };

  const loadRequests = async () => {
    try {
      setLoading(true);
      const page = parseInt(searchParams.get('page') || '1');
      const status = searchParams.get('status') as LeaveStatus | null;
      const leaveTypeId = searchParams.get('leaveTypeId');

      const response = await leaveRequestsApi.getRequests({
        page,
        limit: 20,
        status: status || undefined,
        leaveTypeId: leaveTypeId || undefined,
      });

      if (response.success && response.data) {
        setRequests(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load leave requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value && value !== 'ALL') {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', String(page));
    setSearchParams(newParams);
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    try {
      setProcessing(true);

      if (actionType === 'approve') {
        await leaveRequestsApi.approveRequest(selectedRequest.id, { remarks });
      } else if (actionType === 'reject') {
        await leaveRequestsApi.rejectRequest(selectedRequest.id, { remarks });
      }

      setSelectedRequest(null);
      setActionType(null);
      setRemarks('');
      loadRequests();
    } catch (err) {
      console.error('Failed to process request:', err);
    } finally {
      setProcessing(false);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Leave Requests</h1>
          <p className="text-muted-foreground">Review and manage employee leave requests</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="w-48">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as LeaveStatus | 'ALL');
                  handleFilterChange('status', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-48">
              <Label className="text-xs text-muted-foreground">Leave Type</Label>
              <Select
                value={leaveTypeFilter}
                onValueChange={(value) => {
                  setLeaveTypeFilter(value);
                  handleFilterChange('leaveTypeId', value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  {leaveTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Leave Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No leave requests found
                      </TableCell>
                    </TableRow>
                  ) : (
                    requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">
                              {request.employee.user.firstName} {request.employee.user.lastName}
                            </span>
                            <span className="block text-sm text-muted-foreground">
                              {request.employee.employeeId}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{request.leaveType.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {format(new Date(request.startDate), 'MMM d')} -{' '}
                            {format(new Date(request.endDate), 'MMM d, yyyy')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{request.totalDays} days</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(request.createdAt), 'MMM d, yyyy')}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionType('view');
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {request.status === 'PENDING' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-green-600"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setActionType('approve');
                                  }}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setActionType('reject');
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {pagination.totalPages > 1 && (
                <div className="mt-4">
                  <Pagination
                    currentPage={pagination.page}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View/Action Dialog */}
      <Dialog
        open={!!selectedRequest && !!actionType}
        onOpenChange={() => {
          setSelectedRequest(null);
          setActionType(null);
          setRemarks('');
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'view' && 'Leave Request Details'}
              {actionType === 'approve' && 'Approve Leave Request'}
              {actionType === 'reject' && 'Reject Leave Request'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'view' && 'View detailed information about this leave request'}
              {actionType === 'approve' && 'Confirm approval of this leave request'}
              {actionType === 'reject' && 'Provide a reason for rejecting this request'}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Employee</Label>
                  <p className="font-medium">
                    {selectedRequest.employee.user.firstName}{' '}
                    {selectedRequest.employee.user.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.employee.employeeId}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Department</Label>
                  <p className="font-medium">
                    {selectedRequest.employee.department?.name || 'N/A'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Leave Type</Label>
                  <p className="font-medium">{selectedRequest.leaveType.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedRequest.leaveType.isPaid ? 'Paid Leave' : 'Unpaid Leave'}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Duration</Label>
                  <p className="font-medium">{selectedRequest.totalDays} days</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Start Date</Label>
                  <p className="font-medium">
                    {format(new Date(selectedRequest.startDate), 'MMMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">End Date</Label>
                  <p className="font-medium">
                    {format(new Date(selectedRequest.endDate), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Reason</Label>
                <p className="mt-1 text-sm">{selectedRequest.reason}</p>
              </div>

              {selectedRequest.documentUrl && (
                <div>
                  <Label className="text-xs text-muted-foreground">Supporting Document</Label>
                  <a
                    href={selectedRequest.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View Document
                  </a>
                </div>
              )}

              {selectedRequest.approver && (
                <div>
                  <Label className="text-xs text-muted-foreground">
                    {selectedRequest.status === 'APPROVED' ? 'Approved By' : 'Rejected By'}
                  </Label>
                  <p className="font-medium">
                    {selectedRequest.approver.firstName} {selectedRequest.approver.lastName}
                  </p>
                  {selectedRequest.approverRemarks && (
                    <p className="text-sm text-muted-foreground">
                      "{selectedRequest.approverRemarks}"
                    </p>
                  )}
                </div>
              )}

              {(actionType === 'approve' || actionType === 'reject') && (
                <div className="space-y-2">
                  <Label htmlFor="remarks">
                    Remarks {actionType === 'reject' && '(Required)'}
                  </Label>
                  <Textarea
                    id="remarks"
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder={
                      actionType === 'reject'
                        ? 'Please provide a reason for rejection...'
                        : 'Optional remarks...'
                    }
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRequest(null);
                setActionType(null);
                setRemarks('');
              }}
            >
              {actionType === 'view' ? 'Close' : 'Cancel'}
            </Button>
            {actionType === 'approve' && (
              <Button onClick={handleAction} disabled={processing} className="bg-green-600">
                {processing ? 'Processing...' : 'Approve Request'}
              </Button>
            )}
            {actionType === 'reject' && (
              <Button
                onClick={handleAction}
                disabled={processing || !remarks}
                variant="destructive"
              >
                {processing ? 'Processing...' : 'Reject Request'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LeaveRequestsPage;
