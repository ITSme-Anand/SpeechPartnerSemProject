/**
 * Narrate page — topic selection → record speech → submit.
 * Main landing page after login.
 *
 * Persistence strategy:
 * - Topic is saved to IndexedDB as soon as it's locked (even before recording)
 * - Audio is saved on both pause and stop (via the hook)
 * - On reload/back-nav, everything restores: topic, locked state, audio, duration
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudioRecorder, saveRecording, loadRecording, deleteRecording } from '../hooks/useAudioRecorder';
import { submitNarration } from '../lib/api';
import ProcessingScreen from '../components/ProcessingScreen';
import { Mic, Shuffle, Clock, History, AlertCircle, Pause, Play, RotateCcw } from 'lucide-react';

const STORAGE_KEY = 'narrate-page';

const RANDOM_TOPICS = [
  'My favorite childhood memory',
  'A place I would love to visit someday',
  'What I did last weekend',
  'My daily morning routine',
  'A skill I want to learn this year',
  'The best meal I have ever had',
  'A person who inspires me',
  'My favorite way to relax after a long day',
  'A book or movie that changed my perspective',
  'An unforgettable travel experience',
];

export default function NarratePage() {
  const navigate = useNavigate();

  const [topic, setTopic] = useState('');
  const [topicLocked, setTopicLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isRecovered, setIsRecovered] = useState(false);
  const hasRestoredRef = useRef(false);

  // Provide a callback that returns current page metadata for IndexedDB saves.
  // Uses refs internally so the hook always gets the latest topic/topicLocked
  // without needing to re-create the callback on every render.
  const topicRef = useRef(topic);
  const topicLockedRef = useRef(topicLocked);
  topicRef.current = topic;
  topicLockedRef.current = topicLocked;

  const getStorageMetadata = useCallback(() => ({
    topic: topicRef.current,
    topicLocked: topicLockedRef.current,
  }), []);

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
  } = useAudioRecorder({ maxDurationSeconds: 300, storageKey: STORAGE_KEY, getStorageMetadata });

  // ── Restore saved state on mount ──
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    loadRecording(STORAGE_KEY).then((saved) => {
      if (!saved) return;

      // Always restore topic if it was saved
      if (saved.topic) setTopic(saved.topic);
      if (saved.topicLocked) setTopicLocked(true);

      // Restore audio if it exists
      if (saved.blob) {
        restoreRecording(saved.blob, saved.duration);
        setIsRecovered(true);
      }
    });
  }, [restoreRecording]);

  const pickRandomTopic = () => {
    const randomIndex = Math.floor(Math.random() * RANDOM_TOPICS.length);
    setTopic(RANDOM_TOPICS[randomIndex]);
  };

  // Save topic to IndexedDB immediately when locked — even before any recording
  const lockTopic = () => {
    if (topic.trim()) {
      setTopicLocked(true);
      saveRecording(STORAGE_KEY, null, {
        duration: 0,
        topic: topic.trim(),
        topicLocked: true,
      }).catch(() => {});
    }
  };

  const unlockTopic = () => {
    setTopicLocked(false);
    resetRecording();
    setIsRecovered(false);
  };

  const handleSubmit = async () => {
    if (!audioBlob || !topic.trim()) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const result = await submitNarration(audioBlob, topic.trim());
      // Clean up saved recording on successful submit
      await deleteRecording(STORAGE_KEY).catch(() => {});
      navigate(`/result/${result.narration_id}`, { state: result });
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

  // Helper: get the record button class
  const getRecordBtnClass = () => {
    if (isPaused) return 'record-btn record-btn--paused';
    if (isRecording) return 'record-btn record-btn--recording';
    return 'record-btn';
  };

  // Helper: get status text
  const getStatusText = () => {
    if (!isRecording && !audioBlob) return 'Tap to start recording';
    if (isRecording && !isPaused) return 'Recording... tap to stop';
    if (isPaused) return 'Paused';
    return 'Recording complete!';
  };

  // ── Processing screen ──
  if (isSubmitting) {
    return (
      <ProcessingScreen
        message="Analyzing your speech..."
        subMessage="Transcribing and checking grammar — this takes about 15-30 seconds"
      />
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ maxWidth: '600px' }}>
        {/* Header */}
        <div className="animate-slide-up" style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
          <h1 style={{ marginBottom: 'var(--space-sm)' }}>
            Speak Your Mind
          </h1>
          <p className="text-muted">
            Choose a topic, record your speech, and get instant grammar feedback
          </p>
        </div>

        {/* Topic Selection */}
        <div className="glass-card animate-slide-up" style={{ marginBottom: 'var(--space-xl)', animationDelay: '0.1s' }}>
          <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '0.95rem', color: 'var(--color-text-secondary)' }}>
            What would you like to talk about?
          </h3>

          {!topicLocked ? (
            <>
              <input
                className="input"
                type="text"
                placeholder="Type your own topic..."
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && lockTopic()}
                style={{ marginBottom: 'var(--space-md)' }}
              />

              <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap' }}>
                <button className="btn btn-secondary btn-sm" onClick={pickRandomTopic}>
                  <Shuffle size={14} />
                  Random Topic
                </button>
                {topic.trim() && (
                  <button className="btn btn-primary btn-sm" onClick={lockTopic}>
                    Start with this topic
                  </button>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span className="badge badge--accent" style={{ marginBottom: '4px' }}>Topic</span>
                <p style={{ color: 'var(--color-text-primary)', fontWeight: 500, marginTop: '4px' }}>{topic}</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={unlockTopic}>
                Change
              </button>
            </div>
          )}
        </div>

        {/* Recording Section */}
        {topicLocked && (
          <div className="glass-card animate-slide-up" style={{ textAlign: 'center', animationDelay: '0.2s' }}>
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

            {/* Record button */}
            <div style={{ marginBottom: 'var(--space-lg)' }}>
              <p className="text-sm text-muted" style={{ marginBottom: 'var(--space-md)' }}>
                {getStatusText()}
              </p>

              {/* Recording controls */}
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
                {(isRecording || isPaused) ? (
                  /* ── Active recording: record button (stop) + pause/resume toggle ── */
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
                  /* ── Idle: single record button ── */
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Clock size={14} className="text-muted" />
                  <span className={`text-sm ${isRecording && !isPaused ? 'text-error' : isPaused ? 'text-warning' : 'text-muted'}`}>
                    {formatDuration(duration)}
                  </span>
                  {(isRecording || isPaused) && (
                    <span className="text-sm text-muted"> / 5:00 max</span>
                  )}
                  {isPaused && (
                    <span className="badge badge--accent" style={{ fontSize: '0.7rem', marginLeft: '4px' }}>PAUSED</span>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons after recording */}
            {!isRecording && !isPaused && audioBlob && (
              <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={() => { resetRecording(); setIsRecovered(false); }}>
                  Record Again
                </button>
                <button className="btn btn-primary btn-lg" onClick={handleSubmit}>
                  <Mic size={18} />
                  Submit Recording
                </button>
              </div>
            )}
          </div>
        )}

        {/* View Past Sessions (non-functional for now) */}
        <div style={{ textAlign: 'center', marginTop: 'var(--space-2xl)' }}>
          <button
            className="btn btn-ghost text-sm"
            disabled
            title="Coming soon"
            style={{ opacity: 0.4 }}
          >
            <History size={14} />
            View Past Sessions (Coming Soon)
          </button>
        </div>
      </div>
    </div>
  );
}
