import { Feather } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import type { RootStackParamList } from "@/navigation/types";
import { fetchDrillStep } from "@/services/sessionService";
import { colors, fonts, radius, spacing } from "@/theme/tokens";
import type { DrillStep } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "Drill">;

export function DrillScreen({ route, navigation }: Props) {
  const { sessionId } = route.params;
  const [drill, setDrill] = useState<DrillStep | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDrillStep(sessionId).then((data) => !cancelled && setDrill(data));
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!drill) {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.purpleDeep} />
        </View>
      </ScreenContainer>
    );
  }

  const selectedChoice = drill.choices.find((c) => c.id === selectedId);
  const canContinue = selectedChoice?.correct === true;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back"
        >
          <Feather name="chevron-left" size={20} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Fix your top pattern</Text>
        <View style={styles.triesBadge}>
          <Text style={styles.triesText}>
            {drill.triesRemaining} tries left
          </Text>
        </View>
      </View>

      <View style={styles.progressRow}>
        {Array.from({ length: drill.totalSteps }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressSegment,
              i < drill.stepIndex && styles.progressSegmentActive,
            ]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.conceptCard}>
          <Text style={styles.conceptEyebrow}>Concept</Text>
          <Text style={styles.conceptTitle}>{drill.concept}</Text>
          <Text style={styles.conceptExplanation}>{drill.explanation}</Text>
          <View style={styles.exampleRow}>
            {drill.examples.map((example) => (
              <View key={example} style={styles.exampleChip}>
                <Text style={styles.exampleText}>{example}</Text>
              </View>
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.sectionLabel}>Your turn</Text>
          <Text style={styles.prompt}>{drill.prompt}</Text>

          <View style={{ gap: spacing.sm }}>
            {drill.choices.map((choice) => {
              const isSelected = choice.id === selectedId;
              const showAsCorrect = isSelected && choice.correct;
              const showAsWrong = isSelected && !choice.correct;
              return (
                <Pressable
                  key={choice.id}
                  onPress={() => setSelectedId(choice.id)}
                  style={[
                    styles.choice,
                    showAsCorrect && styles.choiceCorrect,
                    showAsWrong && styles.choiceWrong,
                  ]}
                >
                  <Text style={styles.choiceText}>{choice.text}</Text>
                  {showAsCorrect && (
                    <View style={styles.choiceCheck}>
                      <Feather name="check" size={12} color={colors.white} />
                    </View>
                  )}
                  {showAsWrong && choice.hint && (
                    <Text style={styles.choiceHint}>{choice.hint}</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label="Continue"
          disabled={!canContinue}
          onPress={() => navigation.goBack()}
        />
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={styles.skipLink}>Skip for now</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  headerTitle: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.ink },
  triesBadge: {
    backgroundColor: colors.accentTint,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  triesText: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
    color: colors.purpleDeep,
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  progressSegment: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
  },
  progressSegmentActive: { backgroundColor: colors.purple },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  conceptCard: {
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 6,
  },
  conceptEyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.mimosa,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  conceptTitle: {
    fontFamily: fonts.display,
    fontSize: 17,
    color: colors.white,
  },
  conceptExplanation: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 19,
    color: "#D9D0DE",
    marginBottom: spacing.sm,
  },
  exampleRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  exampleChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  exampleText: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.white,
  },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  prompt: {
    fontFamily: fonts.display,
    fontSize: 19,
    lineHeight: 26,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  choice: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  choiceCorrect: {
    backgroundColor: colors.successTint,
    borderColor: colors.sageDeep,
  },
  choiceWrong: { borderColor: colors.border },
  choiceText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.ink,
  },
  choiceCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.sageDeep,
    alignItems: "center",
    justifyContent: "center",
  },
  choiceHint: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.rose },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
    gap: spacing.sm,
    alignItems: "center",
  },
  skipLink: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textTertiary,
  },
});
