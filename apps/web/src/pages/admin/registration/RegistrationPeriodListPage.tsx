import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, Edit, Trash2, Calendar, Clock } from 'lucide-react';
import {
  registrationPeriodsApi,
  type RegistrationPeriod,
  type RegistrationPeriodType,
} from '@/lib/api/registrationPeriods';
import { semestersApi, type Semester } from '@/lib/api/academicCalendar';
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
import { useToast } from '@/hooks/use-toast';

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

export function RegistrationPeriodListPage() {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [periods, setPeriods] = useState<RegistrationPeriod[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const semesterId = searchParams.get('semesterId') || '';
  const type = (searchParams.get('type') as RegistrationPeriodType) || '';
  const isActive = searchParams.get('isActive');

  useEffect(() => {
    loadSemesters();
  }, []);

  useEffect(() => {
    loadPeriods();
  }, [semesterId, type, isActive]);

  const loadSemesters = async () => {
    try {
      const response = await semestersApi.getSemesters();
      setSemesters(response.data || []);
    } catch (error) {
      console.error('Failed to load semesters:', error);
    }
  };

  const loadPeriods = async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (semesterId) filters.semesterId = semesterId;
      if (type) filters.type = type;
      if (isActive !== null && isActive !== '') filters.isActive = isActive === 'true';

      const data = await registrationPeriodsApi.getAll(filters);
      setPeriods(data);
    } catch (error) {
      console.error('Failed to load periods:', error);
      toast({ variant: 'destructive', title: 'Failed to load registration periods' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await registrationPeriodsApi.delete(deleteId);
      toast({ title: 'Registration period deleted successfully' });
      loadPeriods();
    } catch (error) {
      console.error('Failed to delete period:', error);
      toast({ variant: 'destructive', title: 'Failed to delete registration period' });
    } finally {
      setDeleteId(null);
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

  const getTypeBadge = (periodType: RegistrationPeriodType) => {
    const colors = {
      REGULAR: 'bg-green-100 text-green-800',
      LATE: 'bg-yellow-100 text-yellow-800',
      DROP_ADD: 'bg-blue-100 text-blue-800',
    };
    const labels = {
      REGULAR: 'Regular',
      LATE: 'Late',
      DROP_ADD: 'Drop/Add',
    };
    return <Badge className={colors[periodType]}>{labels[periodType]}</Badge>;
  };

  const isCurrentlyActive = (period: RegistrationPeriod) => {
    const now = new Date();
    const start = new Date(period.startDate);
    const end = new Date(period.endDate);
    return period.isActive && now >= start && now <= end;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Registration Periods</h1>
          <p className="text-muted-foreground">
            Manage course registration periods for each semester
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/registration/periods/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Period
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Select
              value={semesterId}
              onValueChange={(value) => updateFilter('semesterId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Semesters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Semesters</SelectItem>
                {semesters.map((semester) => (
                  <SelectItem key={semester.id} value={semester.id}>
                    {semester.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={type}
              onValueChange={(value) => updateFilter('type', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                <SelectItem value="REGULAR">Regular</SelectItem>
                <SelectItem value="LATE">Late</SelectItem>
                <SelectItem value="DROP_ADD">Drop/Add</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={isActive || ''}
              onValueChange={(value) => updateFilter('isActive', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
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
                <TableHead>Semester</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Late Fee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : periods.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No registration periods found
                  </TableCell>
                </TableRow>
              ) : (
                periods.map((period) => (
                  <TableRow key={period.id}>
                    <TableCell className="font-medium">
                      {period.semester?.name || '-'}
                    </TableCell>
                    <TableCell>{getTypeBadge(period.type)}</TableCell>
                    <TableCell>{formatDate(period.startDate)}</TableCell>
                    <TableCell>{formatDate(period.endDate)}</TableCell>
                    <TableCell>
                      {period.lateFee ? `$${period.lateFee}` : '-'}
                    </TableCell>
                    <TableCell>
                      {isCurrentlyActive(period) ? (
                        <Badge className="bg-green-500">
                          <Clock className="mr-1 h-3 w-3" />
                          Active Now
                        </Badge>
                      ) : period.isActive ? (
                        <Badge variant="outline">Enabled</Badge>
                      ) : (
                        <Badge variant="secondary">Disabled</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link to={`/admin/registration/periods/${period.id}/edit`}>
                            <Edit className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(period.id)}
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
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Registration Period</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this registration period? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
