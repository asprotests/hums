import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Save, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { admissionsApi, type CreateApplicationInput } from '@/lib/api/admissions';
import { programsApi, type Program } from '@/lib/api/programs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'admission_form_draft';

const STEPS = [
  { id: 1, name: 'Personal Information', description: 'Basic applicant details' },
  { id: 2, name: 'Academic Background', description: 'Educational history' },
  { id: 3, name: 'Program Selection', description: 'Choose your program' },
  { id: 4, name: 'Emergency Contact', description: 'Contact information' },
  { id: 5, name: 'Review & Submit', description: 'Verify and submit' },
];

export function AdmissionFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = Boolean(id);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [formData, setFormData] = useState<CreateApplicationInput>({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'MALE',
    nationality: '',
    address: '',
    city: '',
    programId: '',
    previousEducationLevel: 'secondary',
    previousSchoolName: '',
    graduationYear: undefined,
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
  });

  // Load saved draft from local storage
  useEffect(() => {
    if (!isEditing) {
      const savedDraft = localStorage.getItem(STORAGE_KEY);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setFormData(parsed.formData);
          setCurrentStep(parsed.currentStep || 1);
          toast({
            title: 'Draft Restored',
            description: 'Your previous progress has been restored.',
          });
        } catch (e) {
          console.error('Failed to parse saved draft:', e);
        }
      }
    }
  }, [isEditing]);

  // Save draft to local storage on changes
  useEffect(() => {
    if (!isEditing && formData.firstName) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ formData, currentStep }));
    }
  }, [formData, currentStep, isEditing]);

  useEffect(() => {
    loadPrograms();
    if (isEditing && id) {
      loadApplication(id);
    }
  }, [id]);

  const loadPrograms = async () => {
    try {
      const response = await programsApi.getPrograms({ limit: 100 });
      if (response.success && response.data) {
        setPrograms(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load programs:', error);
    }
  };

  const loadApplication = async (applicationId: string) => {
    try {
      setLoading(true);
      const response = await admissionsApi.getApplicationById(applicationId);
      if (response.success && response.data) {
        const app = response.data;
        setFormData({
          firstName: app.personalInfo.firstName,
          middleName: app.personalInfo.middleName || '',
          lastName: app.personalInfo.lastName,
          email: app.personalInfo.email,
          phone: app.personalInfo.phone,
          dateOfBirth: app.personalInfo.dateOfBirth.split('T')[0],
          gender: app.personalInfo.gender,
          nationality: app.personalInfo.nationality,
          address: app.personalInfo.address || '',
          city: app.personalInfo.city || '',
          programId: app.program.id,
          previousEducationLevel: app.academicInfo.previousEducationLevel as 'secondary' | 'diploma' | 'bachelor' | 'master',
          previousSchoolName: app.academicInfo.previousSchoolName || '',
          graduationYear: app.academicInfo.graduationYear,
          emergencyContactName: app.emergencyContact.name || '',
          emergencyContactPhone: app.emergencyContact.phone || '',
          emergencyContactRelation: app.emergencyContact.relation || '',
        });
      }
    } catch (error) {
      console.error('Failed to load application:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load application data',
      });
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.dateOfBirth) {
          toast({
            variant: 'destructive',
            title: 'Validation Error',
            description: 'Please fill in all required fields',
          });
          return false;
        }
        // Validate age (16+)
        const birthDate = new Date(formData.dateOfBirth);
        const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (age < 16) {
          toast({
            variant: 'destructive',
            title: 'Validation Error',
            description: 'Applicant must be at least 16 years old',
          });
          return false;
        }
        // Validate phone format
        if (!formData.phone.startsWith('+252')) {
          toast({
            variant: 'destructive',
            title: 'Validation Error',
            description: 'Phone number must start with +252',
          });
          return false;
        }
        return true;
      case 2:
        if (!formData.previousEducationLevel) {
          toast({
            variant: 'destructive',
            title: 'Validation Error',
            description: 'Please select your previous education level',
          });
          return false;
        }
        return true;
      case 3:
        if (!formData.programId) {
          toast({
            variant: 'destructive',
            title: 'Validation Error',
            description: 'Please select a program',
          });
          return false;
        }
        return true;
      case 4:
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  const handlePrevious = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    try {
      setSaving(true);
      const dataToSubmit: CreateApplicationInput = {
        ...formData,
        middleName: formData.middleName || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        nationality: formData.nationality || undefined,
        previousSchoolName: formData.previousSchoolName || undefined,
        graduationYear: formData.graduationYear || undefined,
        emergencyContactName: formData.emergencyContactName || undefined,
        emergencyContactPhone: formData.emergencyContactPhone || undefined,
        emergencyContactRelation: formData.emergencyContactRelation || undefined,
      };

      if (isEditing && id) {
        await admissionsApi.updateApplication(id, dataToSubmit);
        toast({
          title: 'Success',
          description: 'Application updated successfully',
        });
      } else {
        await admissionsApi.createApplication(dataToSubmit);
        // Clear draft on successful submission
        localStorage.removeItem(STORAGE_KEY);
        toast({
          title: 'Success',
          description: 'Application submitted successfully',
        });
      }
      navigate('/admin/admissions');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save application',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof CreateApplicationInput, value: string | number | undefined) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY);
    setFormData({
      firstName: '',
      middleName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      gender: 'MALE',
      nationality: '',
      address: '',
      city: '',
      programId: '',
      previousEducationLevel: 'secondary',
      previousSchoolName: '',
      graduationYear: undefined,
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelation: '',
    });
    setCurrentStep(1);
    toast({
      title: 'Draft Cleared',
      description: 'Form has been reset.',
    });
  };

  const selectedProgram = programs.find((p) => p.id === formData.programId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/admissions')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{isEditing ? 'Edit Application' : 'New Application'}</h1>
            <p className="text-muted-foreground">
              {isEditing ? 'Update admission application details' : 'Submit a new admission application'}
            </p>
          </div>
        </div>
        {!isEditing && formData.firstName && (
          <Button variant="outline" size="sm" onClick={clearDraft}>
            <X className="mr-2 h-4 w-4" />
            Clear Draft
          </Button>
        )}
      </div>

      {/* Progress Steps */}
      <nav aria-label="Progress">
        <ol className="flex items-center">
          {STEPS.map((step, stepIdx) => (
            <li key={step.id} className={cn('relative', stepIdx !== STEPS.length - 1 ? 'pr-8 sm:pr-20 flex-1' : '')}>
              <div className="flex items-center">
                <div
                  className={cn(
                    'relative flex h-8 w-8 items-center justify-center rounded-full',
                    step.id < currentStep
                      ? 'bg-primary text-primary-foreground'
                      : step.id === currentStep
                      ? 'border-2 border-primary bg-background'
                      : 'border-2 border-muted bg-background'
                  )}
                >
                  {step.id < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className={cn('text-sm font-medium', step.id === currentStep ? 'text-primary' : 'text-muted-foreground')}>
                      {step.id}
                    </span>
                  )}
                </div>
                {stepIdx !== STEPS.length - 1 && (
                  <div
                    className={cn(
                      'absolute left-8 top-4 -ml-px h-0.5 w-full sm:w-20',
                      step.id < currentStep ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
              </div>
              <div className="mt-2 hidden sm:block">
                <span className={cn('text-sm font-medium', step.id === currentStep ? 'text-primary' : 'text-muted-foreground')}>
                  {step.name}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </nav>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{STEPS[currentStep - 1].name}</CardTitle>
          <CardDescription>{STEPS[currentStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="middleName">Middle Name</Label>
                <Input
                  id="middleName"
                  value={formData.middleName}
                  onChange={(e) => handleChange('middleName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+252..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender *</Label>
                <Select value={formData.gender} onValueChange={(v) => handleChange('gender', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MALE">Male</SelectItem>
                    <SelectItem value="FEMALE">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality *</Label>
                <Input
                  id="nationality"
                  value={formData.nationality}
                  onChange={(e) => handleChange('nationality', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Step 2: Academic Background */}
          {currentStep === 2 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="previousEducationLevel">Previous Education Level *</Label>
                <Select
                  value={formData.previousEducationLevel}
                  onValueChange={(v) => handleChange('previousEducationLevel', v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="secondary">Secondary School</SelectItem>
                    <SelectItem value="diploma">Diploma</SelectItem>
                    <SelectItem value="bachelor">Bachelor's Degree</SelectItem>
                    <SelectItem value="master">Master's Degree</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="previousSchoolName">Previous School/Institution Name</Label>
                <Input
                  id="previousSchoolName"
                  value={formData.previousSchoolName}
                  onChange={(e) => handleChange('previousSchoolName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="graduationYear">Graduation Year</Label>
                <Input
                  id="graduationYear"
                  type="number"
                  min="1990"
                  max={new Date().getFullYear()}
                  value={formData.graduationYear || ''}
                  onChange={(e) => handleChange('graduationYear', e.target.value ? parseInt(e.target.value) : undefined)}
                />
              </div>
            </div>
          )}

          {/* Step 3: Program Selection */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="programId">Select Program *</Label>
                <Select value={formData.programId} onValueChange={(v) => handleChange('programId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.code} - {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedProgram && (
                <Card className="bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">{selectedProgram.name}</CardTitle>
                    <CardDescription>{selectedProgram.code}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="font-medium">{selectedProgram.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="font-medium">{selectedProgram.durationYears} years</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Credits:</span>
                        <span className="font-medium">{selectedProgram.totalCredits}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 4: Emergency Contact */}
          {currentStep === 4 && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="emergencyContactName">Contact Name</Label>
                <Input
                  id="emergencyContactName"
                  value={formData.emergencyContactName}
                  onChange={(e) => handleChange('emergencyContactName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
                <Input
                  id="emergencyContactPhone"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => handleChange('emergencyContactPhone', e.target.value)}
                  placeholder="+252..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencyContactRelation">Relationship</Label>
                <Select
                  value={formData.emergencyContactRelation}
                  onValueChange={(v) => handleChange('emergencyContactRelation', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Father">Father</SelectItem>
                    <SelectItem value="Mother">Mother</SelectItem>
                    <SelectItem value="Guardian">Guardian</SelectItem>
                    <SelectItem value="Sibling">Sibling</SelectItem>
                    <SelectItem value="Spouse">Spouse</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Step 5: Review & Submit */}
          {currentStep === 5 && (
            <div className="space-y-6">
              {/* Personal Information Review */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline">1</Badge>
                  Personal Information
                </h3>
                <div className="grid gap-2 text-sm bg-muted/50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <span className="text-muted-foreground">Name:</span>
                      <span className="ml-2 font-medium">{formData.firstName} {formData.middleName ? `${formData.middleName} ` : ''}{formData.lastName}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <span className="ml-2 font-medium">{formData.email}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="ml-2 font-medium">{formData.phone}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Date of Birth:</span>
                      <span className="ml-2 font-medium">{formData.dateOfBirth}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Gender:</span>
                      <span className="ml-2 font-medium">{formData.gender}</span>
                    </div>
                    {formData.nationality && (
                      <div>
                        <span className="text-muted-foreground">Nationality:</span>
                        <span className="ml-2 font-medium">{formData.nationality}</span>
                      </div>
                    )}
                    {formData.city && (
                      <div>
                        <span className="text-muted-foreground">City:</span>
                        <span className="ml-2 font-medium">{formData.city}</span>
                      </div>
                    )}
                  </div>
                  {formData.address && (
                    <div className="mt-2">
                      <span className="text-muted-foreground">Address:</span>
                      <span className="ml-2 font-medium">{formData.address}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Academic Background Review */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline">2</Badge>
                  Academic Background
                </h3>
                <div className="grid gap-2 text-sm bg-muted/50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    <div>
                      <span className="text-muted-foreground">Education Level:</span>
                      <span className="ml-2 font-medium capitalize">{formData.previousEducationLevel}</span>
                    </div>
                    {formData.previousSchoolName && (
                      <div>
                        <span className="text-muted-foreground">School:</span>
                        <span className="ml-2 font-medium">{formData.previousSchoolName}</span>
                      </div>
                    )}
                    {formData.graduationYear && (
                      <div>
                        <span className="text-muted-foreground">Graduation Year:</span>
                        <span className="ml-2 font-medium">{formData.graduationYear}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Program Selection Review */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline">3</Badge>
                  Program Selection
                </h3>
                <div className="text-sm bg-muted/50 p-4 rounded-lg">
                  {selectedProgram ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <span className="text-muted-foreground">Program:</span>
                        <span className="ml-2 font-medium">{selectedProgram.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Code:</span>
                        <span className="ml-2 font-medium">{selectedProgram.code}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Duration:</span>
                        <span className="ml-2 font-medium">{selectedProgram.durationYears} years</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-destructive">No program selected</p>
                  )}
                </div>
              </div>

              {/* Emergency Contact Review */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Badge variant="outline">4</Badge>
                  Emergency Contact
                </h3>
                <div className="text-sm bg-muted/50 p-4 rounded-lg">
                  {formData.emergencyContactName ? (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div>
                        <span className="text-muted-foreground">Name:</span>
                        <span className="ml-2 font-medium">{formData.emergencyContactName}</span>
                      </div>
                      {formData.emergencyContactPhone && (
                        <div>
                          <span className="text-muted-foreground">Phone:</span>
                          <span className="ml-2 font-medium">{formData.emergencyContactPhone}</span>
                        </div>
                      )}
                      {formData.emergencyContactRelation && (
                        <div>
                          <span className="text-muted-foreground">Relationship:</span>
                          <span className="ml-2 font-medium">{formData.emergencyContactRelation}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No emergency contact provided</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={currentStep === 1 ? () => navigate('/admin/admissions') : handlePrevious}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {currentStep === 1 ? 'Cancel' : 'Previous'}
        </Button>
        <div className="flex gap-2">
          {currentStep < STEPS.length ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {isEditing ? 'Update Application' : 'Submit Application'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
