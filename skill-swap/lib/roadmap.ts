import { createChatCompletion, LLMError } from '@/lib/llm';

export type ProficiencyTarget =
  | 'Beginner'
  | 'Intermediate'
  | 'Advanced'
  | 'Expert';

/** A single actionable learning step within a phase. */
export interface RoadmapStep {
  id: string; // stable id, e.g. "p1-s2" — used for progress tracking
  title: string;
  description: string;
  // Free-form, realistic effort estimate in natural language so the unit fits
  // the actual task, e.g. "20 minutes", "1 hour", "2 days".
  estimatedTime: string;
  resources: string[]; // resource *types*, e.g. "Official docs", "Hands-on project"
}

/** A phase groups related steps (e.g. "Fundamentals", "Building projects"). */
export interface RoadmapPhase {
  id: string; // e.g. "p1"
  title: string;
  goal: string; // what the learner can do after this phase
  // Free-form time label that uses whatever unit fits the skill's scope,
  // e.g. "First hour", "Day 1", "Week 1-2".
  durationLabel: string;
  steps: RoadmapStep[];
}

/** The structured plan persisted in LearningRoadmap.content. */
export interface LearningRoadmapContent {
  title: string;
  summary: string;
  // Realistic total for the whole plan in natural language so a quick skill
  // reads "about 3 hours" and a deep one reads "3 months at 5 hrs/week".
  estimatedDuration: string;
  prerequisites: string[];
  phases: RoadmapPhase[];
  milestones: string[]; // checkpoints to prove progress
  tips: string[]; // practical, industry-style advice
}

export interface GenerateRoadmapInput {
  skillName: string;
  skillDescription?: string | null;
  proficiencyTarget?: string | null;
  /** Optional: the user's display name for a personal touch. */
  learnerName?: string | null;
  /** Optional: skills the user already teaches, to avoid repeating basics. */
  knownSkills?: string[];
}

/**
 * System prompt for the mentor persona.
 */
const SYSTEM_PROMPT = `You are SkillSwap's expert learning mentor — a practical master who gives realistic, personalized plans the learner can actually follow.

Output rules (strict):
- Respond with ONE valid JSON object only. No markdown, no code fences, no text before or after.
- Use this exact shape and key names:
{
  "title": string,
  "summary": string,
  "estimatedDuration": string,
  "prerequisites": string[],
  "phases": [
    {
      "id": string,
      "title": string,
      "goal": string,
      "durationLabel": string,
      "steps": [
        { "id": string, "title": string, "description": string, "estimatedTime": string, "resources": string[] }
      ]
    }
  ],
  "milestones": string[],
  "tips": string[]
}

SCOPE FIRST — this is the most important rule:
- Before planning, silently judge how big this skill actually is and how long a real person needs to reach the target level. Be honest and realistic.
- Match the plan size and time units to that scope. Do NOT pad a small skill into weeks, and do NOT compress a deep skill into a few hours.
  - A small/quick skill (e.g. a single recipe, one tool, a basic technique) may take minutes, hours, or a few days, with 1-3 phases and a few short steps.
  - A medium skill may take days or a few weeks.
  - A large/deep discipline may take months of steady practice.
- Express time in whatever unit fits naturally: "estimatedDuration", "durationLabel", and "estimatedTime" are free-form strings like "about 2 hours", "1 day", "Day 1-2", "20 minutes", "Week 1-3", "around 3 months at 5 hrs/week". Always include a unit. Never inflate.

Content rules:
- Tailor depth to the target proficiency. Beginner = foundations first; Advanced/Expert = skip basics, focus on depth, nuance, and real-world practice.
- Use 1 to 5 phases depending on scope (fewer for small skills). Each phase has 1 to 5 concrete steps. Order from foundational to advanced.
- Phase ids are "p1","p2",... Step ids are "p1-s1","p1-s2",... and MUST be unique.
- Each step is a single, doable action with a realistic "estimatedTime".
- "resources" lists resource TYPES or categories (e.g. "Hands-on practice","Official documentation","Watch a demonstration","Practice exercises"). Do NOT invent URLs, book titles, brand names, or course names.
- "milestones" are concrete, provable checkpoints tied to doing the skill (e.g. "Cook the full dish unassisted and taste-test it", "Build and deploy a small working project"). Each milestone should feel achievable within the plan's timeframe.
- "tips" are practical habits a real practitioner would give for this specific skill.
- Be specific and actionable. No fluff, no marketing language, no emojis, no disclaimers about being an AI.
- Write in clear, encouraging, plain English.`;

/** Builds the user message from the learner's goal. */
function buildUserPrompt(input: GenerateRoadmapInput): string {
  const lines: string[] = [];
  lines.push(`Skill to learn: ${input.skillName}`);
  if (input.proficiencyTarget) {
    lines.push(`Target proficiency: ${input.proficiencyTarget}`);
  } else {
    lines.push('Target proficiency: not specified (assume motivated beginner)');
  }
  if (input.skillDescription?.trim()) {
    lines.push(`Learner's specific goal: ${input.skillDescription.trim()}`);
  }
  if (input.learnerName?.trim()) {
    lines.push(`Learner's name: ${input.learnerName.trim()}`);
  }
  if (input.knownSkills && input.knownSkills.length > 0) {
    lines.push(
      `Skills the learner already knows (avoid re-teaching these basics): ${input.knownSkills
        .slice(0, 10)
        .join(', ')}`
    );
  }
  lines.push(
    'First judge how big this skill realistically is, then create the most useful, realistically-timed personalized roadmap for this learner. Do not inflate the timeline. Return JSON only.'
  );
  return lines.join('\n');
}

