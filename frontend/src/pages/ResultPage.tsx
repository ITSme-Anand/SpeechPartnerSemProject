/**
 * Result page — shows feedback with tabbed sections:
 * 1. Grammar (existing feedback)
 * 2. Delivery (pace, pitch, loudness analysis + coaching)
 * 3. Pauses & Fillers (timeline of events)
 *
 * Plus action buttons: Back, Download PDF, Start Drill.
 */

import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { downloadFeedbackPdf } from '../lib/api';
import type {
  NarrationSubmitResponse,
  DeliverySentenceEvent,
  DeliveryPattern,
  PauseEvent,
  FillerEvent,
} from '../types';
import {
  ArrowLeft,
  Download,
  Dumbbell,
  AlertTriangle,
  CheckCircle,
  Mic,
  Activity,
  Clock,
  Volume2,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Zap,
} from 'lucide-react';

// ── Helper: format seconds → "m:ss"
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ── Helper: pause type → display info
function getPauseTypeInfo(type: string) {
  switch (type) {
    case 'natural':
      return { label: 'Natural', className: 'badge--success' };
    case 'hesitation':
      return { label: 'Hesitation', className: 'badge--warning' };
    case 'lost_train_of_thought':
      return { label: 'Lost Train of Thought', className: 'badge--error' };
    default:
      return { label: type, className: 'badge--accent' };
  }
}

// ── Helper: pace/pitch/loudness label → icon
function getLabelIcon(label: string, size: number = 14) {
  switch (label) {
    case 'faster':
    case 'higher':
    case 'louder':
      return <TrendingUp size={size} />;
    case 'slower':
    case 'lower':
    case 'softer':
      return <TrendingDown size={size} />;
    default:
      return <Minus size={size} />;
  }
}

function getLabelClass(label: string): string {
  switch (label) {
    case 'faster':
    case 'higher':
    case 'louder':
      return 'delivery-label delivery-label--up';
    case 'slower':
    case 'lower':
    case 'softer':
      return 'delivery-label delivery-label--down';
    default:
      return 'delivery-label delivery-label--steady';
  }
}

// ── Pattern type display
function getPatternInfo(type: string) {
  switch (type) {
    case 'monotone_stretch':
      return { label: 'Monotone Stretch', icon: <Minus size={14} />, className: 'pattern-tag--warning' };
    case 'sustained_faster':
      return { label: 'Sustained Fast Pace', icon: <TrendingUp size={14} />, className: 'pattern-tag--error' };
    case 'sustained_slower':
      return { label: 'Sustained Slow Pace', icon: <TrendingDown size={14} />, className: 'pattern-tag--info' };
    case 'emphasis_without_pause':
      return { label: 'Emphasis Without Pause', icon: <Zap size={14} />, className: 'pattern-tag--accent' };
    default:
      return { label: type.replace(/_/g, ' '), icon: <Activity size={14} />, className: 'pattern-tag--accent' };
  }
}


