import { useState, useEffect, useRef } from 'react';
import { Settings, Upload, Save, RotateCcw, Loader2, Building2, Clock, Shield, GraduationCap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { configApi, type SystemConfig, type GradeScaleItem } from '@/lib/api/config';

const TIMEZONES = [
  { value: 'Africa/Mogadishu', label: 'Africa/Mogadishu (EAT)' },
  { value: 'Africa/Nairobi', label: 'Africa/Nairobi (EAT)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
];

const DATE_FORMATS = [
  { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (31/12/2025)' },
  { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (12/31/2025)' },
  { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (2025-12-31)' },
];

const CURRENCIES = [
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'SOS', label: 'Somali Shilling (SOS)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
];

export function SystemSettingsPage() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    universityName: '',
    primaryColor: '#2563eb',
    timezone: 'Africa/Mogadishu',
    dateFormat: 'DD/MM/YYYY',
    currency: 'USD',
    minAttendancePercentage: 75,
    sessionTimeoutMinutes: 30,
    maxLoginAttempts: 5,
    passwordExpiryDays: 90,
  });

  const [gradeScale, setGradeScale] = useState<GradeScaleItem[]>([]);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await configApi.getConfig();
      if (response.success && response.data) {
        setConfig(response.data);
        setFormData({
          universityName: response.data.universityName || '',
          primaryColor: response.data.primaryColor || '#2563eb',
          timezone: response.data.timezone || 'Africa/Mogadishu',
          dateFormat: response.data.dateFormat || 'DD/MM/YYYY',
          currency: response.data.currency || 'USD',
          minAttendancePercentage: response.data.minAttendancePercentage || 75,
          sessionTimeoutMinutes: response.data.sessionTimeoutMinutes || 30,
          maxLoginAttempts: response.data.maxLoginAttempts || 5,
          passwordExpiryDays: response.data.passwordExpiryDays || 90,
        });
        setGradeScale(response.data.gradeScale || []);
      }
    } catch (err: any) {
      console.error('Failed to load config:', err);
      setError(err.response?.data?.message || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await configApi.updateConfig({
        ...formData,
        gradeScale,
      });

      setSuccess('Settings saved successfully');
      await loadConfig();
    } catch (err: any) {
      console.error('Failed to save config:', err);
      setError(err.response?.data?.message || 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be less than 2MB');
      return;
    }

    try {
      setUploadingLogo(true);
      setError(null);
      await configApi.uploadLogo(file);
      setSuccess('Logo uploaded successfully');
      await loadConfig();
    } catch (err: any) {
      console.error('Failed to upload logo:', err);
      setError(err.response?.data?.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all settings to defaults?')) return;

    try {
      setSaving(true);
      setError(null);
      await configApi.resetToDefaults();
      setSuccess('Settings reset to defaults');
      await loadConfig();
    } catch (err: any) {
      console.error('Failed to reset config:', err);
      setError(err.response?.data?.message || 'Failed to reset configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateGradeScale = (index: number, field: keyof GradeScaleItem, value: string | number) => {
    const updated = [...gradeScale];
    updated[index] = { ...updated[index], [field]: value };
    setGradeScale(updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Settings className="h-8 w-8" />
            System Settings
          </h1>
          <p className="text-muted-foreground">Configure system-wide settings</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 text-green-800 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="localization" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Localization
          </TabsTrigger>
          <TabsTrigger value="academic" className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Academic
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>Configure university branding settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="universityName">University Name</Label>
                  <Input
                    id="universityName"
                    value={formData.universityName}
                    onChange={(e) => setFormData({ ...formData, universityName: e.target.value })}
                    placeholder="Enter university name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="w-16 h-10 p-1 cursor-pointer"
                    />
                    <Input
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      placeholder="#2563eb"
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>University Logo</Label>
                <div className="flex items-center gap-4">
                  {config?.logo && (
                    <img
                      src={`${import.meta.env.VITE_API_URL}${config.logo}`}
                      alt="University Logo"
                      className="h-16 w-auto object-contain border rounded"
                    />
                  )}
                  <div>
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={uploadingLogo}
                    >
                      {uploadingLogo ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      Upload Logo
                    </Button>
                    <p className="text-sm text-muted-foreground mt-1">
                      Max size: 2MB. Formats: PNG, JPG, SVG, WebP
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Localization Settings */}
        <TabsContent value="localization">
          <Card>
            <CardHeader>
              <CardTitle>Regional Settings</CardTitle>
              <CardDescription>Configure timezone, date format, and currency</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select
                    value={formData.dateFormat}
                    onValueChange={(value) => setFormData({ ...formData, dateFormat: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select date format" />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_FORMATS.map((df) => (
                        <SelectItem key={df.value} value={df.value}>
                          {df.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Academic Settings */}
        <TabsContent value="academic">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Requirements</CardTitle>
                <CardDescription>Set minimum attendance percentage for students</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-w-xs">
                  <Label htmlFor="minAttendance">Minimum Attendance (%)</Label>
                  <Input
                    id="minAttendance"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.minAttendancePercentage}
                    onChange={(e) => setFormData({ ...formData, minAttendancePercentage: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Students below this percentage will receive warnings
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Grading Scale</CardTitle>
                <CardDescription>Configure the grading system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-5 gap-4 font-medium text-sm text-muted-foreground">
                    <div>Min Score</div>
                    <div>Max Score</div>
                    <div>Letter Grade</div>
                    <div>Grade Points</div>
                    <div></div>
                  </div>
                  {gradeScale.map((grade, index) => (
                    <div key={index} className="grid grid-cols-5 gap-4 items-center">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={grade.minScore}
                        onChange={(e) => updateGradeScale(index, 'minScore', parseInt(e.target.value) || 0)}
                      />
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={grade.maxScore}
                        onChange={(e) => updateGradeScale(index, 'maxScore', parseInt(e.target.value) || 0)}
                      />
                      <Input
                        value={grade.letterGrade}
                        onChange={(e) => updateGradeScale(index, 'letterGrade', e.target.value)}
                        maxLength={2}
                      />
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={grade.gradePoints}
                        onChange={(e) => updateGradeScale(index, 'gradePoints', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Configure authentication and session settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    min="5"
                    max="1440"
                    value={formData.sessionTimeoutMinutes}
                    onChange={(e) => setFormData({ ...formData, sessionTimeoutMinutes: parseInt(e.target.value) || 30 })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Users will be logged out after inactivity
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                  <Input
                    id="maxLoginAttempts"
                    type="number"
                    min="1"
                    max="10"
                    value={formData.maxLoginAttempts}
                    onChange={(e) => setFormData({ ...formData, maxLoginAttempts: parseInt(e.target.value) || 5 })}
                  />
                  <p className="text-sm text-muted-foreground">
                    Account locks after failed attempts
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passwordExpiry">Password Expiry (days)</Label>
                  <Input
                    id="passwordExpiry"
                    type="number"
                    min="0"
                    max="365"
                    value={formData.passwordExpiryDays}
                    onChange={(e) => setFormData({ ...formData, passwordExpiryDays: parseInt(e.target.value) || 90 })}
                  />
                  <p className="text-sm text-muted-foreground">
                    0 = never expires
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
