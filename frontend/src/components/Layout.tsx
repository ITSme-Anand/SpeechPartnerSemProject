/**
 * App shell layout with navigation bar.
 */

import { useAuth } from '../context/AuthContext';
import { LogOut, Mic } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ── Navigation Bar ── */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: '1px solid var(--color-border)',
        background: 'rgba(11, 15, 26, 0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: 'var(--radius-sm)',
            background: 'var(--color-accent-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Mic size={18} color="#fff" />
          </div>
          <span style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            fontSize: '1.1rem',
            background: 'var(--color-accent-gradient)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            Grammar Partner
          </span>
        </div>

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="text-sm text-muted">
              {user.email}
            </span>
            <button
              className="btn btn-ghost btn-sm"
              onClick={signOut}
              title="Sign Out"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </nav>

      {/* ── Main Content ── */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  );
}