const VALID_PROFICIENCY: ProficiencyTarget[] = [
  'Beginner',
  'Intermediate',
  'Advanced',
  'Expert',
];

export function normalizeProficiency(
  value?: string | null
): ProficiencyTarget | null {
  if (!value) return null;
  const match = VALID_PROFICIENCY.find(
    (p) => p.toLowerCase() === value.toLowerCase()
  );
  return match ?? null;
}

/** Coerces an unknown value to a trimmed string, capped to a max length. */
function toStr(value: unknown, max = 500): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

/** Coerces an unknown value to an array of clean strings. */
function toStrArray(value: unknown, maxItems = 12, maxLen = 200): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => toStr(v, maxLen))
    .filter((v) => v.length > 0)
    .slice(0, maxItems);
}

/**
 * Extracts the first JSON object from a model response, even if the model
 * wrapped it in prose or code fences despite instructions.
 */
function extractJsonObject(raw: string): string {
  let text = raw.trim();
  // Strip code fences if present.
  text = text.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new LLMError('The learning assistant returned an unreadable plan.', 502);
  }
  return text.slice(start, end + 1);
}

/**
 * Validates and sanitizes the parsed model output into a safe, well-formed
 * LearningRoadmapContent. Regenerates ids so progress tracking is reliable and
 * drops any malformed entries instead of surfacing them to the UI.
 */
function sanitizeRoadmap(
  parsed: unknown,
  fallbackTitle: string
): LearningRoadmapContent {
  const obj = (parsed ?? {}) as Record<string, unknown>;

  const rawPhases = Array.isArray(obj.phases) ? obj.phases : [];
  const phases: RoadmapPhase[] = rawPhases
    .slice(0, 6)
    .map((rawPhase, phaseIdx) => {
      const p = (rawPhase ?? {}) as Record<string, unknown>;
      const phaseId = `p${phaseIdx + 1}`;
      const rawSteps = Array.isArray(p.steps) ? p.steps : [];

      const steps: RoadmapStep[] = rawSteps
        .slice(0, 6)
        .map((rawStep, stepIdx) => {
          const s = (rawStep ?? {}) as Record<string, unknown>;
          return {
            id: `${phaseId}-s${stepIdx + 1}`,
            title: toStr(s.title, 160) || `Step ${stepIdx + 1}`,
            description: toStr(s.description, 600),
            estimatedTime: toStr(s.estimatedTime, 40),
            resources: toStrArray(s.resources, 6, 120),
          };
        })
        .filter((s) => s.title.length > 0);

      return {
        id: phaseId,
        title: toStr(p.title, 160) || `Phase ${phaseIdx + 1}`,
        goal: toStr(p.goal, 300),
        durationLabel: toStr(p.durationLabel, 60),
        steps,
      };
    })
    .filter((p) => p.steps.length > 0);

  if (phases.length === 0) {
    throw new LLMError(
      'The learning assistant could not build a complete plan. Please try again.',
      502
    );
  }

  return {
    title: toStr(obj.title, 160) || fallbackTitle,
    summary: toStr(obj.summary, 600),
    estimatedDuration: toStr(obj.estimatedDuration, 60),
    prerequisites: toStrArray(obj.prerequisites, 8, 160),
    phases,
    milestones: toStrArray(obj.milestones, 8, 200),
    tips: toStrArray(obj.tips, 8, 200),
  };
}

/** Total number of steps across all phases. */
export function countSteps(content: LearningRoadmapContent): number {
  return content.phases.reduce((sum, phase) => sum + phase.steps.length, 0);
}

/** Computes completion percentage (0-100) from completed step ids. */
export function computeProgress(
  content: LearningRoadmapContent,
  completedSteps: string[]
): number {
  const total = countSteps(content);
  if (total === 0) return 0;
  const validIds = new Set<string>();
  content.phases.forEach((phase) =>
    phase.steps.forEach((step) => validIds.add(step.id))
  );
  const done = completedSteps.filter((id) => validIds.has(id)).length;
  return Math.round((done / total) * 100);
}

/**
 * Generates a personalized roadmap. Returns validated content ready to render
 * or persist. Throws LLMError on provider/validation failure.
 */
export async function generateRoadmap(
  input: GenerateRoadmapInput
): Promise<LearningRoadmapContent> {
  const raw = await createChatCompletion({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(input) },
    ],
    temperature: 0.4,
    maxTokens: 2400,
    jsonMode: true,
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(raw));
  } catch {
    throw new LLMError('The learning assistant returned an invalid plan.', 502);
  }

  return sanitizeRoadmap(parsed, `Learning Path: ${input.skillName}`);
}