export default function ResultPage() {
  const { narrationId } = useParams<{ narrationId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [activeTab, setActiveTab] = useState<'grammar' | 'delivery' | 'pauses'>('grammar');

  // Get result data from navigation state
  const result = location.state as NarrationSubmitResponse | undefined;

  if (!result || !narrationId) {
    return (
      <div className="page page-centered">
        <div className="glass-card" style={{ textAlign: 'center', maxWidth: '400px' }}>
          <AlertTriangle size={40} className="text-error" style={{ marginBottom: 'var(--space-md)' }} />
          <h2>Session Not Found</h2>
          <p className="text-muted mt-md">This result may have expired. Try a new narration.</p>
          <button className="btn btn-primary mt-lg" onClick={() => navigate('/')}>
            Go to Narrate
          </button>
        </div>
      </div>
    );
  }

  const handleDownloadPdf = async () => {
    setDownloading(true);
    setDownloadError('');
    try {
      await downloadFeedbackPdf(narrationId);
    } catch {
      setDownloadError('Failed to download PDF. Please try again.');
    }
    setDownloading(false);
  };

  const totalErrors = result.feedback.length;
  const errorCategories = [...new Set(result.feedback.map(f => f.error_class))];

  const delivery = result.delivery;
  const pauseEvents = result.pause_events || [];
  const fillerEvents = result.filler_events || [];

  // Counts for tab badges
  const pauseCount = pauseEvents.filter(p => p.type !== 'natural').length;
  const fillerCount = fillerEvents.length;
  const patternCount = delivery?.patterns?.length || 0;

  return (
    <div className="page">
      <div className="container container--wide">
        <div className="animate-slide-up">
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: 'var(--radius-full)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--space-md)',
              background: totalErrors === 0
                ? 'rgba(34, 197, 94, 0.15)'
                : 'rgba(245, 158, 11, 0.15)',
            }}>
              {totalErrors === 0
                ? <CheckCircle size={28} className="text-success" />
                : <AlertTriangle size={28} style={{ color: 'var(--color-warning)' }} />
              }
            </div>
            <h1 style={{ marginBottom: 'var(--space-sm)' }}>Analysis Complete</h1>
            <p style={{ color: 'var(--color-text-secondary)', maxWidth: '500px', margin: '0 auto' }}>
              Topic: <strong style={{ color: 'var(--color-text-primary)' }}>{result.title}</strong>
            </p>
          </div>

          {/* Summary Card */}
          <div className="glass-card glass-card--elevated" style={{ marginBottom: 'var(--space-xl)' }}>
            <p style={{
              fontSize: '1.05rem',
              lineHeight: 1.7,
              color: 'var(--color-text-primary)',
            }}>
              {result.summary}
            </p>

            {errorCategories.length > 0 && (
              <div style={{ display: 'flex', gap: 'var(--space-sm)', flexWrap: 'wrap', marginTop: 'var(--space-md)' }}>
                {errorCategories.map(cat => (
                  <span key={cat} className="badge badge--accent">
                    {cat.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* ── Tab Navigation ── */}
          <div className="result-tabs" style={{ marginBottom: 'var(--space-xl)' }}>
            <button
              className={`result-tab ${activeTab === 'grammar' ? 'result-tab--active' : ''}`}
              onClick={() => setActiveTab('grammar')}
            >
              <AlertCircle size={16} />
              Grammar
              {totalErrors > 0 && <span className="result-tab__count">{totalErrors}</span>}
            </button>
            <button
              className={`result-tab ${activeTab === 'delivery' ? 'result-tab--active' : ''}`}
              onClick={() => setActiveTab('delivery')}
            >
              <Activity size={16} />
              Delivery
              {patternCount > 0 && <span className="result-tab__count">{patternCount}</span>}
            </button>
            <button
              className={`result-tab ${activeTab === 'pauses' ? 'result-tab--active' : ''}`}
              onClick={() => setActiveTab('pauses')}
            >
              <Mic size={16} />
              Pauses & Fillers
              {(pauseCount + fillerCount) > 0 && (
                <span className="result-tab__count">{pauseCount + fillerCount}</span>
              )}
            </button>
          </div>

          {/* ── Tab Content ── */}

          {/* Grammar Tab */}
          {activeTab === 'grammar' && (
            <div className="animate-fade-in">
              {result.feedback.length > 0 ? (
                <div className="glass-card" style={{ marginBottom: 'var(--space-xl)' }}>
                  <h3 style={{ marginBottom: 'var(--space-lg)', fontSize: '1rem' }}>
                    Detailed Feedback ({totalErrors} error{totalErrors !== 1 ? 's' : ''})
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                    {result.feedback.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: 'var(--space-md)',
                          background: 'var(--color-bg-card-subtle)',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--color-border)',
                          borderLeft: '3px solid var(--color-accent-primary)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                          <span className="badge badge--error" style={{ fontSize: '0.7rem' }}>
                            {item.error_class.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                          <span style={{ opacity: 0.6 }}>Original:</span>{' '}
                          {item.original_sentence}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                          <span style={{ opacity: 0.6 }}>Error:</span>{' '}
                          <span style={{ color: 'var(--color-error)', fontWeight: 500 }}>{item.error_part}</span>
                        </p>
                        <p className="text-sm" style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                          <span style={{ opacity: 0.6 }}>Why:</span>{' '}
                          {item.explanation}
                        </p>
                        {item.corrected_sentence && (
                          <p className="text-sm" style={{ color: 'var(--color-success)' }}>
                            <span style={{ opacity: 0.6, color: 'var(--color-text-secondary)' }}>Corrected:</span>{' '}
                            {item.corrected_sentence}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="glass-card" style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                  <CheckCircle size={32} className="text-success" style={{ marginBottom: 'var(--space-md)' }} />
                  <h3>No Grammar Errors</h3>
                  <p className="text-muted mt-sm">Your grammar was spot on! Great job.</p>
                </div>
              )}
            </div>
          )}

          {/* Delivery Tab */}
          {activeTab === 'delivery' && (
            <div className="animate-fade-in">
              {delivery ? (
                <>
                  {/* Delivery Coaching Feedback */}
                  <div className="glass-card glass-card--elevated" style={{ marginBottom: 'var(--space-xl)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
                      <Volume2 size={18} className="text-accent" />
                      <h3 style={{ fontSize: '1rem' }}>Delivery Coaching</h3>
                    </div>
                    <div className="delivery-feedback-text">
                      {delivery.delivery_feedback.split('\n').map((line, i) => (
                        <p key={i} style={{
                          marginBottom: line.trim() ? 'var(--space-sm)' : 'var(--space-md)',
                          color: 'var(--color-text-primary)',
                          lineHeight: 1.7,
                        }}>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* Global Baselines */}
                  {delivery.baselines && (
                    <div className="glass-card" style={{ marginBottom: 'var(--space-xl)' }}>
                      <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-lg)' }}>Your Speech Overview</h3>
                      <div className="baseline-grid">
                        <div className="baseline-card">
                          <div className="baseline-card__icon baseline-card__icon--pace">
                            <Activity size={20} />
                          </div>
                          <div className="baseline-card__value">
                            {delivery.baselines.global_pace_syll_per_sec?.toFixed(1) ?? '—'}
                          </div>
                          <div className="baseline-card__label">syll/sec</div>
                          <div className="baseline-card__desc">Avg. Pace</div>
                        </div>
                        <div className="baseline-card">
                          <div className="baseline-card__icon baseline-card__icon--pitch">
                            <TrendingUp size={20} />
                          </div>
                          <div className="baseline-card__value">
                            {delivery.baselines.global_pitch_hz?.toFixed(0) ?? '—'}
                          </div>
                          <div className="baseline-card__label">Hz</div>
                          <div className="baseline-card__desc">Avg. Pitch</div>
                        </div>
                        <div className="baseline-card">
                          <div className="baseline-card__icon baseline-card__icon--loud">
                            <Volume2 size={20} />
                          </div>
                          <div className="baseline-card__value">
                            {delivery.baselines.global_loudness_db?.toFixed(1) ?? '—'}
                          </div>
                          <div className="baseline-card__label">dB</div>
                          <div className="baseline-card__desc">Avg. Loudness</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Detected Patterns */}
                  {delivery.patterns && delivery.patterns.length > 0 && (
                    <div className="glass-card" style={{ marginBottom: 'var(--space-xl)' }}>
                      <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-lg)' }}>
                        Detected Patterns
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
                        {delivery.patterns.map((pattern: DeliveryPattern, i: number) => {
                          const info = getPatternInfo(pattern.type);
                          return (
                            <div key={i} className="pattern-row">
                              <div className={`pattern-tag ${info.className}`}>
                                {info.icon}
                                {info.label}
                              </div>
                              <span className="text-sm text-muted">
                                {formatTime(pattern.start_time)} — {formatTime(pattern.end_time)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Per-sentence Delivery Table */}
                  {delivery.sentence_events && delivery.sentence_events.length > 0 && (
                    <div className="glass-card" style={{ marginBottom: 'var(--space-xl)' }}>
                      <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-lg)' }}>
                        Sentence-by-Sentence Analysis
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                        {delivery.sentence_events.map((evt: DeliverySentenceEvent, i: number) => (
                          <div key={i} className="sentence-delivery-card">
                            <div className="sentence-delivery-card__header">
                              <span className="text-sm text-muted">
                                {formatTime(evt.start)} — {formatTime(evt.end)}
                              </span>
                            </div>
                            <p className="sentence-delivery-card__text">{evt.text}</p>
                            <div className="sentence-delivery-card__metrics">
                              <div className="delivery-metric">
                                <span className="delivery-metric__label">Pace</span>
                                <span className="delivery-metric__value">{evt.pace_syll_per_sec} syll/s</span>
                                <span className={getLabelClass(evt.pace_label_vs_global)}>
                                  {getLabelIcon(evt.pace_label_vs_global)}
                                  {evt.pace_label_vs_global}
                                </span>
                              </div>
                              <div className="delivery-metric">
                                <span className="delivery-metric__label">Pitch</span>
                                <span className="delivery-metric__value">
                                  {evt.pitch_semitone_vs_speaker_median != null
                                    ? `${evt.pitch_semitone_vs_speaker_median > 0 ? '+' : ''}${evt.pitch_semitone_vs_speaker_median} st`
                                    : '—'}
                                </span>
                                <span className={getLabelClass(evt.pitch_label_vs_prev)}>
                                  {getLabelIcon(evt.pitch_label_vs_prev)}
                                  {evt.pitch_label_vs_prev}
                                </span>
                              </div>
                              <div className="delivery-metric">
                                <span className="delivery-metric__label">Loudness</span>
                                <span className="delivery-metric__value">
                                  {evt.loudness_db_vs_global != null
                                    ? `${evt.loudness_db_vs_global > 0 ? '+' : ''}${evt.loudness_db_vs_global} dB`
                                    : '—'}
                                </span>
                                <span className={getLabelClass(evt.loudness_label_vs_prev)}>
                                  {getLabelIcon(evt.loudness_label_vs_prev)}
                                  {evt.loudness_label_vs_prev}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="glass-card" style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                  <Activity size={32} className="text-muted" style={{ marginBottom: 'var(--space-md)' }} />
                  <h3>Delivery Analysis Unavailable</h3>
                  <p className="text-muted mt-sm">
                    Not enough speech data was available to analyze delivery.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Pauses & Fillers Tab */}
          {activeTab === 'pauses' && (
            <div className="animate-fade-in">
              {/* Summary Counts */}
              <div className="glass-card" style={{ marginBottom: 'var(--space-xl)' }}>
                <div className="pause-filler-summary">
                  <div className="pf-stat">
                    <div className="pf-stat__value">{pauseEvents.length}</div>
                    <div className="pf-stat__label">Total Pauses</div>
                  </div>
                  <div className="pf-stat">
                    <div className="pf-stat__value pf-stat__value--warning">
                      {pauseEvents.filter(p => p.type === 'hesitation').length}
                    </div>
                    <div className="pf-stat__label">Hesitations</div>
                  </div>
                  <div className="pf-stat">
                    <div className="pf-stat__value pf-stat__value--error">
                      {pauseEvents.filter(p => p.type === 'lost_train_of_thought').length}
                    </div>
                    <div className="pf-stat__label">Long Pauses</div>
                  </div>
                  <div className="pf-stat">
                    <div className="pf-stat__value pf-stat__value--accent">
                      {fillerEvents.length}
                    </div>
                    <div className="pf-stat__label">Fillers (uh/um)</div>
                  </div>
                </div>
              </div>

              {/* Filler Events */}
              {fillerEvents.length > 0 && (
                <div className="glass-card" style={{ marginBottom: 'var(--space-xl)' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-lg)' }}>
                    <Mic size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                    Detected Fillers
                  </h3>
                  <div className="event-timeline">
                    {fillerEvents.map((filler: FillerEvent, i: number) => (
                      <div key={i} className="event-timeline__item event-timeline__item--filler">
                        <div className="event-timeline__time">{formatTime(filler.start)}</div>
                        <div className="event-timeline__dot event-timeline__dot--filler" />
                        <div className="event-timeline__content">
                          <span className="badge badge--accent" style={{ textTransform: 'uppercase', fontWeight: 600 }}>
                            {filler.type}
                          </span>
                          <span className="text-sm text-muted" style={{ marginLeft: '8px' }}>
                            {Math.round(filler.confidence * 100)}% confidence
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pause Events */}
              {pauseEvents.length > 0 ? (
                <div className="glass-card" style={{ marginBottom: 'var(--space-xl)' }}>
                  <h3 style={{ fontSize: '1rem', marginBottom: 'var(--space-lg)' }}>
                    <Clock size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                    Detected Pauses
                  </h3>
                  <div className="event-timeline">
                    {pauseEvents.map((pause: PauseEvent, i: number) => {
                      const info = getPauseTypeInfo(pause.type);
                      return (
                        <div key={i} className={`event-timeline__item event-timeline__item--${pause.type}`}>
                          <div className="event-timeline__time">{formatTime(pause.start)}</div>
                          <div className={`event-timeline__dot event-timeline__dot--${pause.type}`} />
                          <div className="event-timeline__content">
                            <span className={`badge ${info.className}`}>
                              {info.label}
                            </span>
                            <span className="text-sm text-muted" style={{ marginLeft: '8px' }}>
                              {pause.duration.toFixed(1)}s
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="glass-card" style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                  <CheckCircle size={32} className="text-success" style={{ marginBottom: 'var(--space-md)' }} />
                  <h3>No Notable Pauses</h3>
                  <p className="text-muted mt-sm">Great flow — no hesitation pauses detected.</p>
                </div>
              )}

              {fillerEvents.length === 0 && pauseEvents.length === 0 && (
                <div className="glass-card" style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
                  <CheckCircle size={32} className="text-success" style={{ marginBottom: 'var(--space-md)' }} />
                  <h3>Clean Delivery!</h3>
                  <p className="text-muted mt-sm">No fillers or notable pauses detected. Excellent!</p>
                </div>
              )}
            </div>
          )}

          {/* Download error */}
          {downloadError && (
            <div className="alert alert--error" style={{ marginBottom: 'var(--space-md)' }}>
              {downloadError}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: 'var(--space-md)',
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}>
            <button className="btn btn-secondary" onClick={() => navigate('/')}>
              <ArrowLeft size={16} />
              Narrate Again
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleDownloadPdf}
              disabled={downloading}
            >
              <Download size={16} />
              {downloading ? 'Downloading...' : 'Download PDF'}
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate(`/drill-guide/${narrationId}`)}
            >
              <Dumbbell size={18} />
              Start Drill Session
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
