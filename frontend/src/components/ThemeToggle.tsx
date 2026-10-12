/**
 * Theme toggle button for switching between Light and Dark mode.
 */

import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

export default function ThemeToggle({ showLabel = true, className = '' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className={`theme-toggle ${className}`}
      onClick={toggleTheme}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <span className="theme-toggle__indicator">
        {isDark ? (
          <Sun size={16} className="theme-toggle__icon theme-toggle__icon--sun" />
        ) : (
          <Moon size={16} className="theme-toggle__icon theme-toggle__icon--moon" />
        )}
      </span>
      {showLabel && (
        <span className="theme-toggle__text">
          {isDark ? 'Light' : 'Dark'}
        </span>
      )}
    </button>
  );
}
