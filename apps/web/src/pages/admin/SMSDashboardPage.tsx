import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  CheckCircle,
  XCircle,
  CreditCard,
  RefreshCw,
  Plus,
  Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { useToast } from '@/hooks/use-toast';
import { smsApi, type SMSLog, type SMSStats, type SMSBalance } from '@/lib/api/sms';

export function SMSDashboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SMSStats | null>(null);
  const [balance, setBalance] = useState<SMSBalance | null>(null);
  const [recentLogs, setRecentLogs] = useState<SMSLog[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, balanceRes, logsRes] = await Promise.all([
        smsApi.getStats(),
        smsApi.getBalance(),
        smsApi.getLogs({ limit: 10 }),
      ]);

      if (statsRes.success && statsRes.data) setStats(statsRes.data);
      if (balanceRes.success && balanceRes.data) setBalance(balanceRes.data);
      if (logsRes.success && logsRes.data) setRecentLogs(logsRes.data);
    } catch (error) {
      console.error('Failed to load SMS data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load SMS dashboard data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <Badge className="bg-green-100 text-green-800">Delivered</Badge>;
      case 'SENT':
        return <Badge className="bg-blue-100 text-blue-800">Sent</Badge>;
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatPhone = (phone: string) => {
    // Format Somalia phone numbers nicely
    if (phone.startsWith('+252')) {
      const num = phone.slice(4);
      return `+252 ${num.slice(0, 2)} ${num.slice(2, 5)} ${num.slice(5)}`;
    }
    return phone;
  };

  const truncateMessage = (message: string, maxLength = 50) => {
    if (message.length <= maxLength) return message;
    return message.slice(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SMS Dashboard</h1>
          <p className="text-muted-foreground">
            Manage SMS notifications and view delivery statistics
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button onClick={() => navigate('/admin/sms/send')}>
            <Plus className="mr-2 h-4 w-4" />
            Send SMS
          </Button>
        </div>
      </div>

      {/* Balance Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">SMS Balance</p>
                <p className="text-3xl font-bold">
                  {balance?.balance.toLocaleString()} <span className="text-lg font-normal">SMS</span>
                </p>
              </div>
            </div>
            <Button variant="outline">Top Up</Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Sent Today</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.today || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.thisMonth || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.deliveryRate?.toFixed(1) || 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.failed || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common SMS notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/admin/sms/bulk')}>
              <Send className="mr-2 h-4 w-4" />
              Send Bulk SMS
            </Button>
            <Button variant="outline" onClick={() => navigate('/admin/sms/reminders')}>
              <Clock className="mr-2 h-4 w-4" />
              Payment Reminders
            </Button>
            <Button variant="outline" onClick={() => navigate('/admin/sms/overdue')}>
              <MessageSquare className="mr-2 h-4 w-4" />
              Overdue Notices
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Messages */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Messages</CardTitle>
              <CardDescription>Latest SMS activity</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/admin/sms/logs')}>
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No SMS messages yet
                  </TableCell>
                </TableRow>
              ) : (
                recentLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-sm">
                      {formatPhone(log.to)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {truncateMessage(log.message)}
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default SMSDashboardPage;
