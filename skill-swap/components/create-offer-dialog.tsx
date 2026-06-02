/**
 * Create Offer Dialog Component
 *
 * A dialog that allows a user in a connection to construct a custom session/credit offer.
 * Automatically fetches skills of both users and handles client-side validation.
 *
 * @fileoverview Dialog form for proposing a customized credit offer
 */
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useWallet } from '@/contexts/wallet-context';
import { Loader2, AlertCircle, Sparkles, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

interface CreateOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  otherUserId: string;
  otherUserName: string;
  onSubmitOffer: (offerData: {
    sessionName: string;
    description: string;
    skillId: string;
    skillName: string;
    credits: number;
    mode: 'ONLINE' | 'PHYSICAL';
    startDate: string;
    endDate: string;
    status: 'PENDING';
  }) => void;
  initialData?: {
    sessionName: string;
    description: string;
    skillId: string;
    credits: number;
    mode: 'ONLINE' | 'PHYSICAL';
    startDate: string;
    endDate: string;
  } | null;
}

interface SkillOption {
  id: string;
  name: string;
  isMySkill: boolean;
}

export function CreateOfferDialog({
  open,
  onOpenChange,
  otherUserId,
  otherUserName,
  onSubmitOffer,
  initialData,
}: CreateOfferDialogProps) {
  const { data: session } = useSession();
  const { wallet, refreshWallet } = useWallet();

  const [isLoadingSkills, setIsLoadingSkills] = useState(false);
  const [skills, setSkills] = useState<SkillOption[]>([]);

  // Form fields
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [sessionName, setSessionName] = useState('');
  const [description, setDescription] = useState('');
  const [credits, setCredits] = useState<string | number>(20);
  const [mode, setMode] = useState<'ONLINE' | 'PHYSICAL'>('ONLINE');
  
  // Date/Time fields
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('13:00');

  // Load skills when dialog opens
  useEffect(() => {
    const currentUserId = session?.user?.id;
    if (!open || !currentUserId || !otherUserId) return;

    const loadSkills = async () => {
      setIsLoadingSkills(true);
      try {
        // Fetch current user skills (Proposing to teach)
        const myRes = await fetch(`/api/users/${currentUserId}/skills`);
        let mySkills: any[] = [];
        if (myRes.ok) {
          const data = await myRes.json();
          mySkills = (data.skills || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            isMySkill: true,
          }));
        }

        // Fetch other user's skills (Proposing to learn)
        const otherRes = await fetch(`/api/users/${otherUserId}/skills`);
        let otherSkills: any[] = [];
        if (otherRes.ok) {
          const data = await otherRes.json();
          otherSkills = (data.skills || []).map((s: any) => ({
            id: s.id,
            name: s.name,
            isMySkill: false,
          }));
        }

        const combined = [...mySkills, ...otherSkills];
        setSkills(combined);

        if (combined.length > 0) {
          const hasMatch = initialData?.skillId && combined.some((s) => s.id === initialData.skillId);
          setSelectedSkillId(hasMatch ? initialData.skillId : combined[0].id);
        } else {
          setSelectedSkillId('');
        }
      } catch (error) {
        console.error('Error fetching skills for offer dialog:', error);
        toast.error('Failed to load skills list');
      } finally {
        setIsLoadingSkills(false);
      }
    };

    loadSkills();
    refreshWallet();
  }, [open, session?.user?.id, otherUserId, refreshWallet, initialData]);

  // Pre-populate fields when initialData is provided (e.g. for counter-offers)
  useEffect(() => {
    if (!open) return;
    if (initialData) {
      setSessionName(initialData.sessionName);
      setDescription(initialData.description || '');
      setCredits(initialData.credits);
      setMode(initialData.mode);
      if (initialData.skillId) {
        setSelectedSkillId(initialData.skillId);
      }
      try {
        const start = new Date(initialData.startDate);
        const end = new Date(initialData.endDate);
        setDate(start.toISOString().split('T')[0]);
        setStartTime(start.toTimeString().split(' ')[0].slice(0, 5));
        setEndTime(end.toTimeString().split(' ')[0].slice(0, 5));
      } catch (e) {
        console.error('Error parsing initialData dates:', e);
      }
    } else {
      setSessionName('');
      setDescription('');
      setCredits(20);
      setMode('ONLINE');
      // Pre-populate date with tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toISOString().split('T')[0]);
      setStartTime('12:00');
      setEndTime('13:00');
    }
  }, [open, initialData]);

  const selectedSkill = skills.find((s) => s.id === selectedSkillId);
  const isCurrentUserLearner = selectedSkill ? !selectedSkill.isMySkill : false;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSkillId) {
      toast.error('Please select a skill to swap');
      return;
    }
    if (!sessionName.trim()) {
      toast.error('Please enter a session topic');
      return;
    }
    if (!date) {
      toast.error('Please select a date');
      return;
    }
    if (!startTime || !endTime) {
      toast.error('Please specify the start and end times');
      return;
    }

    const startDateTime = new Date(`${date}T${startTime}`);
    const endDateTime = new Date(`${date}T${endTime}`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      toast.error('Please enter valid dates and times');
      return;
    }

    if (startDateTime < new Date()) {
      toast.error('Proposed session time must be in the future');
      return;
    }

    if (endDateTime <= startDateTime) {
      toast.error('End time must be after start time');
      return;
    }

    const creditsNum = Number(credits);
    if (isNaN(creditsNum) || !Number.isInteger(creditsNum) || creditsNum <= 0) {
      toast.error('Agreed credits must be a positive integer');
      return;
    }
    if (creditsNum < 5) {
      toast.error('Agreed credits must be at least 5');
      return;
    }

    // If current user is the Learner (selected other user's skill), validate balance
    const requiredCredits = 5 + creditsNum;
    if (isCurrentUserLearner && wallet && wallet.availableBalance < requiredCredits) {
      toast.error(
        `Insufficient wallet balance. You need ${requiredCredits} credits (5 credits upfront fee + ${creditsNum} credits for the session), but your current available balance is ${wallet.availableBalance} credits.`
      );
      return;
    }

    // Call submit handler
    onSubmitOffer({
      sessionName: sessionName.trim(),
      description: description.trim(),
      skillId: selectedSkillId,
      skillName: selectedSkill?.name || 'Skill Swap',
      credits: Number(credits),
      mode,
      startDate: startDateTime.toISOString(),
      endDate: endDateTime.toISOString(),
      status: 'PENDING',
    });

    // Reset fields & close
    setSessionName('');
    setDescription('');
    setCredits(20);
    setMode('ONLINE');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] bg-background border border-border rounded-xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            Create Proposal Offer
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-sm">
            Propose a customized, negotiated swap with {otherUserName}. The learner pays 5 upfront credits + negotiated credits held in escrow.
          </DialogDescription>
        </DialogHeader>

        {isLoadingSkills ? (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading swap options...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-4">
              {/* Skill Dropdown Selection */}
              <div className="space-y-2">
                <Label htmlFor="skill" className="text-sm font-semibold text-foreground">
                  Skill to Swap
                </Label>
                {skills.length === 0 ? (
                  <div className="p-3 border border-dashed border-border rounded-lg text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                    <AlertCircle className="w-4 h-4 text-warning" />
                    No teaching skills found on either profile. Add skills first!
                  </div>
                ) : (
                  <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
                    <SelectTrigger className="w-full bg-background border border-border">
                      <SelectValue placeholder="Select a skill..." />
                    </SelectTrigger>
                    <SelectContent>
                      {skills.some((s) => s.isMySkill) && (
                        <SelectGroup>
                          <SelectLabel className="text-xs text-primary font-bold px-2 py-1">
                            My Skills (Proposing to Teach)
                          </SelectLabel>
                          {skills
                            .filter((s) => s.isMySkill)
                            .map((s) => (
                              <SelectItem key={s.id} value={s.id} className="text-sm">
                                I teach: {s.name} (You receive credits)
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      )}
                      {skills.some((s) => !s.isMySkill) && (
                        <SelectGroup>
                          <SelectLabel className="text-xs text-primary font-bold px-2 py-1">
                            Their Skills (Proposing to Learn)
                          </SelectLabel>
                          {skills
                            .filter((s) => !s.isMySkill)
                            .map((s) => (
                              <SelectItem key={s.id} value={s.id} className="text-sm">
                                I learn: {s.name} (You pay credits)
                              </SelectItem>
                            ))}
                        </SelectGroup>
                      )}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Session Name */}
              <div className="space-y-2">
                <Label htmlFor="sessionName" className="text-sm font-semibold text-foreground">
                  Session Topic
                </Label>
                <Input
                  id="sessionName"
                  placeholder="e.g., Intro to Python Basics, Portfolio Review..."
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  className="bg-background border-border text-foreground"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold text-foreground">
                  Description / Agenda (Optional)
                </Label>
                <Textarea
                  id="description"
                  placeholder="Summarize what you want to cover or achieve..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="bg-background border-border text-foreground min-h-[70px] resize-none"
                />
              </div>

              {/* Credit Amount */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="credits" className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    Negotiated Credits
                  </Label>
                  <div className="relative">
                    <Input
                      id="credits"
                      type="number"
                      min={0}
                      value={credits}
                      onChange={(e) => setCredits(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
                      className="bg-background border-border text-foreground pr-8"
                    />
                    <CreditCard className="w-4 h-4 text-muted-foreground absolute right-3 top-3" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mode" className="text-sm font-semibold text-foreground">
                    Session Mode
                  </Label>
                  <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                    <SelectTrigger className="w-full bg-background border-border text-foreground">
                      <SelectValue placeholder="Mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ONLINE">Online Meeting</SelectItem>
                      <SelectItem value="PHYSICAL">In-Person (Physical)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Proposed Date & Times */}
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1 col-span-1">
                  <Label htmlFor="date" className="text-xs font-semibold text-foreground">
                    Proposed Date
                  </Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-background border-border text-foreground text-xs"
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <Label htmlFor="startTime" className="text-xs font-semibold text-foreground">
                    Start Time
                  </Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-background border-border text-foreground text-xs"
                  />
                </div>
                <div className="space-y-1 col-span-1">
                  <Label htmlFor="endTime" className="text-xs font-semibold text-foreground">
                    End Time
                  </Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="bg-background border-border text-foreground text-xs"
                  />
                </div>
              </div>

              {/* Info/Warning text about wallet cost */}
              {isCurrentUserLearner && wallet && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-foreground flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Payment Summary:</span> Proposing this teaches you a skill. Accepting will deduct 5 upfront credits + reserve {credits} credits (Total: {5 + (Number(credits) || 0)} credits). Your wallet balance is{' '}
                    <span className="font-bold text-primary">{wallet.availableBalance} credits</span>.
                  </div>
                </div>
              )}

              {!isCurrentUserLearner && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-foreground flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Payout Summary:</span> You are proposing to teach {otherUserName}. If accepted, you receive 5 upfront credits instantly, and {credits} credits will be escrowed to pay you upon completion.
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0 border-t border-border pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-border text-foreground hover:bg-muted"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={skills.length === 0} className="bg-primary text-primary-foreground">
                Propose Offer
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
