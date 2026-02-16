import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Edit2, RotateCcw, TestTube, Eye, Check, X, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useToast } from '@/hooks/use-toast';
import { emailApi, type EmailTemplate, type EmailTemplateName, type QueueStats } from '@/lib/api/email';

const CATEGORIES = [
  { value: '', label: 'All Categories' },
  { value: 'auth', label: 'Authentication' },
  { value: 'admission', label: 'Admission' },
  { value: 'academic', label: 'Academic' },
  { value: 'finance', label: 'Finance' },
  { value: 'hr', label: 'HR' },
  { value: 'library', label: 'Library' },
  { value: 'general', label: 'General' },
];

export function EmailTemplatesPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [smtpConnected, setSmtpConnected] = useState<boolean | null>(null);

  // Dialog states
  const [testDialog, setTestDialog] = useState<{ open: boolean; template?: EmailTemplate }>({
    open: false,
  });
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [resetDialog, setResetDialog] = useState<{ open: boolean; template?: EmailTemplate }>({
    open: false,
  });
  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean;
    template?: EmailTemplate;
    preview?: { subject: string; html: string };
  }>({ open: false });

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await emailApi.getTemplates({ category: category || undefined });
      if (res.success && res.data) {
        setTemplates(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load email templates',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchQueueStats = async () => {
    try {
      const res = await emailApi.getQueueStatus();
      if (res.success && res.data) {
        setQueueStats(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch queue stats:', error);
    }
  };

  const checkSmtpConnection = async () => {
    try {
      const res = await emailApi.verifyConnection();
      if (res.success && res.data) {
        setSmtpConnected(res.data.connected);
      }
    } catch {
      setSmtpConnected(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
    fetchQueueStats();
    checkSmtpConnection();
  }, [category]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    setSearchParams(params, { replace: true });
  }, [category, setSearchParams]);

  const handleTestEmail = async () => {
    if (!testDialog.template || !testEmail) return;

    setSending(true);
    try {
      const res = await emailApi.testTemplate(testDialog.template.name as EmailTemplateName, testEmail);
      if (res.success && res.data?.success) {
        toast({
          title: 'Test email sent',
          description: `Test email sent to ${testEmail}`,
        });
        setTestDialog({ open: false });
        setTestEmail('');
      } else {
        toast({
          title: 'Failed to send test email',
          description: res.data?.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to send test email',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleResetTemplate = async () => {
    if (!resetDialog.template) return;

    try {
      const res = await emailApi.resetTemplate(resetDialog.template.name as EmailTemplateName);
      if (res.success) {
        toast({
          title: 'Template reset',
          description: 'Template has been reset to default',
        });
        fetchTemplates();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reset template',
        variant: 'destructive',
      });
    } finally {
      setResetDialog({ open: false });
    }
  };

  const handlePreview = async (template: EmailTemplate) => {
    try {
      const res = await emailApi.previewTemplate(template.name as EmailTemplateName);
      if (res.success && res.data) {
        setPreviewDialog({
          open: true,
          template,
          preview: { subject: res.data.subject, html: res.data.html },
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load preview',
        variant: 'destructive',
      });
    }
  };

  const handleSeedTemplates = async () => {
    try {
      await emailApi.seedTemplates();
      toast({
        title: 'Templates seeded',
        description: 'Default templates have been created',
      });
      fetchTemplates();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to seed templates',
        variant: 'destructive',
      });
    }
  };

  const getCategoryLabel = (cat?: string) => {
    return CATEGORIES.find((c) => c.value === cat)?.label || cat || 'General';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Email Templates</h1>
          <p className="text-muted-foreground">Manage system email templates</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSeedTemplates}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Seed Defaults
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">SMTP Status</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {smtpConnected === null ? (
                <span className="text-muted-foreground">Checking...</span>
              ) : smtpConnected ? (
                <>
                  <Check className="h-4 w-4 text-green-500" />
                  <span className="text-green-600">Connected</span>
                </>
              ) : (
                <>
                  <X className="h-4 w-4 text-red-500" />
                  <span className="text-red-600">Disconnected</span>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {queueStats && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Emails Sent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{queueStats.sent}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{queueStats.pending}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Failed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{queueStats.failed}</div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="w-[200px]">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value || 'all'} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>
            {templates.length} template{templates.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No templates found</p>
              <Button variant="link" onClick={handleSeedTemplates}>
                Seed default templates
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">{template.name}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{template.subject}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getCategoryLabel(template.category)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.isActive ? 'default' : 'secondary'}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Preview"
                          onClick={() => handlePreview(template)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Edit"
                          onClick={() => navigate(`/admin/email/templates/${template.id}/edit`)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Send Test"
                          onClick={() => setTestDialog({ open: true, template })}
                        >
                          <TestTube className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reset to Default"
                          onClick={() => setResetDialog({ open: true, template })}
                        >
                          <RotateCcw className="h-4 w-4" />
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

      {/* Test Email Dialog */}
      <Dialog open={testDialog.open} onOpenChange={(open) => setTestDialog({ open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email using the "{testDialog.template?.name}" template.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Recipient Email</Label>
              <Input
                type="email"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTestDialog({ open: false })}>
              Cancel
            </Button>
            <Button onClick={handleTestEmail} disabled={sending || !testEmail}>
              {sending ? 'Sending...' : 'Send Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <AlertDialog
        open={resetDialog.open}
        onOpenChange={(open) => setResetDialog({ open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the "{resetDialog.template?.name}" template to its default content.
              Any customizations will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetTemplate}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialog.open}
        onOpenChange={(open) => setPreviewDialog({ open })}
      >
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Preview: {previewDialog.template?.name}</DialogTitle>
            <DialogDescription>Subject: {previewDialog.preview?.subject}</DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg overflow-auto max-h-[60vh]">
            {previewDialog.preview?.html && (
              <iframe
                srcDoc={previewDialog.preview.html}
                className="w-full min-h-[400px]"
                title="Email Preview"
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialog({ open: false })}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default EmailTemplatesPage;
