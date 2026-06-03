'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Loader2,
  Save,
  BookOpen,
  Map as MapIcon,
  Wand2,
  Trophy,
  ListChecks,
  Clock,
  Trash2,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import type { LearningRoadmapContent } from '@/lib/roadmap';
import { RoadmapView } from './roadmap-view';

// ==================== Types ====================

interface SkillWanted {
  id: string;
  name: string;
  description: string | null;
  proficiencyTarget: string | null;
}

export interface SavedRoadmap {
  id: string;
  skillName: string;
  skillDescription: string | null;
  proficiencyTarget: string | null;
  title: string;
  summary: string | null;
  estimatedDuration: string | null;
  content: LearningRoadmapContent;
  completedSteps: string[];
  totalSteps: number;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

interface GeneratedRoadmap {
  skillName: string;
  skillDescription: string | null;
  proficiencyTarget: string | null;
  skillWantId: string | null;
  content: LearningRoadmapContent;
}

interface RoadmapContentProps {
  skillsWanted: SkillWanted[];
  initialRoadmaps: SavedRoadmap[];
}

export function RoadmapContent({
  skillsWanted,
  initialRoadmaps,
}: RoadmapContentProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState('generate');
  const [selectedSkillId, setSelectedSkillId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generated, setGenerated] = useState<GeneratedRoadmap | null>(null);

  // Inline feedback (no toasts — matches the rest of the app's Alert pattern).
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [savedError, setSavedError] = useState<string | null>(null);

  const [savedRoadmaps, setSavedRoadmaps] =
    useState<SavedRoadmap[]>(initialRoadmaps);

  const selectedSkill = skillsWanted.find((s) => s.id === selectedSkillId);

  // ==================== Generate ====================

  const handleGenerate = async () => {
    if (!selectedSkillId) {
      setGenerateError('Please select a skill you want to learn.');
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    setGenerated(null);

    try {
      const response = await fetch('/api/roadmap/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skillWantId: selectedSkillId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate roadmap');
      }

      setGenerated(data.roadmap);
    } catch (error) {
      console.error('Error generating roadmap:', error);
      setGenerateError(
        error instanceof Error
          ? error.message
          : 'Something went wrong while building your roadmap. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // ==================== Save ====================

  const handleSave = async () => {
    if (!generated) return;

    setIsSaving(true);
    setGenerateError(null);

    try {
      const response = await fetch('/api/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillName: generated.skillName,
          skillDescription: generated.skillDescription,
          proficiencyTarget: generated.proficiencyTarget,
          skillWantId: generated.skillWantId,
          content: generated.content,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save roadmap');
      }

      // Optimistically add to the saved list and switch tabs so the user
      // immediately sees the saved roadmap (success shown via UI, not a toast).
      const newSaved: SavedRoadmap = {
        id: data.id,
        skillName: generated.skillName,
        skillDescription: generated.skillDescription,
        proficiencyTarget: generated.proficiencyTarget,
        title: generated.content.title,
        summary: generated.content.summary,
        estimatedDuration: generated.content.estimatedDuration,
        content: generated.content,
        completedSteps: [],
        totalSteps: generated.content.phases.reduce(
          (sum, p) => sum + p.steps.length,
          0
        ),
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setSavedRoadmaps((prev) => [newSaved, ...prev]);
      setGenerated(null);
      setSelectedSkillId('');
      setActiveTab('saved');
      startTransition(() => router.refresh());
    } catch (error) {
      console.error('Error saving roadmap:', error);
      setGenerateError(
        error instanceof Error ? error.message : 'Failed to save roadmap'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setGenerated(null);
    setGenerateError(null);
  };

  // ==================== Saved roadmap progress ====================

  const handleToggleStep = async (
    roadmapId: string,
    stepId: string,
    completed: boolean
  ) => {
    setSavedError(null);

    // Optimistic update.
    setSavedRoadmaps((prev) =>
      prev.map((r) => {
        if (r.id !== roadmapId) return r;
        const completedSteps = completed
          ? Array.from(new Set([...r.completedSteps, stepId]))
          : r.completedSteps.filter((s) => s !== stepId);
        return {
          ...r,
          completedSteps,
          progress:
            r.totalSteps > 0
              ? Math.round((completedSteps.length / r.totalSteps) * 100)
              : 0,
        };
      })
    );

    try {
      const response = await fetch(`/api/roadmap/${roadmapId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId, completed }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update progress');
      }

      const data = await response.json();
      // Reconcile with the server's authoritative state.
      setSavedRoadmaps((prev) =>
        prev.map((r) =>
          r.id === roadmapId
            ? {
                ...r,
                completedSteps: data.completedSteps,
                progress: data.progress,
              }
            : r
        )
      );
    } catch (error) {
      console.error('Error updating progress:', error);
      setSavedError('Could not save your progress. Please try again.');
      // Revert by refreshing from server.
      startTransition(() => router.refresh());
    }
  };

  const handleDelete = async (roadmapId: string) => {
    setSavedError(null);
    const previous = savedRoadmaps;
    setSavedRoadmaps((prev) => prev.filter((r) => r.id !== roadmapId));

    try {
      const response = await fetch(`/api/roadmap/${roadmapId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete roadmap');
      }

      startTransition(() => router.refresh());
    } catch (error) {
      console.error('Error deleting roadmap:', error);
      setSavedError('Failed to delete roadmap. Please try again.');
      setSavedRoadmaps(previous);
    }
  };

  // ==================== Render ====================

  const hasSkills = skillsWanted.length > 0;

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-grid">
        <TabsTrigger value="generate" className="flex items-center gap-2">
          <Wand2 className="h-4 w-4" />
          <span>Generate</span>
        </TabsTrigger>
        <TabsTrigger value="saved" className="flex items-center gap-2">
          <MapIcon className="h-4 w-4" />
          <span>My Roadmaps</span>
          {savedRoadmaps.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {savedRoadmaps.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* ==================== Generate Tab ==================== */}
      <TabsContent value="generate" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Build your learning path
            </CardTitle>
            <CardDescription>
              Choose a skill from your learning goals. We&apos;ll craft a
              personalized, day-by-day roadmap based on your target level and
              what you already know.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {generateError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{generateError}</AlertDescription>
              </Alert>
            )}

            {!hasSkills ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium text-foreground">
                  No learning goals yet
                </p>
                <p className="text-sm mb-4">
                  Add a skill you want to learn, then come back to generate your
                  roadmap.
                </p>
                <Button variant="outline" asChild>
                  <a href="/settings">
                    <Plus className="h-4 w-4 mr-2" />
                    Add a learning goal
                  </a>
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Skill you want to learn
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Select
                      value={selectedSkillId}
                      onValueChange={(value) => {
                        setSelectedSkillId(value);
                        setGenerateError(null);
                      }}
                      disabled={isGenerating}
                    >
                      <SelectTrigger className="w-full">
                        <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="min-w-0 flex-1 truncate text-left">
                          <SelectValue placeholder="Select a skill" />
                        </span>
                      </SelectTrigger>
                      <SelectContent className="max-w-[var(--radix-select-trigger-width)]">
                        {skillsWanted.map((skill) => (
                          <SelectItem
                            key={skill.id}
                            value={skill.id}
                            className="whitespace-normal"
                          >
                            {skill.name}
                            {skill.proficiencyTarget
                              ? ` · ${skill.proficiencyTarget}`
                              : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleGenerate}
                      disabled={isGenerating || !selectedSkillId}
                      className="sm:w-auto w-full shrink-0"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Roadmap
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Selected skill context */}
                {selectedSkill && (
                  <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{selectedSkill.name}</span>
                      {selectedSkill.proficiencyTarget && (
                        <Badge variant="secondary" className="capitalize">
                          Goal: {selectedSkill.proficiencyTarget.toLowerCase()}
                        </Badge>
                      )}
                    </div>
                    {selectedSkill.description && (
                      <p className="text-muted-foreground mt-1">
                        {selectedSkill.description}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Loading skeleton while generating */}
        {isGenerating && <GeneratingState />}

        {/* Generated roadmap preview + save invitation */}
        {generated && !isGenerating && (
          <div className="space-y-4">
            {/* Save invitation banner */}
            <Card className="border-primary/40 bg-primary/5">
              <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-primary/10 p-2 mt-0.5">
                    <Save className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Save this roadmap to keep it</p>
                    <p className="text-sm text-muted-foreground">
                      Unsaved roadmaps disappear when you leave. Save it to track
                      your progress day by day, no screenshots needed.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    onClick={handleDiscard}
                    disabled={isSaving}
                  >
                    Discard
                  </Button>
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Save Roadmap
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <RoadmapView
              content={generated.content}
              skillName={generated.skillName}
              proficiencyTarget={generated.proficiencyTarget}
            />
          </div>
        )}
      </TabsContent>

      {/* ==================== Saved Tab ==================== */}
      <TabsContent value="saved" className="space-y-6">
        {savedError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{savedError}</AlertDescription>
          </Alert>
        )}

        {savedRoadmaps.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12 text-muted-foreground">
              <MapIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium text-foreground">No saved roadmaps yet</p>
              <p className="text-sm mb-4">
                Generate a roadmap and save it to start tracking your learning
                journey.
              </p>
              <Button variant="outline" onClick={() => setActiveTab('generate')}>
                <Wand2 className="h-4 w-4 mr-2" />
                Generate your first roadmap
              </Button>
            </CardContent>
          </Card>
        ) : (
          savedRoadmaps.map((roadmap) => (
            <SavedRoadmapCard
              key={roadmap.id}
              roadmap={roadmap}
              onToggleStep={handleToggleStep}
              onDelete={handleDelete}
            />
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}

// ==================== Generating skeleton ====================

function GeneratingState() {
  return (
    <Card>
      <CardContent className="py-10">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative rounded-full bg-primary/10 p-4">
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            </div>
          </div>
          <p className="font-medium">Designing your personalized roadmap…</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            We&apos;re tailoring each step to your target level and the skills you
            already have. This usually takes a few seconds.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== Saved roadmap card ====================

function SavedRoadmapCard({
  roadmap,
  onToggleStep,
  onDelete,
}: {
  roadmap: SavedRoadmap;
  onToggleStep: (
    roadmapId: string,
    stepId: string,
    completed: boolean
  ) => void;
  onDelete: (roadmapId: string) => void;
}) {
  const completedSet = new Set(roadmap.completedSteps);
  const isComplete = roadmap.progress >= 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle>{roadmap.title}</CardTitle>
              {isComplete && (
                <Badge className="bg-green-600 hover:bg-green-600 text-white">
                  <Trophy className="h-3 w-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
            <CardDescription className="flex items-center gap-3 flex-wrap">
              <span className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" />
                {roadmap.skillName}
              </span>
              {roadmap.proficiencyTarget && (
                <span className="capitalize">
                  Goal: {roadmap.proficiencyTarget.toLowerCase()}
                </span>
              )}
              {roadmap.estimatedDuration ? (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {roadmap.estimatedDuration}
                </span>
              ) : null}
            </CardDescription>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="text-destructive shrink-0">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Roadmap</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{roadmap.title}&quot;?
                  Your progress will be lost. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(roadmap.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Progress bar */}
        <div className="pt-2 space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1">
              <ListChecks className="h-3.5 w-3.5" />
              {roadmap.completedSteps.length}/{roadmap.totalSteps} steps done
            </span>
            <span className="font-medium">{roadmap.progress}%</span>
          </div>
          <Progress value={roadmap.progress} />
        </div>
      </CardHeader>
      <CardContent>
        <RoadmapView
          content={roadmap.content}
          skillName={roadmap.skillName}
          proficiencyTarget={roadmap.proficiencyTarget}
          interactive
          completedSteps={completedSet}
          onToggleStep={(stepId, completed) =>
            onToggleStep(roadmap.id, stepId, completed)
          }
        />
      </CardContent>
    </Card>
  );
}
