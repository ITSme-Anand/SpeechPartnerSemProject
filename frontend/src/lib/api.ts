/**
 * Typed API client for communicating with the Grammar Partner backend.
 * 
 * Automatically attaches the Supabase JWT token to every request.
 */

import axios, { type AxiosInstance } from 'axios';
import { supabase } from './supabaseClient';
import type {
  NarrationSubmitResponse,
  NarrationListItem,
  DrillResponse,
  DrillSummaryResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/** Create an Axios instance with auth interceptor. */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 120000, // 2 min timeout for LLM calls
  });

  // Attach JWT token to every request
  client.interceptors.request.use(async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  });

  return client;
};

const api = createApiClient();

// ── Narrations ──

/** Submit an audio recording for speech analysis. */
export async function submitNarration(
  audio: Blob,
  title: string,
  isDrill: boolean = false,
  drillId?: string,
): Promise<NarrationSubmitResponse> {
  const formData = new FormData();
  formData.append('audio', audio, 'recording.webm');
  formData.append('title', title);
  formData.append('is_drill', String(isDrill));
  if (drillId) {
    formData.append('drill_id', drillId);
  }

  const response = await api.post<NarrationSubmitResponse>('/narrations/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
}

/** Get all past narrations for the current user. */
export async function getNarrations(): Promise<NarrationListItem[]> {
  const response = await api.get<NarrationListItem[]>('/narrations/');
  return response.data;
}

/** Download feedback as a PDF file. */
export async function downloadFeedbackPdf(narrationId: string): Promise<void> {
  const response = await api.get(`/narrations/${narrationId}/feedback/pdf`, {
    responseType: 'blob',
  });

  // Create a download link and trigger it
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `feedback_${narrationId.slice(0, 8)}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// ── Drills ──

/** Start or resume a drill session for a narration. */
export async function startDrill(narrationId: string): Promise<DrillResponse> {
  const response = await api.post<DrillResponse>('/drills', {
    narration_id: narrationId,
  });
  return response.data;
}

/** Submit the user's MCQ answer for a drill step. */
export async function submitMCQAnswer(
  stepId: string,
  selectedOptionId: string,
): Promise<void> {
  await api.patch(`/drill-steps/${stepId}`, {
    user_response: { selected_option_id: selectedOptionId },
  });
}

/** Get the summary of a completed drill session. */
export async function getDrillSummary(drillId: string): Promise<DrillSummaryResponse> {
  const response = await api.get<DrillSummaryResponse>(`/drills/${drillId}/summary`);
  return response.data;
}

export default api;
