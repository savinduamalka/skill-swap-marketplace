'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Flag, Loader2, Ban, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const REPORT_REASONS = [
  { value: 'SPAM', label: 'Spam or misleading' },
  { value: 'HARASSMENT', label: 'Harassment or bullying' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Inappropriate content' },
  { value: 'FAKE_PROFILE', label: 'Fake profile' },
  { value: 'SCAM', label: 'Scam or fraud' },
  { value: 'HATE_SPEECH', label: 'Hate speech' },
  { value: 'IMPERSONATION', label: 'Impersonation' },
  { value: 'OTHER', label: 'Other' },
];

interface ReportUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  onBlockUser?: () => void;
}

export function ReportUserDialog({ open, onOpenChange, userId, userName, onBlockUser }: ReportUserDialogProps) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBlockPrompt, setShowBlockPrompt] = useState(false);
  const [alreadyReported, setAlreadyReported] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const resetState = () => {
    setReason('');
    setDescription('');
    setShowBlockPrompt(false);
    setAlreadyReported(false);
  };

  const handleClose = () => {
    // Only close — don't reset state yet to avoid flicker during close animation
    onOpenChange(false);
  };

  // Check if user has already reported this person when dialog opens
  const checkExistingReport = useCallback(async () => {
    setIsChecking(true);
    try {
      const response = await fetch(`/api/reports/check?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setAlreadyReported(data.hasActiveReport);
      }
    } catch {
      // Fail silently — the API will still reject duplicates
    } finally {
      setIsChecking(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open) {
      checkExistingReport();
    }
  }, [open, checkExistingReport]);

  const handleSubmit = async () => {
    if (!reason) {
      toast.error('Please select a reason');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedUserId: userId,
          contentType: 'user',
          contentId: userId,
          reason,
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle "already reported" gracefully
        if (response.status === 409 || data.code === 'ALREADY_REPORTED') {
          setAlreadyReported(true);
          return;
        }
        throw new Error(data.error || 'Failed to submit report');
      }

      toast.success('Report submitted. Our team will review it.');
      setShowBlockPrompt(true);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBlockAndClose = () => {
    if (onBlockUser) {
      onBlockUser();
    }
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        onOpenChange(false);
        // Delay reset until after close animation completes
        setTimeout(resetState, 200);
      } else {
        onOpenChange(true);
      }
    }}>
      <DialogContent className="sm:max-w-[425px]" aria-describedby={undefined}>
        {isChecking ? (
          <>
            <DialogHeader>
              <DialogTitle className="sr-only">Loading</DialogTitle>
              <DialogDescription className="sr-only">Checking report status</DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          </>
        ) : alreadyReported ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-500" />
                Already Reported
              </DialogTitle>
              <DialogDescription>
                You have already submitted a report for {userName}. Our team is currently reviewing it.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Duplicate reports are not allowed while a previous report is still under review. You will be notified once the review is complete.
                </p>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </div>
          </>
        ) : showBlockPrompt ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Report Submitted
              </DialogTitle>
              <DialogDescription>
                Your report has been submitted and our team will review it shortly.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6 space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
                <Ban className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Do you also want to block {userName}?</p>
                  <p className="text-xs text-muted-foreground">
                    Blocking will prevent them from seeing your profile, sending messages, or connecting with you.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose}>
                No, just report
              </Button>
              <Button variant="destructive" onClick={handleBlockAndClose}>
                <Ban className="w-4 h-4 mr-1" />
                Block {userName}
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flag className="w-4 h-4 text-destructive" />
                Report {userName}
              </DialogTitle>
              <DialogDescription>
                Help us understand the issue. Select the violation that applies.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
                {REPORT_REASONS.map((r) => (
                  <div key={r.value} className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value={r.value} id={r.value} />
                    <Label htmlFor={r.value} className="cursor-pointer flex-1 text-sm">{r.label}</Label>
                  </div>
                ))}
              </RadioGroup>

              <div className="space-y-2">
                <Label htmlFor="report-desc">Additional details (optional)</Label>
                <Textarea
                  id="report-desc"
                  placeholder="Provide more context about this report..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={500}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button variant="destructive" onClick={handleSubmit} disabled={!reason || isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Submit Report
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
