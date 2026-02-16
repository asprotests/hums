import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Eye, RotateCcw, TestTube } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { emailApi, type EmailTemplate, type EmailTemplateName } from '@/lib/api/email';

export function EmailTemplateEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [template, setTemplate] = useState<EmailTemplate | null>(null);

  // Form state
  const [subject, setSubject] = useState('');
  const [subjectLocal, setSubjectLocal] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [bodyHtmlLocal, setBodyHtmlLocal] = useState('');
  const [bodyTextLocal, setBodyTextLocal] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Dialogs
  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean;
    preview?: { subject: string; html: string };
  }>({ open: false });
  const [testDialog, setTestDialog] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [resetDialog, setResetDialog] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!id) return;
      setLoading(true);
      try {
        // Need to fetch all templates and find by ID since API uses name
        const res = await emailApi.getTemplates();
        if (res.success && res.data) {
          const found = res.data.find((t: EmailTemplate) => t.id === id);
          if (found) {
            setTemplate(found);
            setSubject(found.subject);
            setSubjectLocal(found.subjectLocal || '');
            setBodyHtml(found.bodyHtml);
            setBodyText(found.bodyText);
            setBodyHtmlLocal(found.bodyHtmlLocal || '');
            setBodyTextLocal(found.bodyTextLocal || '');
            setIsActive(found.isActive);
          } else {
            toast({
              title: 'Not found',
              description: 'Template not found',
              variant: 'destructive',
            });
            navigate('/admin/email/templates');
          }
        }
      } catch (error) {
        console.error('Failed to fetch template:', error);
        toast({
          title: 'Error',
          description: 'Failed to load template',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [id, navigate, toast]);

  // Track changes
  useEffect(() => {
    if (!template) return;
    const changed =
      subject !== template.subject ||
      subjectLocal !== (template.subjectLocal || '') ||
      bodyHtml !== template.bodyHtml ||
      bodyText !== template.bodyText ||
      bodyHtmlLocal !== (template.bodyHtmlLocal || '') ||
      bodyTextLocal !== (template.bodyTextLocal || '') ||
      isActive !== template.isActive;
    setHasChanges(changed);
  }, [template, subject, subjectLocal, bodyHtml, bodyText, bodyHtmlLocal, bodyTextLocal, isActive]);

  const handleSave = async () => {
    if (!template) return;
    setSaving(true);
    try {
      const res = await emailApi.updateTemplate(template.id, {
        subject,
        subjectLocal: subjectLocal || undefined,
        bodyHtml,
        bodyText,
        bodyHtmlLocal: bodyHtmlLocal || undefined,
        bodyTextLocal: bodyTextLocal || undefined,
        isActive,
      });

      if (res.success && res.data) {
        setTemplate(res.data);
        setHasChanges(false);
        toast({
          title: 'Saved',
          description: 'Template saved successfully',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to save template',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = async () => {
    if (!template) return;
    try {
      const res = await emailApi.previewTemplate(template.name as EmailTemplateName);
      if (res.success && res.data) {
        setPreviewDialog({
          open: true,
          preview: { subject: res.data.subject, html: res.data.html },
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load preview',
        variant: 'destructive',
      });
    }
  };

  const handleTest = async () => {
    if (!template || !testEmail) return;
    setSending(true);
    try {
      const res = await emailApi.testTemplate(template.name as EmailTemplateName, testEmail);
      if (res.success && res.data?.success) {
        toast({
          title: 'Test email sent',
          description: `Test email sent to ${testEmail}`,
        });
        setTestDialog(false);
        setTestEmail('');
      } else {
        toast({
          title: 'Failed',
          description: res.data?.error || 'Failed to send test email',
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

  const handleReset = async () => {
    if (!template) return;
    try {
      const res = await emailApi.resetTemplate(template.name as EmailTemplateName);
      if (res.success && res.data) {
        setTemplate(res.data);
        setSubject(res.data.subject);
        setSubjectLocal(res.data.subjectLocal || '');
        setBodyHtml(res.data.bodyHtml);
        setBodyText(res.data.bodyText);
        setBodyHtmlLocal(res.data.bodyHtmlLocal || '');
        setBodyTextLocal(res.data.bodyTextLocal || '');
        setIsActive(res.data.isActive);
        setHasChanges(false);
        toast({
          title: 'Reset',
          description: 'Template reset to default',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reset template',
        variant: 'destructive',
      });
    } finally {
      setResetDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!template) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/email/templates')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Template</h1>
            <p className="text-muted-foreground">{template.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePreview}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button variant="outline" onClick={() => setTestDialog(true)}>
            <TestTube className="mr-2 h-4 w-4" />
            Test
          </Button>
          <Button variant="outline" onClick={() => setResetDialog(true)}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {/* Template Info */}
      <Card>
        <CardHeader>
          <CardTitle>Template Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Status</Label>
              <Switch checked={isActive} onCheckedChange={setIsActive} />
              <span className="text-sm text-muted-foreground">
                {isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <Badge variant="outline">{template.category || 'General'}</Badge>
          </div>
          <div>
            <Label className="text-muted-foreground">Available Variables</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {template.variables.map((variable) => (
                <Badge key={variable} variant="secondary">
                  {`{{${variable}}}`}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subject */}
      <Card>
        <CardHeader>
          <CardTitle>Subject Line</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Subject (English)</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Subject (Somali)</Label>
            <Input
              value={subjectLocal}
              onChange={(e) => setSubjectLocal(e.target.value)}
              placeholder="Optional Somali translation"
            />
          </div>
        </CardContent>
      </Card>

      {/* Body */}
      <Card>
        <CardHeader>
          <CardTitle>Email Body</CardTitle>
          <CardDescription>
            Use HTML for rich formatting. Variables like {`{{firstName}}`} will be replaced.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="html-en">
            <TabsList>
              <TabsTrigger value="html-en">HTML (English)</TabsTrigger>
              <TabsTrigger value="text-en">Plain Text (English)</TabsTrigger>
              <TabsTrigger value="html-so">HTML (Somali)</TabsTrigger>
              <TabsTrigger value="text-so">Plain Text (Somali)</TabsTrigger>
            </TabsList>

            <TabsContent value="html-en" className="mt-4">
              <Textarea
                value={bodyHtml}
                onChange={(e) => setBodyHtml(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
                placeholder="<h2>Hello {{firstName}},</h2>"
              />
            </TabsContent>

            <TabsContent value="text-en" className="mt-4">
              <Textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
                placeholder="Hello {{firstName}},"
              />
            </TabsContent>

            <TabsContent value="html-so" className="mt-4">
              <Textarea
                value={bodyHtmlLocal}
                onChange={(e) => setBodyHtmlLocal(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
                placeholder="<h2>{{firstName}} Sharaf,</h2>"
              />
            </TabsContent>

            <TabsContent value="text-so" className="mt-4">
              <Textarea
                value={bodyTextLocal}
                onChange={(e) => setBodyTextLocal(e.target.value)}
                className="min-h-[400px] font-mono text-sm"
                placeholder="{{firstName}} Sharaf,"
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewDialog.open} onOpenChange={(open) => setPreviewDialog({ open })}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Email Preview</DialogTitle>
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

      {/* Test Email Dialog */}
      <Dialog open={testDialog} onOpenChange={setTestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
            <DialogDescription>
              Send a test email to verify the template looks correct.
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
            <Button variant="outline" onClick={() => setTestDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleTest} disabled={sending || !testEmail}>
              {sending ? 'Sending...' : 'Send Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation */}
      <AlertDialog open={resetDialog} onOpenChange={setResetDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will reset the template to its default content. Any customizations will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default EmailTemplateEditorPage;
