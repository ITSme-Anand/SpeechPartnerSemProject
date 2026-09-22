import type { SessionDuration } from "@/types";

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Home: undefined;
  ChoosePractice: undefined;
  Duration: { scenarioId: string; scenarioLabel: string; prompt: string };
  Session: {
    scenarioId: string;
    scenarioLabel: string;
    prompt: string;
    duration: SessionDuration;
  };
  Processing: {
    scenarioId: string;
    scenarioLabel: string;
    durationSeconds: number;
    audioUri: string;
  };
  Feedback: { sessionId: string; scenarioLabel: string };
  Drill: { sessionId: string };
  Report: { sessionId: string; scenarioLabel: string; durationMinutes: number };
  Settings: undefined;
};
