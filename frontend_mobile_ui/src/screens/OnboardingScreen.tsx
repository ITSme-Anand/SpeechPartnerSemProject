import { Feather } from "@expo/vector-icons";
import { requestRecordingPermissionsAsync } from "expo-audio";
import React, { useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BloomIcon } from "@/components/BloomIcon";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useAuth } from "@/context/AuthContext";
import { colors, fonts, radius, spacing } from "@/theme/tokens";

function ConsentRow({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={styles.consentRow}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <Feather name="check" size={13} color={colors.white} />}
      </View>
      <Text style={styles.consentText}>{children}</Text>
    </Pressable>
  );
}

export function OnboardingScreen() {
  const { acceptConsent } = useAuth();
  const [recordingConsent, setRecordingConsent] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const canContinue = recordingConsent && privacyConsent;

  async function handleContinue() {
    setRequesting(true);
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert(
          "Microphone access needed",
          "SpeechPartner needs your microphone to record practice sessions. You can enable it in Settings.",
          [
            { text: "Not now", style: "cancel" },
            { text: "Open Settings", onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
      acceptConsent();
    } finally {
      setRequesting(false);
    }
  }

  return (
    <ScreenContainer>
      <View style={styles.wordmarkRow}>
        <BloomIcon size={18} />
        <Text style={styles.wordmark}>grammar partner</Text>
      </View>

      <View style={styles.hero}>
        <View style={styles.iconRing}>
          <View style={[styles.iconRing, styles.iconRingInner]} />
          <View style={styles.iconCircle}>
            <BloomIcon size={46} />
          </View>
        </View>

        <Text style={styles.title}>
          Before we{"\n"}
          <Text style={styles.titleEmphasis}>start talking</Text>
        </Text>
        <Text style={styles.body}>
          We&apos;ll record your voice, transcribe it, and use AI to spot
          grammar patterns worth practicing. You can delete your recordings
          anytime.
        </Text>
      </View>

      <View style={styles.footer}>
        <ConsentRow
          checked={recordingConsent}
          onToggle={() => setRecordingConsent((v) => !v)}
        >
          I agree to voice recording & AI analysis, per the data retention
          policy.
        </ConsentRow>
        <ConsentRow
          checked={privacyConsent}
          onToggle={() => setPrivacyConsent((v) => !v)}
        >
          I&apos;ve read the privacy policy and understand I can withdraw
          consent anytime.
        </ConsentRow>

        <PrimaryButton
          label="Allow microphone & continue"
          onPress={handleContinue}
          disabled={!canContinue}
          loading={requesting}
          icon={<Feather name="arrow-right" size={18} color={colors.white} />}
          style={{ marginTop: spacing.xs }}
        />
        <Text style={styles.footnote}>Your voice stays private and secure</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingTop: spacing.lg,
  },
  wordmark: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    color: colors.purpleDeep,
  },
  hero: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: spacing.lg,
  },
  iconRing: {
    width: 132,
    height: 132,
    borderRadius: 66,
    borderWidth: 1.5,
    borderColor: colors.purple,
    borderStyle: "dashed",
    opacity: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  iconRingInner: {
    position: "absolute",
    width: 104,
    height: 104,
    borderRadius: 52,
    opacity: 0.7,
  },
  iconCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 32,
    lineHeight: 38,
    textAlign: "center",
    color: colors.ink,
  },
  titleEmphasis: { color: colors.purpleDeep, fontStyle: "italic" },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 300,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  checkboxChecked: {
    backgroundColor: colors.purple,
    borderColor: colors.purple,
  },
  consentText: {
    flex: 1,
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.ink,
  },
  footnote: {
    textAlign: "center",
    fontSize: 11.5,
    fontFamily: fonts.body,
    color: colors.textTertiary,
  },
});
