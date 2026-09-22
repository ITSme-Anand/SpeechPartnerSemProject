import { colors } from "@/theme/tokens";
import type {
  DrillStep,
  HomeSummary,
  Scenario,
  SessionFeedback,
  SessionReport,
} from "@/types";

/** Local fixture data used when EXPO_PUBLIC_USE_MOCK_DATA=true, so the UI
 * is fully click-through-able without the FastAPI backend running. Shapes
 * mirror what the real endpoints are expected to return. */

export const scenarioWheel: Scenario[] = [
  {
    id: "coffee-shop",
    label: "Coffee Shop",
    prompt: "Tell me about your usual coffee order.",
  },
  {
    id: "job-interview",
    label: "Job Interview",
    prompt: "Walk me through why you want this role.",
  },
  {
    id: "catching-up",
    label: "Catching Up",
    prompt: "Tell an old friend what's new with you.",
  },
  {
    id: "doctors-visit",
    label: "Doctor's Visit",
    prompt: "Describe the symptoms you are having.",
  },
  {
    id: "directions",
    label: "Directions",
    prompt: "Explain how to get to your favorite park.",
  },
  {
    id: "small-talk",
    label: "Small Talk",
    prompt: "Make small talk while waiting for an elevator.",
  },
  {
    id: "faulty-item",
    label: "Faulty Item",
    prompt: "Explain to a store clerk what is wrong with an item.",
  },
  {
    id: "first-date",
    label: "First Date",
    prompt: "Tell your date about your favorite hobby.",
  },
  {
    id: "apartment-hunt",
    label: "Apartment Hunt",
    prompt: "Describe what you are looking for in an apartment.",
  },
  {
    id: "a-recipe",
    label: "A Recipe",
    prompt: "Explain how to make your favorite dish.",
  },
];

export const topicSparks = [
  "ordering bubble tea",
  "asking for a raise",
  "explaining a movie",
  "a rainy commute",
  "my weekend plans",
];

export function getHomeSummary(displayName: string): HomeSummary {
  return {
    displayName,
    streakDays: [true, true, true, true, false, false, false],
    lastSessionScore: 81,
    lastSessionScenario: "The Coffee Shop",
    bloomsThisMonth: 3,
    garden: [
      { id: "g1", label: "Coffee", color: colors.sage },
      { id: "g2", label: "Interview", color: colors.purple },
      { id: "g3", label: "Directions", color: colors.mimosa },
    ],
    upNext: { title: "Ordering coffee" },
  };
}

export function getSessionFeedback(scenarioLabel: string): SessionFeedback {
  return {
    scenarioLabel,
    headline: "You're finding your rhythm.",
    cleanSentenceCount: 9,
    totalSentenceCount: 12,
    overallScore: 84,
    notes: [
      {
        id: "n1",
        kind: "praise",
        original: "The coffee here always smells incredible.",
        note: "Nice use of descriptive vocabulary",
      },
      {
        id: "n2",
        kind: "correction",
        original: "I go to the market yesterday.",
        note: "Past tense needed",
        suggestion: "I went to the market yesterday.",
      },
    ],
    strengths: ["Clear storytelling", "Stayed on topic"],
  };
}

export function getDrillStep(): DrillStep {
  return {
    concept: "Irregular past tense",
    explanation: 'Some verbs don’t just add "-ed" — they change completely.',
    examples: ["go → went", "eat → ate", "see → saw"],
    prompt: '"Yesterday, I ___ to the market."',
    choices: [
      { id: "c1", text: "goed", correct: false, hint: "not quite" },
      { id: "c2", text: "go", correct: false },
      { id: "c3", text: "went", correct: true },
      { id: "c4", text: "going", correct: false },
    ],
    triesRemaining: 2,
    stepIndex: 1,
    totalSteps: 4,
  };
}

export function getSessionReport(
  scenarioLabel: string,
  durationMinutes: number,
): SessionReport {
  return {
    scenarioLabel,
    durationMinutes,
    grammarAccuracy: 84,
    vocabularyRange: 72,
    speakingPace: 91,
    newBadge: {
      title: "First Full Bloom",
      detail: "5 sessions completed this week",
    },
    garden: [
      { id: "g1", label: "Coffee", color: colors.purple },
      { id: "g2", label: "Interview", color: colors.sageDeep },
      { id: "g3", label: "Directions", color: colors.purpleDeep },
    ],
  };
}
