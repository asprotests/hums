import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MapPin, Building2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { libraryApi, type LibraryLocation } from '@/lib/api/library';
import { useToast } from '@/hooks/use-toast';

export function LocationsPage() {
  const { toast } = useToast();

  const [locations, setLocations] = useState<LibraryLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LibraryLocation | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const [form, setForm] = useState({
    name: '',
    building: '',
    floor: '',
    section: '',
    capacity: '',
    isActive: true,
  });

  useEffect(() => {
    loadLocations();
  }, [showInactive]);

  const loadLocations = async () => {
    try {
      setLoading(true);
      const response = await libraryApi.getLocations(showInactive);
      if (response.success && response.data) {
        setLocations(response.data);
      }
    } catch (err) {
      console.error('Failed to load locations:', err);
      toast({
        title: 'Error',
        description: 'Failed to load locations',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: '',
      building: '',
      floor: '',
      section: '',
      capacity: '',
      isActive: true,
    });
    setSelectedLocation(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (location: LibraryLocation) => {
    setSelectedLocation(location);
    setForm({
      name: location.name,
      building: location.building || '',
      floor: location.floor || '',
      section: location.section || '',
      capacity: location.capacity?.toString() || '',
      isActive: location.isActive,
    });
    setDialogOpen(true);
  };

  const openDeleteDialog = (location: LibraryLocation) => {
    setSelectedLocation(location);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.name) {
      toast({
        title: 'Validation Error',
        description: 'Name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const payload = {
        name: form.name,
        building: form.building || undefined,
        floor: form.floor || undefined,
        section: form.section || undefined,
        capacity: form.capacity ? parseInt(form.capacity) : undefined,
        isActive: form.isActive,
      };

      let response;
      if (selectedLocation) {
        response = await libraryApi.updateLocation(selectedLocation.id, payload);
      } else {
        response = await libraryApi.createLocation(payload);
      }

      if (response.success) {
        toast({
          title: 'Success',
          description: selectedLocation ? 'Location updated' : 'Location created',
        });
        setDialogOpen(false);
        resetForm();
        loadLocations();
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to save location',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to save location',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedLocation) return;

    try {
      const response = await libraryApi.deleteLocation(selectedLocation.id);
      if (response.success) {
        toast({ title: 'Success', description: 'Location deleted' });
        setDeleteDialogOpen(false);
        setSelectedLocation(null);
        loadLocations();
      } else {
        toast({
          title: 'Error',
          description: response.message || 'Failed to delete location',
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete location',
        variant: 'destructive',
      });
    }
  };

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
          <h1 className="text-3xl font-bold">Library Locations</h1>
          <p className="text-muted-foreground">
            Manage library buildings, floors, and sections
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="showInactive"
              checked={showInactive}
              onCheckedChange={setShowInactive}
            />
            <Label htmlFor="showInactive">Show inactive</Label>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Location
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{locations.length}</div>
            <p className="text-xs text-muted-foreground">
              Library locations
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {locations.filter((l) => l.isActive).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently in use
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {locations.reduce((sum, l) => sum + (l.capacity || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Shelf capacity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Locations Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Locations</CardTitle>
          <CardDescription>
            Library locations and their details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {locations.length === 0 ? (
            <div className="text-center py-8">
              <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">No locations yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Building</TableHead>
                  <TableHead>Floor</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Books</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((loc) => (
                  <TableRow key={loc.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{loc.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {loc.building ? (
                        <div className="flex items-center gap-1">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {loc.building}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {loc.floor ? (
                        <div className="flex items-center gap-1">
                          <Layers className="h-4 w-4 text-muted-foreground" />
                          {loc.floor}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{loc.section || '-'}</TableCell>
                    <TableCell>{loc.capacity || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{loc.bookCount}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={loc.isActive ? 'default' : 'secondary'}>
                        {loc.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEditDialog(loc)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openDeleteDialog(loc)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedLocation ? 'Edit Location' : 'Add Location'}
            </DialogTitle>
            <DialogDescription>
              {selectedLocation
                ? 'Update location details'
                : 'Create a new library location'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Main Library"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="building">Building</Label>
                <Input
                  id="building"
                  value={form.building}
                  onChange={(e) => setForm({ ...form, building: e.target.value })}
                  placeholder="Building A"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floor">Floor</Label>
                <Input
                  id="floor"
                  value={form.floor}
                  onChange={(e) => setForm({ ...form, floor: e.target.value })}
                  placeholder="2nd Floor"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  value={form.section}
                  onChange={(e) => setForm({ ...form, section: e.target.value })}
                  placeholder="A1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Shelf Capacity</Label>
                <Input
                  id="capacity"
                  type="number"
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  placeholder="100"
                />
              </div>
            </div>
            {selectedLocation && (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active Status</Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive locations cannot receive new books
                  </p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {selectedLocation ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Location</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedLocation?.name}"?
              {selectedLocation && selectedLocation.bookCount > 0 && (
                <span className="text-red-500 block mt-2">
                  This location has {selectedLocation.bookCount} books. You cannot delete it
                  until all books are moved to another location.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={selectedLocation ? selectedLocation.bookCount > 0 : true}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default LocationsPage;
