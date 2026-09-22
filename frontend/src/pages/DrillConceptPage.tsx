/**
 * Drill Concept page — Stage 1: teaches the grammar concept
 * and shows the user's actual errors explained.
 */

import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { DrillResponse } from '../types';
import { BookOpen, ArrowRight, AlertTriangle } from 'lucide-react';

export default function DrillConceptPage() {
  const { drillId } = useParams<{ drillId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const drill = location.state as DrillResponse | undefined;

  if (!drill || !drillId) {
    return (
      <div className="page page-centered">
        <div className="glass-card" style={{ textAlign: 'center', maxWidth: '400px' }}>
          <AlertTriangle size={40} className="text-error" style={{ marginBottom: 'var(--space-md)' }} />
          <h2>Drill Not Found</h2>
          <p className="text-muted mt-md">Please start a new drill session.</p>
          <button className="btn btn-primary mt-lg" onClick={() => navigate('/')}>
            Go to Narrate
          </button>
        </div>
      </div>
    );
  }

  const { content } = drill;

  return (
    <div className="page">
      <div className="container">
        <div className="animate-slide-up">
          {/* Step Indicator */}
          <div className="step-indicator">
            <div className="step-dot step-dot--active">1</div>
            <div className="step-line" />
            <div className="step-dot step-dot--upcoming">2</div>
            <div className="step-line" />
            <div className="step-dot step-dot--upcoming">3</div>
          </div>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(0, 201, 167, 0.15)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--space-md)',
            }}>
              <BookOpen size={24} className="text-accent" />
            </div>
            <span className="badge badge--accent" style={{ display: 'inline-block', marginBottom: 'var(--space-sm)' }}>
              Focus: {drill.focus_error_class.replace(/_/g, ' ')}
            </span>
            <h1>{content.concept_title}</h1>
          </div>

          {/* Concept Explanation */}
          <div className="glass-card glass-card--elevated" style={{ marginBottom: 'var(--space-xl)' }}>
            <h3 style={{ marginBottom: 'var(--space-md)', fontSize: '1rem' }}>Understanding the Concept</h3>
            <p style={{
              fontSize: '1.05rem',
              lineHeight: 1.8,
              color: 'var(--color-text-primary)',
            }}>
              {content.concept_explanation}
            </p>
          </div>

          {/* User's Error Examples */}
          {content.examples.length > 0 && (
            <div className="glass-card" style={{ marginBottom: 'var(--space-2xl)' }}>
              <h3 style={{ marginBottom: 'var(--space-lg)', fontSize: '1rem' }}>
                Your Errors Explained
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
                {content.examples.map((example, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: 'var(--space-md)',
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: '3px solid var(--color-accent-secondary)',
                    }}
                  >
                    <div style={{ marginBottom: 'var(--space-sm)' }}>
                      <span className="text-sm text-muted" style={{ display: 'block', marginBottom: '4px' }}>
                        What you said:
                      </span>
                      <p style={{
                        color: 'var(--color-error)',
                        fontStyle: 'italic',
                        fontSize: '0.95rem',
                      }}>
                        "{example.original_sentence}"
                      </p>
                    </div>

                    <div style={{ marginBottom: 'var(--space-sm)' }}>
                      <span className="text-sm text-muted" style={{ display: 'block', marginBottom: '4px' }}>
                        Why it's wrong:
                      </span>
                      <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        {example.reason_for_error}
                      </p>
                    </div>

                    <div>
                      <span className="text-sm text-muted" style={{ display: 'block', marginBottom: '4px' }}>
                        Correct version:
                      </span>
                      <p style={{
                        color: 'var(--color-success)',
                        fontWeight: 500,
                        fontSize: '0.95rem',
                      }}>
                        "{example.corrected_sentence}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Continue Button */}
          <div style={{ textAlign: 'center' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => navigate(`/drill/${drillId}/mcq`, { state: drill })}
            >
              Continue to Questions
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
