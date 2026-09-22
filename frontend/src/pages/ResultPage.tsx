/**
 * Result page — shows feedback summary with 3 action buttons:
 * 1. Back to Narrate
 * 2. Download PDF
 * 3. Start Drill Session
 */

import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';
import { downloadFeedbackPdf } from '../lib/api';
import type { NarrationSubmitResponse } from '../types';
import { ArrowLeft, Download, Dumbbell, AlertTriangle, CheckCircle } from 'lucide-react';

export default function ResultPage() {
  const { narrationId } = useParams<{ narrationId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

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

  return (
    <div className="page">
      <div className="container">
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

          {/* Detailed Feedback (collapsible) */}
          {result.feedback.length > 0 && (
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
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: 'var(--radius-sm)',
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
