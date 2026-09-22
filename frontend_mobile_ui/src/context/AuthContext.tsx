import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import type { AuthCredentials } from "@/types";

interface AuthState {
  isReady: boolean;
  isSignedIn: boolean;
  userEmail: string | null;
  hasAcceptedConsent: boolean;
  signIn: (credentials: AuthCredentials) => Promise<{ error: string | null }>;
  signUp: (credentials: AuthCredentials) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  acceptConsent: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Generic, non-enumerating error message — never reveal whether an email
 * is registered or which field was wrong; that leaks account existence. */
const GENERIC_AUTH_ERROR =
  "Something went wrong. Check your details and try again.";

function validateCredentials(credentials: AuthCredentials): string | null {
  if (!EMAIL_RE.test(credentials.email.trim()))
    return "Enter a valid email address.";
  if (credentials.password.length < 8)
    return "Password must be at least 8 characters.";
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [hasAcceptedConsent, setHasAcceptedConsent] = useState(false);

  useEffect(() => {
    if (env.useMockData) {
      // Nothing to restore in mock mode — start signed out, same as a real cold start.
      setIsReady(true);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setIsSignedIn(!!data.session);
      setUserEmail(data.session?.user.email ?? null);
      setIsReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsSignedIn(!!session);
        setUserEmail(session?.user.email ?? null);
      },
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      isReady,
      isSignedIn,
      userEmail,
      hasAcceptedConsent,
      acceptConsent: () => setHasAcceptedConsent(true),
      continueAsGuest: () => {
        setIsSignedIn(true);
        setUserEmail(null);
      },
      signUp: async (credentials) => {
        const validationError = validateCredentials(credentials);
        if (validationError) return { error: validationError };

        if (env.useMockData) {
          setIsSignedIn(true);
          setUserEmail(credentials.email.trim());
          return { error: null };
        }

        const { error } = await supabase.auth.signUp({
          email: credentials.email.trim(),
          password: credentials.password,
        });
        return { error: error ? GENERIC_AUTH_ERROR : null };
      },
      signIn: async (credentials) => {
        const validationError = validateCredentials(credentials);
        if (validationError) return { error: validationError };

        if (env.useMockData) {
          setIsSignedIn(true);
          setUserEmail(credentials.email.trim());
          return { error: null };
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: credentials.email.trim(),
          password: credentials.password,
        });
        return { error: error ? GENERIC_AUTH_ERROR : null };
      },
      signOut: async () => {
        if (!env.useMockData) {
          await supabase.auth.signOut();
        }
        setIsSignedIn(false);
        setUserEmail(null);
      },
    }),
    [isReady, isSignedIn, userEmail, hasAcceptedConsent],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
