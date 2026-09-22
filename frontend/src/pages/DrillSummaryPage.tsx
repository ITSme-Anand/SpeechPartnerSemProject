/**
 * Drill Summary page — shows results of the completed drill session.
 * Fetches summary from backend (may need to poll if still processing).
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { getDrillSummary } from '../lib/api';
import ProcessingScreen from '../components/ProcessingScreen';
import type { DrillSummaryResponse } from '../types';
import { Trophy, ArrowLeft, CheckCircle, AlertTriangle, Target } from 'lucide-react';

export default function DrillSummaryPage() {
  const { drillId } = useParams<{ drillId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const stateData = location.state as { drill_id: string; focus_error_class: string } | undefined;

  const [summary, setSummary] = useState<DrillSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!drillId) return;

    let pollCount = 0;
    const maxPolls = 15;

    const fetchSummary = async () => {
      try {
        const data = await getDrillSummary(drillId);

        if (data.status === 'processing' && pollCount < maxPolls) {
          pollCount++;
          setTimeout(fetchSummary, 3000); // Poll every 3 seconds
          return;
        }

        setSummary(data);
        setLoading(false);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load summary.';
        setError(message);
        setLoading(false);
      }
    };

    fetchSummary();
  }, [drillId]);

  if (loading) {
    return (
      <ProcessingScreen
        message="Preparing your drill summary..."
        subMessage="Almost there!"
      />
    );
  }

  if (error) {
    return (
      <div className="page page-centered">
        <div className="glass-card" style={{ textAlign: 'center', maxWidth: '400px' }}>
          <AlertTriangle size={40} className="text-error" style={{ marginBottom: 'var(--space-md)' }} />
          <h2>Something went wrong</h2>
          <p className="text-muted mt-md">{error}</p>
          <button className="btn btn-primary mt-lg" onClick={() => navigate('/')}>
            Back to Narrate
          </button>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  const focusClass = summary.focus_error_class || stateData?.focus_error_class || 'grammar';
  const focusOpps = summary.focus_opportunity_count ?? 0;
  const focusErrs = summary.focus_error_count ?? 0;
  const focusAccuracy = focusOpps > 0 ? Math.round(((focusOpps - focusErrs) / focusOpps) * 100) : 100;

  return (
    <div className="page">
      <div className="container">
        <div className="animate-slide-up">
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--color-accent-glow)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--space-md)',
              boxShadow: 'var(--shadow-glow)',
            }}>
              <Trophy size={32} className="text-accent" />
            </div>
            <h1 style={{ marginBottom: 'var(--space-sm)' }}>Drill Complete!</h1>
            {summary.concept_title && (
              <p className="text-muted">
                Focus: <strong style={{ color: 'var(--color-accent-primary)' }}>{summary.concept_title}</strong>
              </p>
            )}
          </div>

          {/* Focus Area Stats */}
          <div className="glass-card glass-card--elevated" style={{ marginBottom: 'var(--space-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-lg)' }}>
              <Target size={18} className="text-accent" />
              <h3 style={{ fontSize: '1rem' }}>
                Scenario Performance — {focusClass.replace(/_/g, ' ')}
              </h3>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--space-md)',
              textAlign: 'center',
            }}>
              <div style={{
                padding: 'var(--space-md)',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-sm)',
              }}>
                <p className="text-sm text-muted" style={{ marginBottom: '4px' }}>Opportunities</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-heading)' }}>
                  {focusOpps}
                </p>
              </div>

              <div style={{
                padding: 'var(--space-md)',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-sm)',
              }}>
                <p className="text-sm text-muted" style={{ marginBottom: '4px' }}>Errors</p>
                <p style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-heading)',
                  color: focusErrs === 0 ? 'var(--color-success)' : 'var(--color-error)',
                }}>
                  {focusErrs}
                </p>
              </div>

              <div style={{
                padding: 'var(--space-md)',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-sm)',
              }}>
                <p className="text-sm text-muted" style={{ marginBottom: '4px' }}>Accuracy</p>
                <p style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-heading)',
                  color: focusAccuracy >= 80 ? 'var(--color-success)' : focusAccuracy >= 50 ? 'var(--color-warning)' : 'var(--color-error)',
                }}>
                  {focusAccuracy}%
                </p>
              </div>
            </div>
          </div>

          {/* Scenario Feedback */}
          {summary.feedback && summary.feedback.length > 0 ? (
            <div className="glass-card" style={{ marginBottom: 'var(--space-2xl)' }}>
              <h3 style={{ marginBottom: 'var(--space-lg)', fontSize: '1rem' }}>
                Errors in Your Scenario Response
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                {summary.feedback.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 'var(--space-md)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: '3px solid var(--color-accent-primary)',
                    }}
                  >
                    <span className="badge badge--error" style={{ fontSize: '0.7rem', marginBottom: '6px', display: 'inline-block' }}>
                      {item.error_class.replace(/_/g, ' ')}
                    </span>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                      "{item.original_sentence}"
                    </p>
                    <p className="text-sm">
                      <span className="text-error" style={{ fontWeight: 500 }}>{item.error_part}</span>
                      {' → '}
                      <span className="text-success" style={{ fontWeight: 500 }}>{item.corrected_sentence}</span>
                    </p>
                    <p className="text-sm text-muted" style={{ marginTop: '4px', fontStyle: 'italic' }}>
                      {item.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ marginBottom: 'var(--space-2xl)', textAlign: 'center' }}>
              <CheckCircle size={32} className="text-success" style={{ marginBottom: 'var(--space-md)' }} />
              <h3>No Errors Found!</h3>
              <p className="text-muted mt-sm">
                You nailed the scenario response. Your practice is paying off!
              </p>
            </div>
          )}

          {/* Back button */}
          <div style={{ textAlign: 'center' }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/')}>
              <ArrowLeft size={18} />
              Back to Narrate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
