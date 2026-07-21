/**
 * Drill Scenario page — Stage 3: speak freely on a scenario prompt.
 * Records audio and submits as a drill narration.
 */

import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { submitNarration } from '../lib/api';
import ProcessingScreen from '../components/ProcessingScreen';
import type { DrillResponse } from '../types';
import { MessageSquare, Clock, AlertCircle, ArrowRight, AlertTriangle } from 'lucide-react';

export default function DrillScenarioPage() {
  const { drillId } = useParams<{ drillId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const drill = location.state as DrillResponse | undefined;
  const { isRecording, audioBlob, duration, startRecording, stopRecording, resetRecording, error: recorderError } = useAudioRecorder(120);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (!drill || !drillId) {
    return (
      <div className="page page-centered">
        <div className="glass-card" style={{ textAlign: 'center', maxWidth: '400px' }}>
          <AlertTriangle size={40} className="text-error" style={{ marginBottom: 'var(--space-md)' }} />
          <h2>Drill Not Found</h2>
          <button className="btn btn-primary mt-lg" onClick={() => navigate('/')}>Go to Narrate</button>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!audioBlob) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      await submitNarration(
        audioBlob,
        `Drill Scenario: ${drill.content.concept_title}`,
        true,
        drillId,
      );
      navigate(`/drill/${drillId}/summary`, { state: { drill_id: drillId, focus_error_class: drill.focus_error_class } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit. Please try again.';
      setSubmitError(message);
      setIsSubmitting(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (isSubmitting) {
    return (
      <ProcessingScreen
        message="Analyzing your drill response..."
        subMessage="Checking for improvements in your focus area"
      />
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className="animate-slide-up">
          {/* Step Indicator */}
          <div className="step-indicator">
            <div className="step-dot step-dot--completed">✓</div>
            <div className="step-line step-line--completed" />
            <div className="step-dot step-dot--completed">✓</div>
            <div className="step-line step-line--completed" />
            <div className="step-dot step-dot--active">3</div>
          </div>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(245, 158, 11, 0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--space-md)',
            }}>
              <MessageSquare size={24} style={{ color: 'var(--color-warning)' }} />
            </div>
            <h2>Apply What You Learned</h2>
            <p className="text-sm text-muted mt-sm">
              Speak freely for 1-2 minutes on the prompt below
            </p>
          </div>

          {/* Scenario Prompt */}
          <div className="glass-card glass-card--elevated" style={{ marginBottom: 'var(--space-xl)' }}>
            <span className="badge badge--accent" style={{ marginBottom: 'var(--space-md)', display: 'inline-block' }}>
              Scenario Prompt
            </span>
            <p style={{
              fontSize: '1.1rem',
              lineHeight: 1.8,
              color: 'var(--color-text-primary)',
              fontWeight: 500,
            }}>
              {drill.content.scenario_prompt}
            </p>
          </div>

          {/* Recording Section */}
          <div className="glass-card" style={{ textAlign: 'center' }}>
            {/* Error display */}
            {(recorderError || submitError) && (
              <div className="alert alert--error" style={{ marginBottom: 'var(--space-lg)', textAlign: 'left' }}>
                <AlertCircle size={16} />
                {recorderError || submitError}
              </div>
            )}

            <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-md)' }}>
              {!isRecording && !audioBlob && 'Tap to start recording your response'}
              {isRecording && 'Recording... tap to stop when you are done'}
              {!isRecording && audioBlob && 'Recording complete! Submit when ready.'}
            </p>

            {/* Record Button */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
              <button
                className={`record-btn ${isRecording ? 'record-btn--recording' : ''}`}
                onClick={isRecording ? stopRecording : audioBlob ? resetRecording : startRecording}
              >
                <div className="record-inner" />
              </button>
            </div>

            {/* Duration */}
            {(isRecording || audioBlob) && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: 'var(--space-lg)' }}>
                <Clock size={14} className="text-muted" />
                <span className={`text-sm ${isRecording ? 'text-error' : 'text-muted'}`}>
                  {formatDuration(duration)}
                </span>
                {isRecording && <span className="text-sm text-muted"> / 2:00 max</span>}
              </div>
            )}

            {/* Actions */}
            {!isRecording && audioBlob && (
              <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={resetRecording}>
                  Record Again
                </button>
                <button className="btn btn-primary btn-lg" onClick={handleSubmit}>
                  Submit Response
                  <ArrowRight size={18} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
