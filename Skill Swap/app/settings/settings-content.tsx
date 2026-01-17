'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  User,
  Mail,
  Globe,
  Clock,
  Shield,
  Bell,
  Trash2,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  BookOpen,
  Settings,
  Lock,
  Eye,
  EyeOff,
  Plus,
  X,
  Edit2,
  Camera,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

// Proficiency levels
const PROFICIENCY_LEVELS = [
  { value: 'Beginner', label: 'Beginner' },
  { value: 'Intermediate', label: 'Intermediate' },
  { value: 'Advanced', label: 'Advanced' },
  { value: 'Expert', label: 'Expert' },
];

// Teaching formats
const TEACHING_FORMATS = [
  { value: 'Online', label: 'Online' },
  { value: 'In-Person', label: 'In-Person' },
  { value: 'Hybrid', label: 'Hybrid' },
];

// Types
interface SkillOffered {
  id: string;
  name: string;
  description: string;
  proficiencyLevel: string;
  yearsOfExperience: number;
  teachingFormat: string;
}

interface SkillWanted {
  id: string;
  name: string;
  description: string | null;
  proficiencyTarget: string | null;
}

interface UserData {
  id: string;
  email: string | null;
  fullName: string | null;
  name: string | null;
  bio: string | null;
  timeZone: string | null;
  image: string | null;
  isVerified: boolean;
  createdAt: Date;
  skillsOffered: SkillOffered[];
  skillsWanted: SkillWanted[];
  hasPassword: boolean; // True if user signed up with email/password, false for SSO users
}

interface SettingsContentProps {
  user: UserData;
}

// Time zones list
const TIME_ZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HST)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central European Time (CET)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'China (CST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)' },
];

