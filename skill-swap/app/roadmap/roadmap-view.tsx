'use client';

/**
 * RoadmapView
 *
 * Presentational component that renders a structured learning roadmap.
 * Used both for the freshly generated preview (read-only) and for saved
 * roadmaps (interactive, with checkable steps for day-by-day progress).
 */
import {
  Lightbulb,
  Trophy,
  CheckCircle2,
  ClipboardList,
  Clock,
  Circle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { LearningRoadmapContent } from '@/lib/roadmap';

interface RoadmapViewProps {
  content: LearningRoadmapContent;
  skillName: string;
  proficiencyTarget?: string | null;
  /** When true, steps render checkboxes and call onToggleStep. */
  interactive?: boolean;
  completedSteps?: Set<string>;
  onToggleStep?: (stepId: string, completed: boolean) => void;
}

export function RoadmapView({
  content,
  proficiencyTarget,
  interactive = false,
  completedSteps,
  onToggleStep,
}: RoadmapViewProps) {
  const completed = completedSteps ?? new Set<string>();

  return (
    <div className="space-y-6">
      {/* Summary (only shown in read-only preview; saved card shows its own header) */}
      {!interactive && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            {proficiencyTarget && (
              <Badge variant="secondary" className="capitalize">
                Target: {proficiencyTarget.toLowerCase()}
              </Badge>
            )}
            {content.estimatedDuration ? (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {content.estimatedDuration}
              </Badge>
            ) : null}
          </div>
          {content.summary && (
            <p className="text-muted-foreground">{content.summary}</p>
          )}
        </div>
      )}

      {/* Prerequisites */}
      {content.prerequisites.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-2 mb-2 text-sm font-medium">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            Before you start
          </div>
          <ul className="space-y-1">
            {content.prerequisites.map((pre, idx) => (
              <li
                key={idx}
                className="text-sm text-muted-foreground flex items-start gap-2"
              >
                <Circle className="h-1.5 w-1.5 mt-1.5 shrink-0 fill-current" />
                {pre}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Phases timeline */}
      <div className="space-y-5">
        {content.phases.map((phase, phaseIdx) => {
          const phaseSteps = phase.steps.length;
          const phaseDone = phase.steps.filter((s) =>
            completed.has(s.id)
          ).length;
          const phaseComplete = interactive && phaseDone === phaseSteps;

          return (
            <div key={phase.id} className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold',
                    phaseComplete
                      ? 'border-green-600 bg-green-600 text-white'
                      : 'border-primary bg-primary/10 text-primary'
                  )}
                >
                  {phaseComplete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    phaseIdx + 1
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold leading-tight">
                      {phase.title}
                    </h3>
                    <Badge variant="outline" className="text-xs font-normal">
                      {phase.durationLabel}
                    </Badge>
                    {interactive && (
                      <span className="text-xs text-muted-foreground">
                        {phaseDone}/{phaseSteps}
                      </span>
                    )}
                  </div>
                  {phase.goal && (
                    <p className="text-sm text-muted-foreground">
                      {phase.goal}
                    </p>
                  )}
                </div>
              </div>

              {/* Steps */}
              <div className="ml-4 border-l-2 border-dashed border-border pl-6 space-y-3">
                {phase.steps.map((step) => {
                  const isDone = completed.has(step.id);
                  return (
                    <div
                      key={step.id}
                      className={cn(
                        'rounded-lg border p-3 transition-colors',
                        isDone ? 'bg-muted/40 border-green-600/30' : 'bg-card'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {interactive && (
                          <Checkbox
                            checked={isDone}
                            onCheckedChange={(checked) =>
                              onToggleStep?.(step.id, checked === true)
                            }
                            className="mt-0.5"
                            aria-label={`Mark "${step.title}" as ${
                              isDone ? 'incomplete' : 'complete'
                            }`}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 justify-between">
                            <h4
                              className={cn(
                                'font-medium text-sm',
                                isDone &&
                                  'line-through text-muted-foreground'
                              )}
                            >
                              {step.title}
                            </h4>
                            {step.estimatedTime && (
                              <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {step.estimatedTime}
                              </span>
                            )}
                          </div>
                          {step.description && (
                            <p
                              className={cn(
                                'text-sm text-muted-foreground mt-1',
                                isDone && 'line-through'
                              )}
                            >
                              {step.description}
                            </p>
                          )}
                          {step.resources.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {step.resources.map((res, idx) => (
                                <Badge
                                  key={idx}
                                  variant="secondary"
                                  className="text-xs py-0 font-normal"
                                >
                                  {res}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Milestones */}
      {content.milestones.length > 0 && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-2 text-sm font-medium">
            <Trophy className="h-4 w-4 text-primary" />
            Milestones to aim for
          </div>
          <ul className="space-y-1.5">
            {content.milestones.map((milestone, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                {milestone}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tips */}
      {content.tips.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="flex items-center gap-2 mb-2 text-sm font-medium">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Practical tips
          </div>
          <ul className="space-y-1.5">
            {content.tips.map((tip, idx) => (
              <li
                key={idx}
                className="text-sm text-muted-foreground flex items-start gap-2"
              >
                <Lightbulb className="h-3.5 w-3.5 text-amber-500/70 mt-0.5 shrink-0" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
