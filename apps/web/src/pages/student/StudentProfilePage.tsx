import { useState, useEffect, useRef } from 'react';
import { User, Mail, Phone, MapPin, AlertCircle, Save, Camera, Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { studentPortalApi, type StudentProfile } from '@/lib/api/studentPortal';

export function StudentProfilePage() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    address: '',
    emergencyContact: '',
    emergencyContactPhone: '',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await studentPortalApi.getProfile();
      if (response.success && response.data) {
        setProfile(response.data);
        setFormData({
          phone: response.data.user?.phone || '',
          address: response.data.personalInfo?.address || '',
          emergencyContact: response.data.emergencyContact?.name || '',
          emergencyContactPhone: response.data.emergencyContact?.phone || '',
        });
      }
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await studentPortalApi.updateProfile(formData);
      if (response.success) {
        setEditMode(false);
        loadProfile();
      }
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    try {
      setUploadingPhoto(true);
      setError(null);
      const response = await studentPortalApi.uploadPhoto(file);
      if (response.success) {
        loadProfile(); // Reload to get new avatar URL
      }
    } catch (err: any) {
      console.error('Failed to upload photo:', err);
      setError(err.response?.data?.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handlePhotoDelete = async () => {
    if (!confirm('Are you sure you want to delete your profile photo?')) return;

    try {
      setUploadingPhoto(true);
      setError(null);
      const response = await studentPortalApi.deletePhoto();
      if (response.success) {
        loadProfile(); // Reload to clear avatar URL
      }
    } catch (err: any) {
      console.error('Failed to delete photo:', err);
      setError(err.response?.data?.message || 'Failed to delete photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{error || 'Profile not found'}</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'default';
      case 'GRADUATED':
        return 'secondary';
      case 'SUSPENDED':
        return 'destructive';
      case 'WITHDRAWN':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">View and manage your personal information</p>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.user?.avatar ? `${import.meta.env.VITE_API_URL}${profile.user.avatar}` : undefined} />
                <AvatarFallback className="text-2xl">
                  {profile.user?.fullName.split(' ').map((n) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              {/* Photo upload controls */}
              <div className="absolute -bottom-2 -right-2 flex gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 rounded-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                >
                  {uploadingPhoto ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
                {profile.user?.avatar && (
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8 rounded-full"
                    onClick={handlePhotoDelete}
                    disabled={uploadingPhoto}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold">{profile.user?.fullName}</h2>
              <p className="text-muted-foreground">{profile.studentId}</p>
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
                <Badge variant={getStatusColor(profile.status)}>{profile.status}</Badge>
                <Badge variant="outline">{profile.program?.code}</Badge>
                <Badge variant="outline">Semester {profile.currentSemester}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Click the camera icon to upload a profile photo (max 5MB)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Academic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Academic Information</CardTitle>
            <CardDescription>Your program and enrollment details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Program</Label>
              <p className="font-medium">{profile.program?.name}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Department</Label>
              <p className="font-medium">{profile.program?.department?.name || 'N/A'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Faculty</Label>
              <p className="font-medium">{profile.program?.department?.faculty?.name || 'N/A'}</p>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Admission Date</Label>
                <p className="font-medium">
                  {new Date(profile.admissionDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Expected Graduation</Label>
                <p className="font-medium">
                  {profile.expectedGraduation
                    ? new Date(profile.expectedGraduation).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Your personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{profile.user?.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Date of Birth</Label>
                <p className="font-medium">
                  {profile.personalInfo?.dateOfBirth
                    ? new Date(profile.personalInfo.dateOfBirth).toLocaleDateString()
                    : 'N/A'}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Gender</Label>
                <p className="font-medium">{profile.personalInfo?.gender || 'N/A'}</p>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Nationality</Label>
              <p className="font-medium">{profile.personalInfo?.nationality || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information (Editable) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Update your contact details</CardDescription>
            </div>
            {!editMode && (
              <Button variant="outline" onClick={() => setEditMode(true)}>
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {editMode ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter address"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button variant="outline" onClick={() => setEditMode(false)}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{profile.user?.phone || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-muted-foreground">Address</Label>
                    <p className="font-medium">{profile.personalInfo?.address || 'Not provided'}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Emergency Contact (Editable) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Emergency Contact
              </CardTitle>
              <CardDescription>Contact in case of emergency</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {editMode ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContact">Contact Name</Label>
                  <Input
                    id="emergencyContact"
                    value={formData.emergencyContact}
                    onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                    placeholder="Enter emergency contact name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
                  <Input
                    id="emergencyContactPhone"
                    value={formData.emergencyContactPhone}
                    onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                    placeholder="Enter emergency contact phone"
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-muted-foreground">Name</Label>
                    <p className="font-medium">{profile.emergencyContact?.name || 'Not provided'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-muted-foreground">Phone</Label>
                    <p className="font-medium">{profile.emergencyContact?.phone || 'Not provided'}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
