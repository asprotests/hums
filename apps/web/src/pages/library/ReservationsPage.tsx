import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarClock,
  RefreshCw,
  X,
  CheckCircle,
  Bell,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useToast } from '@/hooks/use-toast';
import { libraryApi, type Reservation, type ReservationStatus } from '@/lib/api/library';

export function ReservationsPage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [readyForPickup, setReadyForPickup] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'all');
  const [searchQuery, setSearchQuery] = useState('');

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab, searchParams]);

  const loadData = async () => {
    setLoading(true);
    try {
      const page = parseInt(searchParams.get('page') || '1');

      // Load ready for pickup
      const readyRes = await libraryApi.getReadyForPickup();
      if (readyRes.success && readyRes.data) {
        setReadyForPickup(readyRes.data);
      }

      // Load all reservations based on tab
      let status: ReservationStatus | undefined;
      if (activeTab === 'pending') status = 'PENDING';
      else if (activeTab === 'ready') status = 'READY';

      const response = await libraryApi.getReservations({
        page,
        limit: 20,
        status,
      });

      if (response.success && response.data) {
        setReservations(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load reservations:', err);
      toast({
        title: 'Failed to load reservations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    params.delete('page');
    setSearchParams(params);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(page));
    setSearchParams(params);
  };

  const handleCancel = async () => {
    if (!selectedReservation) return;

    setProcessing(true);
    try {
      const response = await libraryApi.cancelReservation(selectedReservation.id);
      if (response.success) {
        toast({
          title: 'Reservation cancelled',
        });
        setCancelDialogOpen(false);
        setSelectedReservation(null);
        loadData();
      }
    } catch (err: any) {
      toast({
        title: 'Failed to cancel reservation',
        description: err.response?.data?.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleFulfill = async (reservation: Reservation) => {
    setProcessing(true);
    try {
      const response = await libraryApi.fulfillReservation(reservation.id);
      if (response.success) {
        toast({
          title: 'Reservation fulfilled',
          description: 'The book has been issued to the user',
        });
        loadData();
      }
    } catch (err: any) {
      toast({
        title: 'Failed to fulfill reservation',
        description: err.response?.data?.message || 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: ReservationStatus) => {
    const config: Record<ReservationStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
      PENDING: { variant: 'secondary' },
      READY: { variant: 'default', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
      FULFILLED: { variant: 'outline', className: 'text-blue-600' },
      EXPIRED: { variant: 'destructive' },
      CANCELLED: { variant: 'outline', className: 'text-gray-500' },
    };
    const style = config[status];
    return (
      <Badge variant={style.variant} className={style.className}>
        {status}
      </Badge>
    );
  };

  const isExpiringSoon = (expiresAt: string) => {
    const expires = new Date(expiresAt);
    const now = new Date();
    const hoursLeft = (expires.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursLeft <= 24 && hoursLeft > 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reservations</h1>
          <p className="text-muted-foreground">
            Manage book reservations and pickup queue
          </p>
        </div>
        <Button variant="outline" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Ready for Pickup Alert */}
      {readyForPickup.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-700">
              <Bell className="h-5 w-5" />
              Ready for Pickup ({readyForPickup.length})
            </CardTitle>
            <CardDescription className="text-green-600">
              These reservations are ready to be issued
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {readyForPickup.slice(0, 5).map((reservation) => (
                <div
                  key={reservation.id}
                  className="flex items-center justify-between bg-white p-3 rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{reservation.book.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {reservation.user.firstName} {reservation.user.lastName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isExpiringSoon(reservation.expiresAt) && (
                      <Badge variant="destructive" className="text-xs">
                        Expires soon
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      onClick={() => handleFulfill(reservation)}
                      disabled={processing}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Issue
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="ready">Ready</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[200px]"
            />
          </div>
        </div>

        <Card className="mt-4">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : reservations.length === 0 ? (
              <div className="text-center py-16">
                <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-semibold">No reservations found</h3>
                <p className="text-muted-foreground">
                  {activeTab !== 'all'
                    ? `No ${activeTab} reservations`
                    : 'No reservation records yet'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Book</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Reserved</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Queue Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reservations.map((reservation) => (
                    <TableRow key={reservation.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{reservation.book.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {reservation.book.author}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {reservation.user.firstName} {reservation.user.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {reservation.user.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(reservation.reservedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <span
                          className={
                            isExpiringSoon(reservation.expiresAt)
                              ? 'text-red-600 font-medium'
                              : ''
                          }
                        >
                          {new Date(reservation.expiresAt).toLocaleDateString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        {reservation.queuePosition ? (
                          <Badge variant="outline">#{reservation.queuePosition}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {reservation.status === 'READY' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFulfill(reservation)}
                              disabled={processing}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {(reservation.status === 'PENDING' ||
                            reservation.status === 'READY') && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => {
                                setSelectedReservation(reservation);
                                setCancelDialogOpen(true);
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Tabs>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} reservations
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Cancel Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Reservation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the reservation for "
              {selectedReservation?.book.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Reservation</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              className="bg-red-600 hover:bg-red-700"
              disabled={processing}
            >
              {processing ? 'Cancelling...' : 'Cancel Reservation'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ReservationsPage;
