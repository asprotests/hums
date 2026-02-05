import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Download, Filter, Clock, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getAuditLogs,
  getAuditStatistics,
  exportAuditLogs,
  type AuditLog,
  type AuditStatistics,
  type PaginatedAuditLogs,
  AUDIT_ACTIONS,
  AUDIT_RESOURCES,
} from '@/lib/api/audit';

export function AuditLogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [statistics, setStatistics] = useState<AuditStatistics | null>(null);
  const [pagination, setPagination] = useState<PaginatedAuditLogs['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const action = searchParams.get('action') || '';
  const resource = searchParams.get('resource') || '';

  useEffect(() => {
    loadAuditLogs();
    loadStatistics();
  }, [page, search, action, resource]);

  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await getAuditLogs({
        page,
        limit: 20,
        search: search || undefined,
        action: action || undefined,
        resource: resource || undefined,
      });
      setLogs(response.data);
      setPagination(response.pagination);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await getAuditStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  const handleSearch = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleActionFilter = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set('action', value);
    } else {
      params.delete('action');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleResourceFilter = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') {
      params.set('resource', value);
    } else {
      params.delete('resource');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await exportAuditLogs({
        search: search || undefined,
        action: action || undefined,
        resource: resource || undefined,
      });

      // Download the CSV
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export audit logs:', error);
    } finally {
      setExporting(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
  };

  const getActionBadgeVariant = (actionType: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (actionType) {
      case 'CREATE':
        return 'default';
      case 'UPDATE':
        return 'secondary';
      case 'DELETE':
        return 'destructive';
      case 'LOGIN':
      case 'LOGOUT':
        return 'outline';
      case 'LOGIN_FAILED':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">Track all system activity and changes</p>
        </div>
        <Button onClick={handleExport} disabled={exporting}>
          <Download className="mr-2 h-4 w-4" />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Logs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.totalLogs.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Last 24 Hours</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.last24Hours.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Top Action</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.entries(statistics.byAction).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Top Resource</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.entries(statistics.byResource).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by user, resource..."
                className="pl-10"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <Select value={action || 'all'} onValueChange={handleActionFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {Object.entries(AUDIT_ACTIONS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={resource || 'all'} onValueChange={handleResourceFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Resources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Resources</SelectItem>
                {Object.entries(AUDIT_RESOURCES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Audit Log Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>Resource ID</TableHead>
                <TableHead>IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No audit logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatDate(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      {log.user ? (
                        <div>
                          <div className="font-medium">
                            {log.user.firstName} {log.user.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {log.user.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">System</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {AUDIT_ACTIONS[log.action as keyof typeof AUDIT_ACTIONS] || log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>{log.resource}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {log.resourceId ? log.resourceId.substring(0, 8) + '...' : '-'}
                      </code>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {log.ipAddress || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} entries
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuditLogPage;
