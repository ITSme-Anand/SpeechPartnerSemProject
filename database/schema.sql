-- ============================================================
-- Grammar Partner (Mark 1) — Database Schema
-- Run this in your Supabase SQL Editor to create all tables
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────
-- Users
-- ──────────────────────────────────────────────
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id TEXT UNIQUE NOT NULL,
    username TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_auth_id ON users(auth_id);

-- ──────────────────────────────────────────────
-- Narrations
-- ──────────────────────────────────────────────
CREATE TABLE narrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_drill_response BOOLEAN NOT NULL DEFAULT FALSE,
    transcript TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_narrations_user_id ON narrations(user_id);
CREATE INDEX idx_narrations_user_drill ON narrations(user_id, is_drill_response);

-- ──────────────────────────────────────────────
-- Feedback (per-error rows from speech analysis)
-- ──────────────────────────────────────────────
CREATE TABLE feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    narration_id UUID NOT NULL REFERENCES narrations(id) ON DELETE CASCADE,
    error_class TEXT NOT NULL,
    original_sentence TEXT NOT NULL,
    error_part TEXT NOT NULL,
    explanation TEXT NOT NULL,
    corrected_sentence TEXT NOT NULL
);

CREATE INDEX idx_feedback_narration_id ON feedback(narration_id);
CREATE INDEX idx_feedback_error_class ON feedback(error_class);

-- ──────────────────────────────────────────────
-- User Error Profile (EMA scores per category)
-- ──────────────────────────────────────────────
CREATE TABLE user_error_profile (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    error_class TEXT NOT NULL,
    ema_score DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    opportunity_count_total INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, error_class)
);

-- ──────────────────────────────────────────────
-- Step type enum for drill steps
-- ──────────────────────────────────────────────
CREATE TYPE step_type_enum AS ENUM ('concept', 'mcq', 'scenario');

-- ──────────────────────────────────────────────
-- Drills (one per narration)
-- ──────────────────────────────────────────────
CREATE TABLE drills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    narration_id UUID NOT NULL REFERENCES narrations(id) ON DELETE CASCADE,
    focus_error_class TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    ai_response JSONB,
    UNIQUE(narration_id)
);

CREATE INDEX idx_drills_user_id ON drills(user_id);
CREATE INDEX idx_drills_narration_id ON drills(narration_id);

-- ──────────────────────────────────────────────
-- Drill Steps (concept, mcq, scenario per drill)
-- ──────────────────────────────────────────────
CREATE TABLE drill_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    drill_session_id UUID NOT NULL REFERENCES drills(id) ON DELETE CASCADE,
    step_type step_type_enum NOT NULL,
    step_order INTEGER NOT NULL,
    ai_content JSONB,
    user_response JSONB,
    transcript_id UUID REFERENCES narrations(id),
    focus_opportunity_count INTEGER,
    focus_error_count INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(drill_session_id, step_order)
);

CREATE INDEX idx_drill_steps_session_id ON drill_steps(drill_session_id);

-- ──────────────────────────────────────────────
-- Row Level Security (backend uses service role key, bypasses RLS)
-- Enable RLS on all tables for defense-in-depth
-- ──────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE narrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_error_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE drills ENABLE ROW LEVEL SECURITY;
ALTER TABLE drill_steps ENABLE ROW LEVEL SECURITY;

-- Service role key bypasses RLS, so no policies needed for backend access.
-- If you ever add direct client access, add policies here.
