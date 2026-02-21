import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, Upload, Users, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
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
import { smsApi, type SMSTemplate, type SMSBalance } from '@/lib/api/sms';

type RecipientType = 'all-students' | 'all-employees' | 'group' | 'custom';

export function BulkSMSPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [balance, setBalance] = useState<SMSBalance | null>(null);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);

  // Form state
  const [recipientType, setRecipientType] = useState<RecipientType>('all-students');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [customNumbers, setCustomNumbers] = useState('');
  const [template, setTemplate] = useState<SMSTemplate>('custom');
  const [message, setMessage] = useState('');

  // Confirmation dialog
  const [showConfirm, setShowConfirm] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);

  // Simulated groups (would come from API)
  const groups = [
    { id: 'faculty-cs', name: 'Faculty of Computing Students', count: 250 },
    { id: 'faculty-bus', name: 'Faculty of Business Students', count: 180 },
    { id: 'semester-1', name: 'First Semester Students', count: 120 },
    { id: 'semester-2', name: 'Second Semester Students', count: 110 },
    { id: 'overdue-fees', name: 'Students with Overdue Fees', count: 45 },
    { id: 'all-lecturers', name: 'All Lecturers', count: 35 },
    { id: 'all-staff', name: 'Administrative Staff', count: 25 },
  ];

  useEffect(() => {
    const loadBalance = async () => {
      try {
        const res = await smsApi.getBalance();
        if (res.success && res.data) setBalance(res.data);
      } catch (error) {
        console.error('Failed to load balance:', error);
      }
    };
    loadBalance();
  }, []);

  // Update recipient count based on selection
  useEffect(() => {
    switch (recipientType) {
      case 'all-students':
        setRecipientCount(450); // Simulated
        break;
      case 'all-employees':
        setRecipientCount(60); // Simulated
        break;
      case 'group':
        const group = groups.find((g) => g.id === selectedGroup);
        setRecipientCount(group?.count || 0);
        break;
      case 'custom':
        const numbers = customNumbers
          .split(/[\n,;]/)
          .map((n) => n.trim())
          .filter((n) => n.length > 0);
        setRecipientCount(numbers.length);
        break;
    }
  }, [recipientType, selectedGroup, customNumbers]);

  const getCharacterCount = () => {
    return message.length;
  };

  const getSMSCount = () => {
    const chars = getCharacterCount();
    if (chars <= 160) return 1;
    return Math.ceil(chars / 153); // Multi-part SMS use 153 chars each
  };

  const getTotalCost = () => {
    return (recipientCount * getSMSCount() * 0.02).toFixed(2);
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast({
        title: 'Message Required',
        description: 'Please enter a message to send.',
        variant: 'destructive',
      });
      return;
    }

    if (recipientCount === 0) {
      toast({
        title: 'No Recipients',
        description: 'Please select recipients for the message.',
        variant: 'destructive',
      });
      return;
    }

    setShowConfirm(true);
  };

  const confirmSend = async () => {
    setShowConfirm(false);
    setSending(true);
    setProgress(0);

    try {
      // In real implementation, would get actual phone numbers from API
      let recipients: string[] = [];

      switch (recipientType) {
        case 'custom':
          recipients = customNumbers
            .split(/[\n,;]/)
            .map((n) => n.trim())
            .filter((n) => n.length > 0);
          break;
        default:
          // Would fetch from API based on selection
          // For demo, use simulated numbers
          recipients = Array.from({ length: recipientCount }, (_, i) => `+25261${String(i).padStart(7, '0')}`);
      }

      // Simulate progress
      const interval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 500);

      const res = await smsApi.sendBulkSMS({
        recipients,
        message,
        template: template !== 'custom' ? template : undefined,
      });

      clearInterval(interval);
      setProgress(100);

      if (res.success && res.data) {
        toast({
          title: 'SMS Sent',
          description: `Successfully sent ${res.data.successful}/${recipients.length} messages.`,
        });
        navigate('/admin/sms');
      } else if (res.data) {
        toast({
          title: 'Partial Failure',
          description: `Sent ${res.data.successful}/${recipients.length}. ${res.data.failed} failed.`,
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to send SMS.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
      setProgress(0);
    }
  };

  const templates: { value: SMSTemplate; label: string; text: string }[] = [
    { value: 'custom', label: 'Custom Message', text: '' },
    { value: 'payment-reminder', label: 'Payment Reminder', text: 'Reminder: Your semester fees are due. Please pay to avoid late fees. Hormuud University.' },
    { value: 'fee-due', label: 'Fee Due Notice', text: 'Notice: Your fee payment is overdue. Please settle immediately to avoid registration hold. HUMS Finance.' },
    { value: 'registration-reminder', label: 'Registration Reminder', text: 'Registration for the upcoming semester opens soon. Don\'t miss your preferred classes!' },
    { value: 'class-cancelled', label: 'Class Cancellation', text: 'Notice: Classes are cancelled today due to unforeseen circumstances. Check portal for updates.' },
  ];

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin/sms')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Send Bulk SMS</h1>
          <p className="text-muted-foreground">
            Send SMS to multiple recipients at once
          </p>
        </div>
      </div>

      {/* Recipients */}
      <Card>
        <CardHeader>
          <CardTitle>Recipients</CardTitle>
          <CardDescription>Select who should receive this message</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={recipientType}
            onValueChange={(v: string) => setRecipientType(v as RecipientType)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all-students" id="all-students" />
              <Label htmlFor="all-students">All Students</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="all-employees" id="all-employees" />
              <Label htmlFor="all-employees">All Employees</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="group" id="group" />
              <Label htmlFor="group">Specific Group</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="custom" id="custom" />
              <Label htmlFor="custom">Custom List</Label>
            </div>
          </RadioGroup>

          {recipientType === 'group' && (
            <Select value={selectedGroup} onValueChange={setSelectedGroup}>
              <SelectTrigger>
                <SelectValue placeholder="Select a group" />
              </SelectTrigger>
              <SelectContent>
                {groups.map((group) => (
                  <SelectItem key={group.id} value={group.id}>
                    {group.name} ({group.count})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {recipientType === 'custom' && (
            <div className="space-y-2">
              <Label>Phone Numbers (one per line or comma-separated)</Label>
              <Textarea
                value={customNumbers}
                onChange={(e) => setCustomNumbers(e.target.value)}
                placeholder="+252612345678&#10;+252619876543&#10;0617654321"
                className="min-h-[120px] font-mono text-sm"
              />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" type="button">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload CSV
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span>
              Selected: <strong>{recipientCount}</strong> recipients
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Message */}
      <Card>
        <CardHeader>
          <CardTitle>Message</CardTitle>
          <CardDescription>Compose your SMS message (160 chars = 1 SMS)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Template (Optional)</Label>
            <Select
              value={template}
              onValueChange={(v) => {
                setTemplate(v as SMSTemplate);
                const t = templates.find((t) => t.value === v);
                if (t && t.text) setMessage(t.text);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {templates.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Message</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="min-h-[150px]"
              maxLength={480}
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                Characters: {getCharacterCount()}/480
              </span>
              <span>
                SMS Count: {getSMSCount()} per recipient
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Estimate */}
      <Card>
        <CardContent className="py-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-muted-foreground text-sm">Recipients</p>
              <p className="text-2xl font-bold">{recipientCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">SMS per person</p>
              <p className="text-2xl font-bold">{getSMSCount()}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Estimated Cost</p>
              <p className="text-2xl font-bold">${getTotalCost()}</p>
            </div>
          </div>

          {balance && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Available balance: {balance.balance.toLocaleString()} SMS
              {balance.balance < recipientCount * getSMSCount() && (
                <span className="text-red-500 ml-2">(Insufficient balance!)</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate('/admin/sms')}>
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          disabled={sending || !message.trim() || recipientCount === 0}
        >
          {sending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send Now
            </>
          )}
        </Button>
      </div>

      {/* Sending Progress */}
      {sending && (
        <Card>
          <CardContent className="py-6">
            <div className="space-y-4">
              <Progress value={progress} />
              <p className="text-center text-muted-foreground">
                Sending messages... {Math.round(progress)}%
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Send</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to send <strong>{recipientCount * getSMSCount()}</strong> SMS
              to <strong>{recipientCount}</strong> recipients.
              <br /><br />
              Estimated cost: <strong>${getTotalCost()}</strong>
              <br /><br />
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSend}>
              Confirm Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default BulkSMSPage;
