/**
 * Drill Guide page — explains the 3-stage drill process before starting.
 */

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { startDrill } from '../lib/api';
import ProcessingScreen from '../components/ProcessingScreen';
import { BookOpen, HelpCircle, MessageSquare, ArrowRight, Sparkles } from 'lucide-react';

const STAGES = [
  {
    icon: BookOpen,
    title: 'Learn',
    description: 'Understand the grammar concept and see your actual errors explained in simple, bite-sized chunks.',
    color: '#00C9A7',
  },
  {
    icon: HelpCircle,
    title: 'Practice',
    description: 'Test your understanding with multiple-choice questions. Each answer comes with an explanation.',
    color: '#6366F1',
  },
  {
    icon: MessageSquare,
    title: 'Speak',
    description: 'Apply what you learned by speaking freely on a scenario prompt. We will analyze your speech for improvement.',
    color: '#F59E0B',
  },
];

export default function DrillGuidePage() {
  const { narrationId } = useParams<{ narrationId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    if (!narrationId) return;

    setLoading(true);
    setError('');

    try {
      const drill = await startDrill(narrationId);
      navigate(`/drill/${drill.drill_id}/concept`, { state: drill });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to start drill. Please try again.';
      setError(message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProcessingScreen
        message="Getting your customised drills ready..."
        subMessage="Analyzing your error patterns and generating personalized exercises"
      />
    );
  }

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
              background: 'var(--color-accent-glow)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--space-md)',
            }}>
              <Sparkles size={28} className="text-accent" />
            </div>
            <h1 style={{ marginBottom: 'var(--space-sm)' }}>Drill Session</h1>
            <p className="text-muted" style={{ maxWidth: '450px', margin: '0 auto' }}>
              Targeted practice on your weakest grammar area. Here's what to expect:
            </p>
          </div>

          {/* Stages */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--space-lg)',
            marginBottom: 'var(--space-2xl)',
            maxWidth: '500px',
            margin: '0 auto var(--space-2xl)',
          }}>
            {STAGES.map((stage, idx) => (
              <div
                key={idx}
                className="glass-card"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-lg)',
                  animationDelay: `${0.1 * (idx + 1)}s`,
                }}
              >
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  background: `${stage.color}15`,
                  border: `1px solid ${stage.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <stage.icon size={22} style={{ color: stage.color }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: '4px' }}>
                    <span className="text-sm text-muted">Stage {idx + 1}</span>
                    <h4 style={{ color: stage.color }}>{stage.title}</h4>
                  </div>
                  <p className="text-sm text-muted">{stage.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="alert alert--error" style={{ marginBottom: 'var(--space-lg)', maxWidth: '500px', margin: '0 auto var(--space-lg)' }}>
              {error}
            </div>
          )}

          {/* Start Button */}
          <div style={{ textAlign: 'center' }}>
            <button className="btn btn-primary btn-lg" onClick={handleStart}>
              Start Drills
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
