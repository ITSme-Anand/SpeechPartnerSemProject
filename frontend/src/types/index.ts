/** Shared TypeScript types for the Grammar Partner frontend. */

// ── Speech Analysis ──

export interface ErrorDetail {
  category: string;
  reasoning: string;
  error_part: string;
}

export interface SentenceAnalysis {
  sentence: string;
  opportunities: string[];
  errors: ErrorDetail[];
  corrected_sentence: string;
}

// ── Feedback ──

export interface FeedbackItem {
  id?: string;
  error_class: string;
  original_sentence: string;
  error_part: string;
  explanation: string;
  corrected_sentence: string;
}

// ── Narration ──

export interface NarrationSubmitResponse {
  narration_id: string;
  title: string;
  transcript: string;
  feedback: FeedbackItem[];
  summary: string;
}

export interface NarrationListItem {
  id: string;
  title: string;
  created_at: string;
}

// ── Drill ──

export interface DrillExample {
  original_sentence: string;
  reason_for_error: string;
  corrected_sentence: string;
}

export interface MCQOption {
  id: string;
  statement: string;
  reason: string;
}

export interface MCQuestion {
  question: string;
  options: MCQOption[];
  correct_option_id: string;
}

export interface DrillContent {
  concept_title: string;
  concept_explanation: string;
  examples: DrillExample[];
  questions: MCQuestion[];
  scenario_prompt: string;
}

export interface DrillStepInfo {
  id: string;
  step_type: 'concept' | 'mcq' | 'scenario';
  step_order: number;
}

export interface DrillResponse {
  drill_id: string;
  focus_error_class: string;
  content: DrillContent;
  steps: DrillStepInfo[];
}

export interface DrillSummaryResponse {
  status: 'processing' | 'completed';
  drill_id: string;
  focus_error_class: string;
  concept_title?: string;
  feedback?: FeedbackItem[];
  focus_opportunity_count?: number;
  focus_error_count?: number;
}

// ── Auth ──

export interface User {
  id: string;
  email?: string;
}
