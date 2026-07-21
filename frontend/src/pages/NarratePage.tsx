/**
 * Narrate page — topic selection → record speech → submit.
 * Main landing page after login.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { submitNarration } from '../lib/api';
import ProcessingScreen from '../components/ProcessingScreen';
import { Mic, Shuffle, Clock, History, AlertCircle } from 'lucide-react';

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
  const { isRecording, audioBlob, duration, startRecording, stopRecording, resetRecording, error: recorderError } = useAudioRecorder(300);

  const [topic, setTopic] = useState('');
  const [topicLocked, setTopicLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const pickRandomTopic = () => {
    const randomIndex = Math.floor(Math.random() * RANDOM_TOPICS.length);
    setTopic(RANDOM_TOPICS[randomIndex]);
  };

  const lockTopic = () => {
    if (topic.trim()) {
      setTopicLocked(true);
    }
  };

  const unlockTopic = () => {
    setTopicLocked(false);
    resetRecording();
  };

  const handleSubmit = async () => {
    if (!audioBlob || !topic.trim()) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const result = await submitNarration(audioBlob, topic.trim());
      navigate(`/result/${result.narration_id}`, { state: result });
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
                {!isRecording && !audioBlob && 'Tap to start recording'}
                {isRecording && 'Recording... tap to stop'}
                {!isRecording && audioBlob && 'Recording complete!'}
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-md)' }}>
                <button
                  className={`record-btn ${isRecording ? 'record-btn--recording' : ''}`}
                  onClick={isRecording ? stopRecording : audioBlob ? resetRecording : startRecording}
                  title={isRecording ? 'Stop recording' : audioBlob ? 'Record again' : 'Start recording'}
                >
                  <div className="record-inner" />
                </button>
              </div>

              {/* Duration */}
              {(isRecording || audioBlob) && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <Clock size={14} className="text-muted" />
                  <span className={`text-sm ${isRecording ? 'text-error' : 'text-muted'}`}>
                    {formatDuration(duration)}
                  </span>
                  {isRecording && (
                    <span className="text-sm text-muted"> / 5:00 max</span>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons after recording */}
            {!isRecording && audioBlob && (
              <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={() => { resetRecording(); }}>
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
