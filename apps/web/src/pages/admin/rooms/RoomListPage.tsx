import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, Building2, Users, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { roomsApi, type Room, type PaginatedRooms, type RoomType } from '@/lib/api/rooms';

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: 'CLASSROOM', label: 'Classroom' },
  { value: 'LAB', label: 'Lab' },
  { value: 'AUDITORIUM', label: 'Auditorium' },
  { value: 'SEMINAR_ROOM', label: 'Seminar Room' },
];

export function RoomListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [buildings, setBuildings] = useState<string[]>([]);
  const [pagination, setPagination] = useState<PaginatedRooms['pagination'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteRoomId, setDeleteRoomId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const page = parseInt(searchParams.get('page') || '1');
  const search = searchParams.get('search') || '';
  const building = searchParams.get('building') || '';
  const roomType = searchParams.get('roomType') || '';

  useEffect(() => {
    loadRooms();
    loadBuildings();
  }, [page, search, building, roomType]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const response = await roomsApi.getRooms({
        page,
        limit: 10,
        search: search || undefined,
        building: building || undefined,
        roomType: roomType as RoomType || undefined,
      });
      if (response.success && response.data) {
        setRooms(response.data.data);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Failed to load rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBuildings = async () => {
    try {
      const response = await roomsApi.getBuildings();
      if (response.success && response.data) {
        setBuildings(response.data);
      }
    } catch (error) {
      console.error('Failed to load buildings:', error);
    }
  };

  const handleFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value && value !== 'all') params.set(key, value);
    else params.delete(key);
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleDelete = async () => {
    if (!deleteRoomId) return;
    try {
      setDeleteError(null);
      await roomsApi.deleteRoom(deleteRoomId);
      loadRooms();
      setDeleteRoomId(null);
    } catch (error: any) {
      setDeleteError(error.response?.data?.message || 'Failed to delete room');
    }
  };

  const getRoomTypeBadge = (type: RoomType) => {
    switch (type) {
      case 'CLASSROOM': return <Badge variant="default">Classroom</Badge>;
      case 'LAB': return <Badge variant="secondary">Lab</Badge>;
      case 'AUDITORIUM': return <Badge className="bg-purple-500">Auditorium</Badge>;
      case 'SEMINAR_ROOM': return <Badge variant="outline">Seminar</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Rooms</h1>
          <p className="text-muted-foreground">Manage classrooms and facilities</p>
        </div>
        <Link to="/admin/rooms/new">
          <Button><Plus className="mr-2 h-4 w-4" />Add Room</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />Room List
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 md:flex-row md:items-center mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => handleFilter('search', e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={building || 'all'} onValueChange={(v) => handleFilter('building', v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Building" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Buildings</SelectItem>
                {buildings.map((b) => (
                  <SelectItem key={b} value={b}>{b}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={roomType || 'all'} onValueChange={(v) => handleFilter('roomType', v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Room Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {ROOM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Facilities</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rooms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No rooms found
                      </TableCell>
                    </TableRow>
                  ) : (
                    rooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell className="font-medium">{room.name}</TableCell>
                        <TableCell>{room.building || '-'}</TableCell>
                        <TableCell>{getRoomTypeBadge(room.roomType)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            {room.capacity}
                          </div>
                        </TableCell>
                        <TableCell>
                          {room.facilities.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {room.facilities.slice(0, 3).map((f, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{f}</Badge>
                              ))}
                              {room.facilities.length > 3 && (
                                <Badge variant="outline" className="text-xs">+{room.facilities.length - 3}</Badge>
                              )}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {room.isActive ? (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="h-3 w-3 mr-1" />Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="h-3 w-3 mr-1" />Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Link to={`/admin/rooms/${room.id}/edit`}>
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteRoomId(room.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                    {pagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilter('page', String(pagination.page - 1))}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilter('page', String(pagination.page + 1))}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteRoomId} onOpenChange={() => { setDeleteRoomId(null); setDeleteError(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Room</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This cannot be undone.
              {deleteError && <p className="mt-2 text-destructive font-medium">{deleteError}</p>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
