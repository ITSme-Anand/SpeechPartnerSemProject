/**
 * Processing screen with animated spinner and customizable message.
 * Shown during STT transcription, LLM analysis, and drill generation.
 */

interface ProcessingScreenProps {
  message?: string;
  subMessage?: string;
}

export default function ProcessingScreen({
  message = 'Processing your speech...',
  subMessage = 'This may take a moment',
}: ProcessingScreenProps) {
  return (
    <div className="page page-centered" style={{ gap: 'var(--space-xl)' }}>
      <div className="animate-fade-in" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-xl)',
      }}>
        {/* Animated rings */}
        <div style={{ position: 'relative', width: '80px', height: '80px' }}>
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: 'var(--color-accent-primary)',
            animation: 'spin 1s linear infinite',
          }} />
          <div style={{
            position: 'absolute',
            inset: '8px',
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: 'var(--color-accent-secondary)',
            animation: 'spin 1.5s linear infinite reverse',
          }} />
          <div style={{
            position: 'absolute',
            inset: '16px',
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: 'rgba(255, 255, 255, 0.2)',
            animation: 'spin 2s linear infinite',
          }} />
        </div>

        <div style={{ textAlign: 'center' }}>
          <h3 style={{ marginBottom: 'var(--space-sm)' }}>{message}</h3>
          <p className="text-sm text-muted">{subMessage}</p>
        </div>

        <div className="loading-dots">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}
