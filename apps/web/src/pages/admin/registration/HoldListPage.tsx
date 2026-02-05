import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, ShieldAlert, ShieldCheck } from 'lucide-react';
import { holdsApi, type Hold, type HoldType } from '@/lib/api/holds';
import { Button } from '@/components/ui/button';
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
import { Input } from '@/components/ui/input';
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
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export function HoldListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [holds, setHolds] = useState<Hold[]>([]);
  const [loading, setLoading] = useState(true);
  const [releaseId, setReleaseId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const type = (searchParams.get('type') as HoldType) || '';
  const isActive = searchParams.get('isActive') ?? 'true';

  // Form state for creating hold
  const [formData, setFormData] = useState({
    studentId: '',
    type: 'FINANCIAL' as HoldType,
    reason: '',
    blocksRegistration: true,
    blocksGrades: false,
    blocksTranscript: false,
  });

  useEffect(() => {
    loadHolds();
  }, [type, isActive]);

  const loadHolds = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (type) filters.type = type;
      if (isActive !== '') filters.isActive = isActive === 'true';

      const data = await holdsApi.getAll(filters);
      setHolds(data);
    } catch (error) {
      console.error('Failed to load holds:', error);
      toast({ variant: 'destructive', title: 'Failed to load holds' });
    } finally {
      setLoading(false);
    }
  };

  const handleRelease = async () => {
    if (!releaseId) return;

    try {
      await holdsApi.release(releaseId);
      toast({ title: 'Hold released successfully' });
      loadHolds();
    } catch (error) {
      console.error('Failed to release hold:', error);
      toast({ variant: 'destructive', title: 'Failed to release hold' });
    } finally {
      setReleaseId(null);
    }
  };

  const handleCreate = async () => {
    if (!formData.studentId || !formData.reason) {
      toast({ variant: 'destructive', title: 'Please fill in all required fields' });
      return;
    }

    try {
      await holdsApi.create(formData);
      toast({ title: 'Hold placed successfully' });
      setCreateDialogOpen(false);
      setFormData({
        studentId: '',
        type: 'FINANCIAL',
        reason: '',
        blocksRegistration: true,
        blocksGrades: false,
        blocksTranscript: false,
      });
      loadHolds();
    } catch (error: any) {
      console.error('Failed to create hold:', error);
      toast({
        variant: 'destructive',
        title: error.response?.data?.message || 'Failed to place hold',
      });
    }
  };

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params);
  };

  const getTypeBadge = (holdType: HoldType) => {
    const colors: Record<HoldType, string> = {
      FINANCIAL: 'bg-red-100 text-red-800',
      ACADEMIC: 'bg-orange-100 text-orange-800',
      LIBRARY: 'bg-blue-100 text-blue-800',
      DISCIPLINARY: 'bg-purple-100 text-purple-800',
      ADMINISTRATIVE: 'bg-gray-100 text-gray-800',
    };
    return <Badge className={colors[holdType]}>{holdType}</Badge>;
  };

  const getBlocksBadges = (hold: Hold) => {
    const badges = [];
    if (hold.blocksRegistration) badges.push('Registration');
    if (hold.blocksGrades) badges.push('Grades');
    if (hold.blocksTranscript) badges.push('Transcript');
    return badges.length > 0 ? badges.join(', ') : 'None';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Student Holds</h1>
          <p className="text-muted-foreground">
            Manage holds that block student registration and services
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Place Hold
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Select
              value={type}
              onValueChange={(value) => updateFilter('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="FINANCIAL">Financial</SelectItem>
                <SelectItem value="ACADEMIC">Academic</SelectItem>
                <SelectItem value="LIBRARY">Library</SelectItem>
                <SelectItem value="DISCIPLINARY">Disciplinary</SelectItem>
                <SelectItem value="ADMINISTRATIVE">Administrative</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={isActive}
              onValueChange={(value) => updateFilter('isActive', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active Holds</SelectItem>
                <SelectItem value="false">Released Holds</SelectItem>
                <SelectItem value="">All Holds</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Blocks</TableHead>
                <TableHead>Placed By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : holds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    No holds found
                  </TableCell>
                </TableRow>
              ) : (
                holds.map((hold) => (
                  <TableRow key={hold.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {hold.student?.user.firstName} {hold.student?.user.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {hold.student?.studentId}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(hold.type)}</TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {hold.reason}
                    </TableCell>
                    <TableCell className="text-sm">
                      {getBlocksBadges(hold)}
                    </TableCell>
                    <TableCell>
                      {hold.placedBy?.firstName} {hold.placedBy?.lastName}
                    </TableCell>
                    <TableCell>{formatDate(hold.placedAt)}</TableCell>
                    <TableCell>
                      {hold.releasedAt ? (
                        <Badge variant="outline" className="text-green-600">
                          <ShieldCheck className="mr-1 h-3 w-3" />
                          Released
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <ShieldAlert className="mr-1 h-3 w-3" />
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {!hold.releasedAt && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setReleaseId(hold.id)}
                        >
                          Release
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Hold Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Place Hold on Student</DialogTitle>
            <DialogDescription>
              This will restrict the student from certain activities
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="studentId">Student ID</Label>
              <Input
                id="studentId"
                placeholder="Enter student UUID"
                value={formData.studentId}
                onChange={(e) =>
                  setFormData({ ...formData, studentId: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Hold Type</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as HoldType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FINANCIAL">Financial</SelectItem>
                  <SelectItem value="ACADEMIC">Academic</SelectItem>
                  <SelectItem value="LIBRARY">Library</SelectItem>
                  <SelectItem value="DISCIPLINARY">Disciplinary</SelectItem>
                  <SelectItem value="ADMINISTRATIVE">Administrative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for hold"
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
              />
            </div>

            <div className="space-y-3">
              <Label>Blocks</Label>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="blocksRegistration"
                    checked={formData.blocksRegistration}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, blocksRegistration: !!checked })
                    }
                  />
                  <label htmlFor="blocksRegistration" className="text-sm">
                    Block Registration
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="blocksGrades"
                    checked={formData.blocksGrades}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, blocksGrades: !!checked })
                    }
                  />
                  <label htmlFor="blocksGrades" className="text-sm">
                    Block Grades
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="blocksTranscript"
                    checked={formData.blocksTranscript}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, blocksTranscript: !!checked })
                    }
                  />
                  <label htmlFor="blocksTranscript" className="text-sm">
                    Block Transcript
                  </label>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Place Hold</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Release Confirmation */}
      <AlertDialog open={!!releaseId} onOpenChange={() => setReleaseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release Hold</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to release this hold? The student will regain
              access to the blocked services.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRelease}>
              Release Hold
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
