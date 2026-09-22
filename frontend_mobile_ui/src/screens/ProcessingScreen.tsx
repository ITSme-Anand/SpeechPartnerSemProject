import { Feather } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { BloomIcon } from "@/components/BloomIcon";
import { ScreenContainer } from "@/components/ScreenContainer";
import type { RootStackParamList } from "@/navigation/types";
import { submitSessionAudio } from "@/services/sessionService";
import { colors, fonts, radius, spacing } from "@/theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Processing">;

const STEPS = [
  "Transcribed your voice",
  "Found your speaking patterns",
  "Planting your garden notes",
];

export function ProcessingScreen({ route, navigation }: Props) {
  const { scenarioId, scenarioLabel, durationSeconds, audioUri } = route.params;
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const stepTimer = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
    }, 700);

    submitSessionAudio({ scenarioId, durationSeconds, audioUri })
      .then(({ sessionId }) => {
        if (cancelled) return;
        navigation.replace("Feedback", { sessionId, scenarioLabel });
      })
      .catch(() => {
        if (cancelled) return;
        Alert.alert(
          "Something went wrong",
          "We could not process your session. Please try again.",
          [{ text: "OK", onPress: () => navigation.navigate("Home") }],
        );
      });

    return () => {
      cancelled = true;
      clearInterval(stepTimer);
    };
  }, [scenarioId, scenarioLabel, durationSeconds, audioUri, navigation]);

  return (
    <ScreenContainer>
      <View style={styles.center}>
        <View style={styles.iconOuter}>
          <View style={styles.iconInner}>
            <BloomIcon size={50} />
          </View>
        </View>

        <Text style={styles.title}>Growing your{"\n"}feedback&hellip;</Text>

        <View style={styles.checklist}>
          {STEPS.map((step, i) => (
            <View key={step} style={styles.checklistRow}>
              <View
                style={[
                  styles.dot,
                  i <= stepIndex ? styles.dotDone : styles.dotPending,
                ]}
              >
                {i <= stepIndex && (
                  <Feather name="check" size={13} color={colors.white} />
                )}
              </View>
              <Text
                style={[
                  styles.stepText,
                  i > stepIndex && styles.stepTextPending,
                ]}
              >
                {step}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.footnote}>This usually takes a few seconds.</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
    paddingHorizontal: 30,
  },
  iconOuter: {
    width: 130,
    height: 130,
    borderRadius: 65,
    alignItems: "center",
    justifyContent: "center",
  },
  iconInner: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 30,
    color: colors.ink,
    textAlign: "center",
  },
  checklist: {
    width: "100%",
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  checklistRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dotDone: { backgroundColor: colors.sage },
  dotPending: { backgroundColor: colors.purple, opacity: 0.4 },
  stepText: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.ink },
  stepTextPending: { color: colors.textSecondary },
  footnote: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textTertiary,
  },
});
