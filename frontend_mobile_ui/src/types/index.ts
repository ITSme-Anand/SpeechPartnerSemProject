export type SessionDuration = "quick" | "standard" | "deep";

export interface Scenario {
  id: string;
  label: string;
  prompt: string;
}

export interface GardenBloom {
  id: string;
  label: string;
  color: string;
}

export interface HomeSummary {
  displayName: string;
  streakDays: boolean[]; // Mon..Sun, true = practiced
  lastSessionScore: number;
  lastSessionScenario: string;
  bloomsThisMonth: number;
  garden: GardenBloom[];
  upNext: { title: string };
}

export interface CorrectionNote {
  id: string;
  kind: "praise" | "correction";
  original: string;
  note: string;
  suggestion?: string;
}

export interface SessionFeedback {
  scenarioLabel: string;
  headline: string;
  cleanSentenceCount: number;
  totalSentenceCount: number;
  overallScore: number;
  notes: CorrectionNote[];
  strengths: string[];
}

export interface DrillChoice {
  id: string;
  text: string;
  correct: boolean;
  hint?: string;
}

export interface DrillStep {
  concept: string;
  explanation: string;
  examples: string[];
  prompt: string;
  choices: DrillChoice[];
  triesRemaining: number;
  stepIndex: number;
  totalSteps: number;
}

export interface SessionReport {
  scenarioLabel: string;
  durationMinutes: number;
  grammarAccuracy: number;
  vocabularyRange: number;
  speakingPace: number;
  newBadge?: { title: string; detail: string };
  garden: GardenBloom[];
}

export interface AuthCredentials {
  email: string;
  password: string;
}
