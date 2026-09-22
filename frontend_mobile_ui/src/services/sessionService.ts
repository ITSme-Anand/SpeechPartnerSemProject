import { api } from "@/lib/api";
import { env } from "@/lib/env";
import * as fixtures from "@/services/fixtures/data";
import type {
  DrillStep,
  HomeSummary,
  Scenario,
  SessionFeedback,
  SessionReport,
} from "@/types";

/**
 * Thin service layer the screens call into. Each function either hits the
 * real FastAPI backend (see the tech-stack doc's REST endpoints) or, in
 * mock mode, returns local fixture data. Screens never branch on
 * env.useMockData themselves — that decision lives here, in one place.
 *
 * The FastAPI routes below are the ones implied by the design + tech-stack
 * doc; adjust the paths to match the backend's actual OpenAPI schema once
 * it is deployed.
 */

export async function fetchScenarioWheel(): Promise<Scenario[]> {
  if (env.useMockData) return fixtures.scenarioWheel;
  const { data } = await api.get<Scenario[]>("/scenarios");
  return data;
}

export async function fetchHomeSummary(
  displayName: string,
): Promise<HomeSummary> {
  if (env.useMockData) return fixtures.getHomeSummary(displayName);
  const { data } = await api.get<HomeSummary>("/home/summary");
  return data;
}

export async function submitSessionAudio(_params: {
  scenarioId: string;
  durationSeconds: number;
  audioUri: string;
}): Promise<{ sessionId: string }> {
  if (env.useMockData) return { sessionId: "mock-session" };

  const form = new FormData();
  form.append("scenario_id", _params.scenarioId);
  form.append("duration_seconds", String(_params.durationSeconds));
  // React Native's FormData accepts this file-shaped object even though it
  // doesn't match the DOM File type; cast narrowly instead of using `any`.
  form.append("audio", {
    uri: _params.audioUri,
    name: "session.m4a",
    type: "audio/m4a",
  } as unknown as Blob);

  const { data } = await api.post<{ sessionId: string }>("/sessions", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function fetchSessionFeedback(
  sessionId: string,
  scenarioLabel: string,
): Promise<SessionFeedback> {
  if (env.useMockData) return fixtures.getSessionFeedback(scenarioLabel);
  const { data } = await api.get<SessionFeedback>(
    `/sessions/${sessionId}/feedback`,
  );
  return data;
}

export async function fetchDrillStep(sessionId: string): Promise<DrillStep> {
  if (env.useMockData) return fixtures.getDrillStep();
  const { data } = await api.get<DrillStep>(`/sessions/${sessionId}/drill`);
  return data;
}

export async function fetchSessionReport(
  sessionId: string,
  scenarioLabel: string,
  durationMinutes: number,
): Promise<SessionReport> {
  if (env.useMockData)
    return fixtures.getSessionReport(scenarioLabel, durationMinutes);
  const { data } = await api.get<SessionReport>(
    `/sessions/${sessionId}/report`,
  );
  return data;
}