export function SettingsContent({ user }: SettingsContentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Account form state
  const [fullName, setFullName] = useState(user.fullName || user.name || '');
  const [bio, setBio] = useState(user.bio || '');
  const [timeZone, setTimeZone] = useState(user.timeZone || 'UTC');
  const [isSaving, setIsSaving] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [sessionReminders, setSessionReminders] = useState(true);
  const [newMatchNotifications, setNewMatchNotifications] = useState(true);
  const [messageNotifications, setMessageNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  // Privacy settings
  const [profileVisibility, setProfileVisibility] = useState('public');
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [allowMessages, setAllowMessages] = useState('everyone');

  // Skills I Can Teach modal state
  const [isAddSkillOpen, setIsAddSkillOpen] = useState(false);
  const [isEditSkillOpen, setIsEditSkillOpen] = useState(false);
  const [editingSkill, setEditingSkill] = useState<SkillOffered | null>(null);
  const [skillName, setSkillName] = useState('');
  const [skillDescription, setSkillDescription] = useState('');
  const [skillProficiency, setSkillProficiency] = useState('');
  const [skillYears, setSkillYears] = useState('');
  const [skillFormat, setSkillFormat] = useState('');
  const [isSavingSkill, setIsSavingSkill] = useState(false);

  // Skills I Want to Learn modal state
  const [isAddSkillWantOpen, setIsAddSkillWantOpen] = useState(false);
  const [isEditSkillWantOpen, setIsEditSkillWantOpen] = useState(false);
  const [editingSkillWant, setEditingSkillWant] = useState<SkillWanted | null>(
    null
  );
  const [skillWantName, setSkillWantName] = useState('');
  const [skillWantDescription, setSkillWantDescription] = useState('');
  const [skillWantTarget, setSkillWantTarget] = useState('');
  const [isSavingSkillWant, setIsSavingSkillWant] = useState(false);

  // Get user initials for avatar fallback
  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle account update
  const handleSaveAccount = async () => {
    setIsSaving(true);

    try {
      const response = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          bio: bio.trim(),
          timeZone,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update settings');
      }

      toast.success('Settings updated successfully!');

      // Refresh the page to get updated data
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update settings'
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    setIsChangingPassword(true);

    try {
      const response = await fetch('/api/user/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to change password'
      );
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle account deletion
  const handleDeleteAccount = async () => {
    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete account');
      }

      toast.success('Account deleted successfully');

      // Use signOut from next-auth/react to properly clear session cookies
      // This will clear all auth cookies and redirect to home page
      await signOut({ callbackUrl: '/', redirect: true });
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete account'
      );
    }
  };

  // Reset skill form
  const resetSkillForm = () => {
    setSkillName('');
    setSkillDescription('');
    setSkillProficiency('');
    setSkillYears('');
    setSkillFormat('');
    setEditingSkill(null);
  };

  // Reset skill want form
  const resetSkillWantForm = () => {
    setSkillWantName('');
    setSkillWantDescription('');
    setSkillWantTarget('');
    setEditingSkillWant(null);
  };

  // Handle add skill (Skills I Can Teach)
  const handleAddSkill = async () => {
    if (
      !skillName.trim() ||
      !skillDescription.trim() ||
      !skillProficiency ||
      !skillYears ||
      !skillFormat
    ) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSavingSkill(true);

    try {
      const response = await fetch('/api/user/skills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: skillName.trim(),
          description: skillDescription.trim(),
          proficiencyLevel: skillProficiency,
          yearsOfExperience: parseInt(skillYears),
          teachingFormat: skillFormat,
          timeZone: user.timeZone || 'UTC',
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add skill');
      }

      toast.success('Skill added successfully!');
      setIsAddSkillOpen(false);
      resetSkillForm();
      startTransition(() => router.refresh());
    } catch (error) {
      console.error('Error adding skill:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to add skill'
      );
    } finally {
      setIsSavingSkill(false);
    }
  };

  // Handle edit skill
  const handleEditSkill = async () => {
    if (
      !editingSkill ||
      !skillName.trim() ||
      !skillDescription.trim() ||
      !skillProficiency ||
      !skillYears ||
      !skillFormat
    ) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSavingSkill(true);

    try {
      const response = await fetch('/api/user/skills', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSkill.id,
          name: skillName.trim(),
          description: skillDescription.trim(),
          proficiencyLevel: skillProficiency,
          yearsOfExperience: parseInt(skillYears),
          teachingFormat: skillFormat,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update skill');
      }

      toast.success('Skill updated successfully!');
      setIsEditSkillOpen(false);
      resetSkillForm();
      startTransition(() => router.refresh());
    } catch (error) {
      console.error('Error updating skill:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update skill'
      );
    } finally {
      setIsSavingSkill(false);
    }
  };

  // Handle delete skill
  const handleDeleteSkill = async (skillId: string) => {
    try {
      const response = await fetch(`/api/user/skills?id=${skillId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete skill');
      }

      toast.success('Skill deleted successfully!');
      startTransition(() => router.refresh());
    } catch (error) {
      console.error('Error deleting skill:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete skill'
      );
    }
  };

  // Open edit skill modal
  const openEditSkillModal = (skill: SkillOffered) => {
    setEditingSkill(skill);
    setSkillName(skill.name);
    setSkillDescription(skill.description);
    setSkillProficiency(skill.proficiencyLevel);
    setSkillYears(skill.yearsOfExperience.toString());
    setSkillFormat(skill.teachingFormat);
    setIsEditSkillOpen(true);
  };

  // Handle add skill want (Skills I Want to Learn)
  const handleAddSkillWant = async () => {
    if (!skillWantName.trim()) {
      toast.error('Please enter a skill name');
      return;
    }

    setIsSavingSkillWant(true);

    try {
      const response = await fetch('/api/user/skills-wanted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: skillWantName.trim(),
          description: skillWantDescription.trim() || null,
          proficiencyTarget: skillWantTarget || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to add learning goal');
      }

      toast.success('Learning goal added successfully!');
      setIsAddSkillWantOpen(false);
      resetSkillWantForm();
      startTransition(() => router.refresh());
    } catch (error) {
      console.error('Error adding learning goal:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to add learning goal'
      );
    } finally {
      setIsSavingSkillWant(false);
    }
  };

  // Handle edit skill want
  const handleEditSkillWant = async () => {
    if (!editingSkillWant || !skillWantName.trim()) {
      toast.error('Please enter a skill name');
      return;
    }

    setIsSavingSkillWant(true);

    try {
      const response = await fetch('/api/user/skills-wanted', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSkillWant.id,
          name: skillWantName.trim(),
          description: skillWantDescription.trim() || null,
          proficiencyTarget: skillWantTarget || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update learning goal');
      }

      toast.success('Learning goal updated successfully!');
      setIsEditSkillWantOpen(false);
      resetSkillWantForm();
      startTransition(() => router.refresh());
    } catch (error) {
      console.error('Error updating learning goal:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update learning goal'
      );
    } finally {
      setIsSavingSkillWant(false);
    }
  };

  // Handle delete skill want
  const handleDeleteSkillWant = async (skillWantId: string) => {
    try {
      const response = await fetch(
        `/api/user/skills-wanted?id=${skillWantId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete learning goal');
      }

      toast.success('Learning goal deleted successfully!');
      startTransition(() => router.refresh());
    } catch (error) {
      console.error('Error deleting learning goal:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to delete learning goal'
      );
    }
  };

  // Open edit skill want modal
  const openEditSkillWantModal = (skillWant: SkillWanted) => {
    setEditingSkillWant(skillWant);
    setSkillWantName(skillWant.name);
    setSkillWantDescription(skillWant.description || '');
    setSkillWantTarget(skillWant.proficiencyTarget || '');
    setIsEditSkillWantOpen(true);
  };

  return (
    <Tabs defaultValue="account" className="space-y-6">
      <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
        <TabsTrigger value="account" className="flex items-center gap-2">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">Account</span>
        </TabsTrigger>
        <TabsTrigger value="skills" className="flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Skills</span>
        </TabsTrigger>
        <TabsTrigger value="notifications" className="flex items-center gap-2">
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">Notifications</span>
        </TabsTrigger>
        <TabsTrigger value="privacy" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">Privacy</span>
        </TabsTrigger>
        <TabsTrigger value="danger" className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          <span className="hidden sm:inline">Danger</span>
        </TabsTrigger>
      </TabsList>

      {/* Account Tab */}
      <TabsContent value="account" className="space-y-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your personal details and public profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.image || undefined} alt={fullName} />
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {getInitials(fullName || user.name)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="outline"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <h3 className="font-medium">
                  {fullName || user.name || 'User'}
                </h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
                {user.isVerified && (
                  <Badge variant="secondary" className="mt-1">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Form Fields */}
            <div className="grid gap-6">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="fullName"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Email (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={user.email || ''}
                    disabled
                    className="pl-10 bg-muted"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Contact support to change your email address
                </p>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself, your experience, and what you're passionate about..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {bio.length}/500 characters
                </p>
              </div>

              {/* Time Zone */}
              <div className="space-y-2">
                <Label htmlFor="timezone">Time Zone</Label>
                <Select value={timeZone} onValueChange={setTimeZone}>
                  <SelectTrigger className="w-full">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <SelectValue placeholder="Select your time zone" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_ZONES.map((tz) => (
                      <SelectItem key={tz.value} value={tz.value}>
                        {tz.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSaveAccount}
                disabled={isSaving || isPending}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Password Change Card - Only show for non-SSO users */}
        {user.hasPassword ? (
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  variant="outline"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Changing...
                    </>
                  ) : (
                    'Change Password'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>
                You signed in using a social account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">
                    Single Sign-On (SSO) Account
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your account is linked to a social login provider (Google or
                    Facebook). To change your password, please visit your
                    provider's account settings.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      {/* Skills Tab */}
      <TabsContent value="skills" className="space-y-6">
        {/* Skills I Offer */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Skills I Can Teach</CardTitle>
                <CardDescription>
                  Skills you can share with others in the community
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  resetSkillForm();
                  setIsAddSkillOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Skill
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {user.skillsOffered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No skills added yet</p>
                <p className="text-sm">
                  Add skills you can teach to start connecting with learners
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {user.skillsOffered.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{skill.name}</h4>
                        <Badge variant="outline" className="capitalize">
                          {skill.proficiencyLevel.toLowerCase()}
                        </Badge>
                      </div>
                      {skill.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {skill.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {skill.yearsOfExperience && (
                          <span>
                            {skill.yearsOfExperience} years experience
                          </span>
                        )}
                        {skill.teachingFormat && (
                          <span className="capitalize">
                            {skill.teachingFormat}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditSkillModal(skill)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Skill</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{skill.name}"?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteSkill(skill.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Skills I Want to Learn */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Skills I Want to Learn</CardTitle>
                <CardDescription>
                  Skills you're interested in learning from others
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  resetSkillWantForm();
                  setIsAddSkillWantOpen(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Skill
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {user.skillsWanted.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No learning goals added yet</p>
                <p className="text-sm">
                  Add skills you want to learn to find teachers
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {user.skillsWanted.map((skill) => (
                  <div
                    key={skill.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{skill.name}</h4>
                        {skill.proficiencyTarget && (
                          <Badge variant="secondary" className="capitalize">
                            Goal: {skill.proficiencyTarget.toLowerCase()}
                          </Badge>
                        )}
                      </div>
                      {skill.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {skill.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditSkillWantModal(skill)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Delete Learning Goal
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{skill.name}"?
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteSkillWant(skill.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Skill Modal */}
        <Dialog open={isAddSkillOpen} onOpenChange={setIsAddSkillOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Skill</DialogTitle>
              <DialogDescription>
                Add a skill you can teach to others in the community
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-skill-name">Skill Name *</Label>
                <Input
                  id="add-skill-name"
                  placeholder="e.g., JavaScript, Guitar, Cooking"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-skill-description">Description *</Label>
                <Textarea
                  id="add-skill-description"
                  placeholder="Describe what you can teach and your approach..."
                  value={skillDescription}
                  onChange={(e) => setSkillDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Proficiency Level *</Label>
                  <Select
                    value={skillProficiency}
                    onValueChange={setSkillProficiency}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROFICIENCY_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-skill-years">Years of Experience *</Label>
                  <Input
                    id="add-skill-years"
                    type="number"
                    min="0"
                    placeholder="e.g., 5"
                    value={skillYears}
                    onChange={(e) => setSkillYears(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Teaching Format *</Label>
                <Select value={skillFormat} onValueChange={setSkillFormat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEACHING_FORMATS.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddSkillOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddSkill} disabled={isSavingSkill}>
                {isSavingSkill ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Skill'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Skill Modal */}
        <Dialog open={isEditSkillOpen} onOpenChange={setIsEditSkillOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Skill</DialogTitle>
              <DialogDescription>
                Update the details of your skill
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-skill-name">Skill Name *</Label>
                <Input
                  id="edit-skill-name"
                  placeholder="e.g., JavaScript, Guitar, Cooking"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-skill-description">Description *</Label>
                <Textarea
                  id="edit-skill-description"
                  placeholder="Describe what you can teach and your approach..."
                  value={skillDescription}
                  onChange={(e) => setSkillDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Proficiency Level *</Label>
                  <Select
                    value={skillProficiency}
                    onValueChange={setSkillProficiency}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROFICIENCY_LEVELS.map((level) => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-skill-years">
                    Years of Experience *
                  </Label>
                  <Input
                    id="edit-skill-years"
                    type="number"
                    min="0"
                    placeholder="e.g., 5"
                    value={skillYears}
                    onChange={(e) => setSkillYears(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Teaching Format *</Label>
                <Select value={skillFormat} onValueChange={setSkillFormat}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEACHING_FORMATS.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditSkillOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleEditSkill} disabled={isSavingSkill}>
                {isSavingSkill ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Skill Want Modal */}
        <Dialog open={isAddSkillWantOpen} onOpenChange={setIsAddSkillWantOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Learning Goal</DialogTitle>
              <DialogDescription>
                Add a skill you want to learn from others
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-skill-want-name">Skill Name *</Label>
                <Input
                  id="add-skill-want-name"
                  placeholder="e.g., Piano, Machine Learning, Photography"
                  value={skillWantName}
                  onChange={(e) => setSkillWantName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-skill-want-description">
                  Description (Optional)
                </Label>
                <Textarea
                  id="add-skill-want-description"
                  placeholder="What specifically would you like to learn?"
                  value={skillWantDescription}
                  onChange={(e) => setSkillWantDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Target Proficiency (Optional)</Label>
                <Select
                  value={skillWantTarget}
                  onValueChange={setSkillWantTarget}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target level" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFICIENCY_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddSkillWantOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddSkillWant} disabled={isSavingSkillWant}>
                {isSavingSkillWant ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Learning Goal'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Skill Want Modal */}
        <Dialog
          open={isEditSkillWantOpen}
          onOpenChange={setIsEditSkillWantOpen}
        >
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Edit Learning Goal</DialogTitle>
              <DialogDescription>
                Update the details of your learning goal
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-skill-want-name">Skill Name *</Label>
                <Input
                  id="edit-skill-want-name"
                  placeholder="e.g., Piano, Machine Learning, Photography"
                  value={skillWantName}
                  onChange={(e) => setSkillWantName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-skill-want-description">
                  Description (Optional)
                </Label>
                <Textarea
                  id="edit-skill-want-description"
                  placeholder="What specifically would you like to learn?"
                  value={skillWantDescription}
                  onChange={(e) => setSkillWantDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Target Proficiency (Optional)</Label>
                <Select
                  value={skillWantTarget}
                  onValueChange={setSkillWantTarget}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target level" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROFICIENCY_LEVELS.map((level) => (
                      <SelectItem key={level.value} value={level.value}>
                        {level.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsEditSkillWantOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditSkillWant}
                disabled={isSavingSkillWant}
              >
                {isSavingSkillWant ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TabsContent>

      {/* Notifications Tab */}
      <TabsContent value="notifications" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Email Notifications</CardTitle>
            <CardDescription>
              Manage how and when you receive email notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email notifications for important updates
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Session Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Get reminded about upcoming skill-swap sessions
                </p>
              </div>
              <Switch
                checked={sessionReminders}
                onCheckedChange={setSessionReminders}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>New Match Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Be notified when someone wants to learn/teach a skill you
                  offer/want
                </p>
              </div>
              <Switch
                checked={newMatchNotifications}
                onCheckedChange={setNewMatchNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Message Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive email when you get new messages
                </p>
              </div>
              <Switch
                checked={messageNotifications}
                onCheckedChange={setMessageNotifications}
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Marketing Emails</Label>
                <p className="text-sm text-muted-foreground">
                  Receive tips, product updates, and promotional content
                </p>
              </div>
              <Switch
                checked={marketingEmails}
                onCheckedChange={setMarketingEmails}
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Privacy Tab */}
      <TabsContent value="privacy" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Privacy Settings</CardTitle>
            <CardDescription>
              Control your profile visibility and privacy preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Profile Visibility</Label>
              <Select
                value={profileVisibility}
                onValueChange={setProfileVisibility}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    Public - Anyone can view your profile
                  </SelectItem>
                  <SelectItem value="connections">
                    Connections Only - Only your connections can view
                  </SelectItem>
                  <SelectItem value="private">
                    Private - Only you can view your profile
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Show Online Status</Label>
                <p className="text-sm text-muted-foreground">
                  Let others see when you're online
                </p>
              </div>
              <Switch
                checked={showOnlineStatus}
                onCheckedChange={setShowOnlineStatus}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Who Can Message You</Label>
              <Select value={allowMessages} onValueChange={setAllowMessages}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="everyone">Everyone</SelectItem>
                  <SelectItem value="connections">Connections Only</SelectItem>
                  <SelectItem value="none">No One</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data & Privacy</CardTitle>
            <CardDescription>
              Manage your data and download your information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start">
              <Globe className="mr-2 h-4 w-4" />
              Download My Data
            </Button>
            <p className="text-xs text-muted-foreground">
              Download a copy of all your data including profile information,
              messages, and activity history.
            </p>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Danger Zone Tab */}
      <TabsContent value="danger" className="space-y-6">
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible actions that affect your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="font-medium text-destructive">
                    Delete Account
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Permanently delete your account and all associated data.
                    This action cannot be undone.
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div>
                          <p>
                            This action cannot be undone. This will permanently
                            delete your account and remove all your data from
                            our servers, including:
                          </p>
                          <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground text-sm">
                            <li>Your profile and settings</li>
                            <li>All your skills and learning goals</li>
                            <li>Your connections and messages</li>
                            <li>Session history and reviews</li>
                            <li>Your wallet and transaction history</li>
                          </ul>
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Yes, delete my account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
