import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  CheckCircle,
  XCircle,
  UserPlus,
  Clock,
  Eye,
  Loader2,
  Copy,
  Mail,
  Phone,
  MapPin,
  Calendar,
  GraduationCap,
  User,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { admissionsApi, type AdmissionApplication, type AdmissionStatus } from '@/lib/api/admissions';
import { useToast } from '@/hooks/use-toast';

const statusColors: Record<AdmissionStatus, 'default' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  UNDER_REVIEW: 'default',
  APPROVED: 'success',
  REJECTED: 'destructive',
  ENROLLED: 'outline',
};

const statusLabels: Record<AdmissionStatus, string> = {
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ENROLLED: 'Enrolled',
};

export function AdmissionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [application, setApplication] = useState<AdmissionApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showEnrollResultDialog, setShowEnrollResultDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [enrollResult, setEnrollResult] = useState<{ studentId: string; tempPassword: string } | null>(null);

  useEffect(() => {
    if (id) {
      loadApplication(id);
    }
  }, [id]);

  const loadApplication = async (applicationId: string) => {
    try {
      setLoading(true);
      const response = await admissionsApi.getApplicationById(applicationId);
      if (response.success && response.data) {
        setApplication(response.data);
      }
    } catch (error) {
      console.error('Failed to load application:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load application details',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartReview = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await admissionsApi.reviewApplication(id, { status: 'UNDER_REVIEW' });
      toast({
        title: 'Success',
        description: 'Application is now under review',
      });
      loadApplication(id);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update status',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      await admissionsApi.approveApplication(id);
      toast({
        title: 'Success',
        description: 'Application approved successfully',
      });
      loadApplication(id);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to approve application',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!id || !rejectReason.trim()) return;
    try {
      setActionLoading(true);
      await admissionsApi.rejectApplication(id, rejectReason);
      toast({
        title: 'Application Rejected',
        description: 'The application has been rejected',
      });
      setShowRejectDialog(false);
      setRejectReason('');
      loadApplication(id);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reject application',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!id) return;
    try {
      setActionLoading(true);
      const response = await admissionsApi.enrollStudent(id);
      if (response.success && response.data) {
        setEnrollResult({
          studentId: response.data.student.studentId,
          tempPassword: response.data.tempPassword,
        });
        setShowEnrollDialog(false);
        setShowEnrollResultDialog(true);
        loadApplication(id);
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to enroll student',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Application not found</p>
        <Button variant="link" onClick={() => navigate('/admin/admissions')}>
          Back to applications
        </Button>
      </div>
    );
  }

  const canEdit = ['PENDING', 'UNDER_REVIEW'].includes(application.status);
  const canStartReview = application.status === 'PENDING';
  const canApproveReject = application.status === 'UNDER_REVIEW';
  const canEnroll = application.status === 'APPROVED';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/admissions')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{application.applicationNo}</h1>
              <Badge variant={statusColors[application.status]}>
                {statusLabels[application.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {application.personalInfo.fullName} - {application.program.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Link to={`/admin/admissions/${application.id}/edit`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
          )}
          {canStartReview && (
            <Button onClick={handleStartReview} disabled={actionLoading}>
              <Eye className="mr-2 h-4 w-4" />
              Start Review
            </Button>
          )}
          {canApproveReject && (
            <>
              <Button variant="destructive" onClick={() => setShowRejectDialog(true)} disabled={actionLoading}>
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button variant="default" onClick={handleApprove} disabled={actionLoading}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve
              </Button>
            </>
          )}
          {canEnroll && (
            <Button onClick={() => setShowEnrollDialog(true)} disabled={actionLoading}>
              <UserPlus className="mr-2 h-4 w-4" />
              Enroll Student
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-muted-foreground">First Name</Label>
                <p className="font-medium">{application.personalInfo.firstName}</p>
              </div>
              {application.personalInfo.middleName && (
                <div>
                  <Label className="text-muted-foreground">Middle Name</Label>
                  <p className="font-medium">{application.personalInfo.middleName}</p>
                </div>
              )}
              <div>
                <Label className="text-muted-foreground">Last Name</Label>
                <p className="font-medium">{application.personalInfo.lastName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{application.personalInfo.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{application.personalInfo.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <Label className="text-muted-foreground">Date of Birth</Label>
                  <p className="font-medium">{new Date(application.personalInfo.dateOfBirth).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Gender</Label>
                <p className="font-medium">{application.personalInfo.gender}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Nationality</Label>
                <p className="font-medium">{application.personalInfo.nationality}</p>
              </div>
              {application.personalInfo.city && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-muted-foreground">City</Label>
                    <p className="font-medium">{application.personalInfo.city}</p>
                  </div>
                </div>
              )}
              {application.personalInfo.address && (
                <div className="md:col-span-2">
                  <Label className="text-muted-foreground">Address</Label>
                  <p className="font-medium">{application.personalInfo.address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Academic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Academic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label className="text-muted-foreground">Program</Label>
                <p className="font-medium">{application.program.code} - {application.program.name}</p>
                {application.program.department && (
                  <p className="text-sm text-muted-foreground">{application.program.department.name}</p>
                )}
              </div>
              <div>
                <Label className="text-muted-foreground">Previous Education Level</Label>
                <p className="font-medium capitalize">{application.academicInfo.previousEducationLevel}</p>
              </div>
              {application.academicInfo.previousSchoolName && (
                <div>
                  <Label className="text-muted-foreground">Previous School</Label>
                  <p className="font-medium">{application.academicInfo.previousSchoolName}</p>
                </div>
              )}
              {application.academicInfo.graduationYear && (
                <div>
                  <Label className="text-muted-foreground">Graduation Year</Label>
                  <p className="font-medium">{application.academicInfo.graduationYear}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          {application.emergencyContact.name && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Emergency Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label className="text-muted-foreground">Contact Name</Label>
                  <p className="font-medium">{application.emergencyContact.name}</p>
                </div>
                {application.emergencyContact.phone && (
                  <div>
                    <Label className="text-muted-foreground">Contact Phone</Label>
                    <p className="font-medium">{application.emergencyContact.phone}</p>
                  </div>
                )}
                {application.emergencyContact.relation && (
                  <div>
                    <Label className="text-muted-foreground">Relationship</Label>
                    <p className="font-medium">{application.emergencyContact.relation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Application Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Current Status</Label>
                <div className="mt-1">
                  <Badge variant={statusColors[application.status]} className="text-sm">
                    {statusLabels[application.status]}
                  </Badge>
                </div>
              </div>
              <Separator />
              <div>
                <Label className="text-muted-foreground">Applied On</Label>
                <p className="font-medium">{new Date(application.createdAt).toLocaleDateString()}</p>
              </div>
              {application.review.reviewedAt && (
                <div>
                  <Label className="text-muted-foreground">Reviewed On</Label>
                  <p className="font-medium">{new Date(application.review.reviewedAt).toLocaleDateString()}</p>
                </div>
              )}
              {application.review.remarks && (
                <div>
                  <Label className="text-muted-foreground">Review Remarks</Label>
                  <p className="font-medium text-sm">{application.review.remarks}</p>
                </div>
              )}
              {application.review.rejectionReason && (
                <div>
                  <Label className="text-muted-foreground">Rejection Reason</Label>
                  <p className="font-medium text-sm text-destructive">{application.review.rejectionReason}</p>
                </div>
              )}
              {application.enrollment.enrolledAt && (
                <div>
                  <Label className="text-muted-foreground">Enrolled On</Label>
                  <p className="font-medium">{new Date(application.enrollment.enrolledAt).toLocaleDateString()}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documents Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents
              </CardTitle>
              <CardDescription>Uploaded application documents</CardDescription>
            </CardHeader>
            <CardContent>
              {application.documents && application.documents.length > 0 ? (
                <ul className="space-y-2">
                  {application.documents.map((doc) => (
                    <li key={doc.id} className="flex items-center justify-between text-sm">
                      <span>{doc.name}</span>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="sm">View</Button>
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No documents uploaded</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Application</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this application. This will be visible to the applicant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              disabled={!rejectReason.trim() || actionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reject Application'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Enroll Confirmation Dialog */}
      <AlertDialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enroll Student</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a student account for {application.personalInfo.fullName} and generate login credentials.
              A new user account will be created with the STUDENT role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEnroll} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enroll Student'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Enrollment Result Dialog */}
      <Dialog open={showEnrollResultDialog} onOpenChange={setShowEnrollResultDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Student Enrolled Successfully
            </DialogTitle>
            <DialogDescription>
              The student has been enrolled. Please share the following credentials with the student.
            </DialogDescription>
          </DialogHeader>
          {enrollResult && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-muted-foreground">Student ID</Label>
                    <p className="font-mono font-bold text-lg">{enrollResult.studentId}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(enrollResult.studentId, 'Student ID')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-muted-foreground">Temporary Password</Label>
                    <p className="font-mono font-bold text-lg">{enrollResult.tempPassword}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(enrollResult.tempPassword, 'Password')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                The student can use their email ({application.personalInfo.email}) and the temporary password to log in.
                They will be prompted to change their password on first login.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowEnrollResultDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
