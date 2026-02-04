import { useState, useEffect } from 'react';
import { Plus, Calendar, Star, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { academicYearsApi, semestersApi, type AcademicYear, type CreateAcademicYearInput, type CreateSemesterInput } from '@/lib/api/academicCalendar';

export function AcademicCalendarPage() {
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [expandedYears, setExpandedYears] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [yearDialogOpen, setYearDialogOpen] = useState(false);
  const [semesterDialogOpen, setSemesterDialogOpen] = useState(false);
  const [deleteYearId, setDeleteYearId] = useState<string | null>(null);
  const [deleteSemesterId, setDeleteSemesterId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [yearFormData, setYearFormData] = useState<CreateAcademicYearInput>({ name: '', startDate: '', endDate: '' });
  const [semesterFormData, setSemesterFormData] = useState<CreateSemesterInput>({ name: '', academicYearId: '', startDate: '', endDate: '', registrationStart: '', registrationEnd: '' });

  useEffect(() => { loadAcademicYears(); }, []);

  const loadAcademicYears = async () => {
    try {
      setLoading(true);
      const response = await academicYearsApi.getAcademicYears();
      if (response.success && response.data) {
        setAcademicYears(response.data);
        // Expand the current year by default
        const currentYear = response.data.find((y) => y.isCurrent);
        if (currentYear) setExpandedYears(new Set([currentYear.id]));
      }
    } catch (error) {
      console.error('Failed to load academic years:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSemesters = async (yearId: string) => {
    try {
      const response = await academicYearsApi.getSemesters(yearId);
      if (response.success && response.data) {
        setAcademicYears((prev) => prev.map((y) => y.id === yearId ? { ...y, semesters: response.data } : y));
      }
    } catch (error) {
      console.error('Failed to load semesters:', error);
    }
  };

  const toggleYear = (yearId: string) => {
    const newExpanded = new Set(expandedYears);
    if (newExpanded.has(yearId)) {
      newExpanded.delete(yearId);
    } else {
      newExpanded.add(yearId);
      loadSemesters(yearId);
    }
    setExpandedYears(newExpanded);
  };

  const handleCreateYear = async () => {
    try {
      await academicYearsApi.createAcademicYear(yearFormData);
      setYearDialogOpen(false);
      setYearFormData({ name: '', startDate: '', endDate: '' });
      loadAcademicYears();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create academic year');
    }
  };

  const handleCreateSemester = async () => {
    try {
      await semestersApi.createSemester({ ...semesterFormData, academicYearId: selectedYearId });
      setSemesterDialogOpen(false);
      setSemesterFormData({ name: '', academicYearId: '', startDate: '', endDate: '', registrationStart: '', registrationEnd: '' });
      loadSemesters(selectedYearId);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to create semester');
    }
  };

  const handleSetCurrentYear = async (id: string) => {
    try {
      await academicYearsApi.setCurrentAcademicYear(id);
      loadAcademicYears();
    } catch (error) {
      console.error('Failed to set current year:', error);
    }
  };

  const handleSetCurrentSemester = async (id: string) => {
    try {
      await semestersApi.setCurrentSemester(id);
      loadAcademicYears();
    } catch (error) {
      console.error('Failed to set current semester:', error);
    }
  };

  const handleDeleteYear = async () => {
    if (!deleteYearId) return;
    try {
      setDeleteError(null);
      await academicYearsApi.deleteAcademicYear(deleteYearId);
      setDeleteYearId(null);
      loadAcademicYears();
    } catch (error: any) {
      setDeleteError(error.response?.data?.message || 'Failed to delete');
    }
  };

  const handleDeleteSemester = async () => {
    if (!deleteSemesterId) return;
    try {
      setDeleteError(null);
      await semestersApi.deleteSemester(deleteSemesterId);
      setDeleteSemesterId(null);
      loadAcademicYears();
    } catch (error: any) {
      setDeleteError(error.response?.data?.message || 'Failed to delete');
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Academic Calendar</h1>
          <p className="text-muted-foreground">Manage academic years and semesters</p>
        </div>
        <Button onClick={() => setYearDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Add Academic Year</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Academic Years</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : academicYears.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No academic years found. Create one to get started.</p>
          ) : (
            <div className="space-y-4">
              {academicYears.map((year) => (
                <div key={year.id} className="border rounded-lg">
                  <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50" onClick={() => toggleYear(year.id)}>
                    <div className="flex items-center gap-3">
                      {expandedYears.has(year.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{year.name}</span>
                          {year.isCurrent && <Badge variant="default"><Star className="h-3 w-3 mr-1" />Current</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground">{formatDate(year.startDate)} - {formatDate(year.endDate)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Badge variant="secondary">{year.semesterCount} semester(s)</Badge>
                      {!year.isCurrent && <Button variant="outline" size="sm" onClick={() => handleSetCurrentYear(year.id)}>Set Current</Button>}
                      <Button variant="ghost" size="icon" onClick={() => setDeleteYearId(year.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  </div>

                  {expandedYears.has(year.id) && (
                    <div className="border-t p-4 bg-muted/30">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium">Semesters</h4>
                        <Button variant="outline" size="sm" onClick={() => { setSelectedYearId(year.id); setSemesterDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />Add Semester</Button>
                      </div>
                      {year.semesters && year.semesters.length > 0 ? (
                        <div className="space-y-2">
                          {year.semesters.map((sem) => (
                            <div key={sem.id} className="flex items-center justify-between p-3 bg-background rounded-md border">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{sem.name}</span>
                                  {sem.isCurrent && <Badge variant="default"><Star className="h-3 w-3 mr-1" />Current</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground">{formatDate(sem.startDate)} - {formatDate(sem.endDate)}</p>
                                <p className="text-xs text-muted-foreground">Registration: {formatDate(sem.registrationStart)} - {formatDate(sem.registrationEnd)}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {!sem.isCurrent && <Button variant="outline" size="sm" onClick={() => handleSetCurrentSemester(sem.id)}>Set Current</Button>}
                                <Button variant="ghost" size="icon" onClick={() => setDeleteSemesterId(sem.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center py-4 text-muted-foreground">No semesters yet</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Academic Year Dialog */}
      <Dialog open={yearDialogOpen} onOpenChange={setYearDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Academic Year</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="yearName">Name *</Label>
              <Input id="yearName" placeholder="e.g., 2025-2026" value={yearFormData.name} onChange={(e) => setYearFormData((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="yearStart">Start Date *</Label>
                <Input id="yearStart" type="date" value={yearFormData.startDate} onChange={(e) => setYearFormData((p) => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearEnd">End Date *</Label>
                <Input id="yearEnd" type="date" value={yearFormData.endDate} onChange={(e) => setYearFormData((p) => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setYearDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateYear}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Semester Dialog */}
      <Dialog open={semesterDialogOpen} onOpenChange={setSemesterDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Semester</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="semName">Name *</Label>
              <Input id="semName" placeholder="e.g., Fall 2025" value={semesterFormData.name} onChange={(e) => setSemesterFormData((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="semStart">Start Date *</Label>
                <Input id="semStart" type="date" value={semesterFormData.startDate} onChange={(e) => setSemesterFormData((p) => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="semEnd">End Date *</Label>
                <Input id="semEnd" type="date" value={semesterFormData.endDate} onChange={(e) => setSemesterFormData((p) => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-4 grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="regStart">Registration Start *</Label>
                <Input id="regStart" type="date" value={semesterFormData.registrationStart} onChange={(e) => setSemesterFormData((p) => ({ ...p, registrationStart: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="regEnd">Registration End *</Label>
                <Input id="regEnd" type="date" value={semesterFormData.registrationEnd} onChange={(e) => setSemesterFormData((p) => ({ ...p, registrationEnd: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSemesterDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateSemester}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialogs */}
      <AlertDialog open={!!deleteYearId} onOpenChange={() => { setDeleteYearId(null); setDeleteError(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Academic Year</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This cannot be undone.
              {deleteError && <p className="mt-2 text-destructive font-medium">{deleteError}</p>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteYear}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteSemesterId} onOpenChange={() => { setDeleteSemesterId(null); setDeleteError(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Semester</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This cannot be undone.
              {deleteError && <p className="mt-2 text-destructive font-medium">{deleteError}</p>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSemester}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
