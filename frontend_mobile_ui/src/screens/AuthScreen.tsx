import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useAuth } from "@/context/AuthContext";
import { colors, fonts, radius, spacing } from "@/theme/tokens";

type Mode = "signup" | "login";

export function AuthScreen() {
  const { signUp, signIn, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const action = mode === "signup" ? signUp : signIn;
      const { error: authError } = await action({ email, password });
      if (authError) setError(authError);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={{ gap: spacing.xs, marginBottom: spacing.xl }}>
            <Text style={styles.title}>Hey there.</Text>
            <Text style={styles.subtitle}>
              Create an account to save your progress and grow your garden.
            </Text>
          </View>

          <View style={styles.tabTrack}>
            <Pressable
              style={[styles.tab, mode === "signup" && styles.tabActive]}
              onPress={() => setMode("signup")}
            >
              <Text
                style={[
                  styles.tabLabel,
                  mode === "signup" && styles.tabLabelActive,
                ]}
              >
                Sign up
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, mode === "login" && styles.tabActive]}
              onPress={() => setMode("login")}
            >
              <Text
                style={[
                  styles.tabLabel,
                  mode === "login" && styles.tabLabelActive,
                ]}
              >
                Log in
              </Text>
            </Pressable>
          </View>

          <View style={{ gap: spacing.md }}>
            <View style={{ gap: 6 }}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@email.com"
                placeholderTextColor={colors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                style={styles.input}
              />
            </View>
            <View style={{ gap: 6 }}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                autoCapitalize="none"
                textContentType={mode === "signup" ? "newPassword" : "password"}
                style={styles.input}
              />
            </View>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <PrimaryButton
            label={mode === "signup" ? "Create account" : "Log in"}
            onPress={handleSubmit}
            loading={submitting}
            disabled={!email || !password}
            style={{ marginTop: spacing.lg }}
          />

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={{ flexDirection: "row", gap: spacing.md }}>
            <Pressable
              style={styles.socialButton}
              accessibilityLabel="Continue with Apple"
              disabled
            >
              <Text style={styles.socialLabel}>Apple</Text>
            </Pressable>
            <Pressable
              style={styles.socialButton}
              accessibilityLabel="Continue with Google"
              disabled
            >
              <Text style={styles.socialLabel}>Google</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={continueAsGuest}
            style={{ marginTop: spacing.xl }}
          >
            <Text style={styles.guestLink}>
              Browse a scenario without an account &rarr;
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 26,
    paddingTop: 24,
    paddingBottom: 40,
    flexGrow: 1,
  },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.ink },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14.5,
    color: colors.textSecondary,
  },
  tabTrack: {
    flexDirection: "row",
    backgroundColor: colors.tabTrack,
    borderRadius: radius.pill,
    padding: 5,
    marginBottom: spacing.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  tabActive: { backgroundColor: colors.white },
  tabLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textTertiary,
  },
  tabLabelActive: { color: colors.ink, fontFamily: fonts.bodyBold },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.textTertiary,
  },
  input: {
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.body,
    fontSize: 14.5,
    color: colors.ink,
  },
  error: {
    color: colors.rose,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    marginTop: spacing.sm,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginVertical: spacing.xl,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textTertiary,
  },
  socialButton: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  socialLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.ink,
  },
  guestLink: {
    textAlign: "center",
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.purpleDeep,
  },
});
