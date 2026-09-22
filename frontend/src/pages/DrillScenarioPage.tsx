/**
 * Drill Scenario page — Stage 3: speak freely on a scenario prompt.
 * Records audio and submits as a drill narration.
 *
 * Persistence: audio is saved to IndexedDB on both pause and stop,
 * keyed by drill ID. Survives reload & back-navigation.
 */

import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAudioRecorder, loadRecording, deleteRecording } from '../hooks/useAudioRecorder';
import { submitNarration } from '../lib/api';
import ProcessingScreen from '../components/ProcessingScreen';
import type { DrillResponse } from '../types';
import { MessageSquare, Clock, AlertCircle, ArrowRight, AlertTriangle, Pause, Play, RotateCcw } from 'lucide-react';

export default function DrillScenarioPage() {
  const { drillId } = useParams<{ drillId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const drill = location.state as DrillResponse | undefined;
  const storageKey = `drill-scenario-${drillId}`;

  const {
    isRecording,
    isPaused,
    audioBlob,
    duration,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    resetRecording,
    discardRecording,
    restoreRecording,
    error: recorderError,
  } = useAudioRecorder({ maxDurationSeconds: 120, storageKey });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isRecovered, setIsRecovered] = useState(false);
  const hasRestoredRef = useRef(false);

  // ── Restore saved recording on mount ──
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    loadRecording(storageKey).then((saved) => {
      if (saved && saved.blob) {
        restoreRecording(saved.blob, saved.duration);
        setIsRecovered(true);
      }
    });
  }, [storageKey, restoreRecording]);

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
      // Clean up saved recording on successful submit
      await deleteRecording(storageKey).catch(() => {});
      navigate(`/drill/${drillId}/summary`, { state: { drill_id: drillId, focus_error_class: drill.focus_error_class } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit. Please try again.';
      setSubmitError(message);
      setIsSubmitting(false);
    }
  };

  const handleDiscard = () => {
    discardRecording();
    setIsRecovered(false);
  };

  const handleKeepRecovered = () => {
    setIsRecovered(false);
  };

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getRecordBtnClass = () => {
    if (isPaused) return 'record-btn record-btn--paused';
    if (isRecording) return 'record-btn record-btn--recording';
    return 'record-btn';
  };

  const getStatusText = () => {
    if (!isRecording && !audioBlob) return 'Tap to start recording your response';
    if (isRecording && !isPaused) return 'Recording... tap to stop when you are done';
    if (isPaused) return 'Paused';
    return 'Recording complete! Submit when ready.';
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
            {/* Recovery banner */}
            {isRecovered && audioBlob && !isRecording && (
              <div className="recovery-banner">
                <div className="recovery-banner__info">
                  <RotateCcw size={16} />
                  <span>Previous recording recovered ({formatDuration(duration)})</span>
                </div>
                <div className="recovery-banner__actions">
                  <button className="btn btn-ghost btn-sm" onClick={handleDiscard}>
                    Discard
                  </button>
                  <button className="btn btn-primary btn-sm" onClick={handleKeepRecovered}>
                    Keep
                  </button>
                </div>
              </div>
            )}

            {/* Error display */}
            {(recorderError || submitError) && (
              <div className="alert alert--error" style={{ marginBottom: 'var(--space-lg)', textAlign: 'left' }}>
                <AlertCircle size={16} />
                {recorderError || submitError}
              </div>
            )}

            <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-md)' }}>
              {getStatusText()}
            </p>

            {/* Record Button / Controls */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
              {(isRecording || isPaused) ? (
                <div className="recording-controls">
                  {/* Main record button — click to stop */}
                  <button
                    className={getRecordBtnClass()}
                    onClick={stopRecording}
                    title="Stop recording"
                  >
                    <div className="record-inner" />
                  </button>

                  {/* Pause / Resume toggle */}
                  <button
                    className={`control-btn ${isPaused ? 'control-btn--resume' : 'control-btn--pause'}`}
                    onClick={isPaused ? resumeRecording : pauseRecording}
                    title={isPaused ? 'Resume recording' : 'Pause recording'}
                  >
                    {isPaused ? <Play size={18} /> : <Pause size={18} />}
                  </button>
                </div>
              ) : (
                <button
                  className="record-btn"
                  onClick={audioBlob ? resetRecording : startRecording}
                  title={audioBlob ? 'Record again' : 'Start recording'}
                >
                  <div className="record-inner" />
                </button>
              )}
            </div>

            {/* Duration */}
            {(isRecording || isPaused || audioBlob) && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: 'var(--space-lg)' }}>
                <Clock size={14} className="text-muted" />
                <span className={`text-sm ${isRecording && !isPaused ? 'text-error' : isPaused ? 'text-warning' : 'text-muted'}`}>
                  {formatDuration(duration)}
                </span>
                {(isRecording || isPaused) && <span className="text-sm text-muted"> / 2:00 max</span>}
                {isPaused && (
                  <span className="badge badge--accent" style={{ fontSize: '0.7rem', marginLeft: '4px' }}>PAUSED</span>
                )}
              </div>
            )}

            {/* Actions */}
            {!isRecording && !isPaused && audioBlob && (
              <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={() => { resetRecording(); setIsRecovered(false); }}>
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
