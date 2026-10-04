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

// ── Delivery Analysis (new) ──

export interface DeliveryBaselines {
  global_pace_syll_per_sec: number | null;
  global_pitch_hz: number | null;
  global_loudness_db: number | null;
}

export interface DeliveryPattern {
  type: string;
  start_index: number;
  end_index: number;
  start_time: number;
  end_time: number;
}

export interface DeliverySentenceEvent {
  index: number;
  text: string;
  start: number;
  end: number;
  pause_before_s: number | null;
  pause_after_s: number | null;
  pace_syll_per_sec: number;
  pace_label_vs_prev: string;
  pace_label_vs_next: string;
  pace_label_vs_global: string;
  pace_label_vs_rolling: string;
  pitch_semitone_vs_speaker_median: number | null;
  pitch_range_semitones: number | null;
  pitch_label_vs_prev: string;
  pitch_label_vs_next: string;
  loudness_db_vs_global: number | null;
  loudness_label_vs_prev: string;
  loudness_label_vs_next: string;
  loudness_label_vs_rolling: string;
}

export interface DeliveryAnalysisResult {
  baselines: DeliveryBaselines;
  sentence_events: DeliverySentenceEvent[];
  patterns: DeliveryPattern[];
  delivery_feedback: string;
}

// ── Pause & Filler Events (new) ──

export interface PauseEvent {
  start: number;
  end: number;
  duration: number;
  type: string; // "natural" | "hesitation" | "lost_train_of_thought"
}

export interface FillerEvent {
  start: number;
  end: number;
  type: string; // "uh" | "um"
  confidence: number;
  source: string;
}

// ── Narration ──

export interface NarrationSubmitResponse {
  narration_id: string;
  title: string;
  transcript: string;
  feedback: FeedbackItem[];
  summary: string;
  // New delivery analysis fields
  delivery?: DeliveryAnalysisResult | null;
  pause_events?: PauseEvent[] | null;
  filler_events?: FillerEvent[] | null;
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
