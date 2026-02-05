import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Building2, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { roomsApi, type RoomType } from '@/lib/api/rooms';

const ROOM_TYPES: { value: RoomType; label: string }[] = [
  { value: 'CLASSROOM', label: 'Classroom' },
  { value: 'LAB', label: 'Lab' },
  { value: 'AUDITORIUM', label: 'Auditorium' },
  { value: 'SEMINAR_ROOM', label: 'Seminar Room' },
];

const FACILITY_OPTIONS = [
  'Projector',
  'Whiteboard',
  'Smart Board',
  'Computers',
  'Air Conditioning',
  'Sound System',
  'Video Conferencing',
  'Lab Equipment',
];

export function RoomFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [buildings, setBuildings] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    building: '',
    capacity: 30,
    roomType: 'CLASSROOM' as RoomType,
    facilities: [] as string[],
    isActive: true,
  });

  useEffect(() => {
    loadBuildings();
    if (isEdit && id) {
      loadRoom(id);
    }
  }, [id]);

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

  const loadRoom = async (roomId: string) => {
    try {
      setLoading(true);
      const response = await roomsApi.getRoomById(roomId);
      if (response.success && response.data) {
        const room = response.data;
        setFormData({
          name: room.name,
          building: room.building || '',
          capacity: room.capacity,
          roomType: room.roomType,
          facilities: room.facilities,
          isActive: room.isActive,
        });
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to load room');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (formData.capacity < 1) {
      setError('Capacity must be at least 1');
      return;
    }

    try {
      setSaving(true);
      if (isEdit && id) {
        await roomsApi.updateRoom(id, {
          name: formData.name,
          building: formData.building || null,
          capacity: formData.capacity,
          roomType: formData.roomType,
          facilities: formData.facilities,
          isActive: formData.isActive,
        });
      } else {
        await roomsApi.createRoom({
          name: formData.name,
          building: formData.building || undefined,
          capacity: formData.capacity,
          roomType: formData.roomType,
          facilities: formData.facilities,
        });
      }
      navigate('/admin/rooms');
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to save room');
    } finally {
      setSaving(false);
    }
  };

  const toggleFacility = (facility: string) => {
    setFormData((prev) => ({
      ...prev,
      facilities: prev.facilities.includes(facility)
        ? prev.facilities.filter((f) => f !== facility)
        : [...prev.facilities, facility],
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/rooms')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{isEdit ? 'Edit Room' : 'New Room'}</h1>
          <p className="text-muted-foreground">
            {isEdit ? 'Update room details' : 'Add a new room to the system'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />Room Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Room 101"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="building">Building</Label>
                <div className="flex gap-2">
                  <Select
                    value={formData.building || 'custom'}
                    onValueChange={(v) => v !== 'custom' && setFormData({ ...formData, building: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select building" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Enter custom...</SelectItem>
                      {buildings.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={formData.building}
                    onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                    placeholder="Building name"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Capacity *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min={1}
                  max={1000}
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="roomType">Room Type</Label>
                <Select
                  value={formData.roomType}
                  onValueChange={(v) => setFormData({ ...formData, roomType: v as RoomType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Facilities</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {FACILITY_OPTIONS.map((facility) => (
                  <div key={facility} className="flex items-center space-x-2">
                    <Checkbox
                      id={facility}
                      checked={formData.facilities.includes(facility)}
                      onCheckedChange={() => toggleFacility(facility)}
                    />
                    <label
                      htmlFor={facility}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {facility}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {isEdit && (
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/admin/rooms')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" />Save Room</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
