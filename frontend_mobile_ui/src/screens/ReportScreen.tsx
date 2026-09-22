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

import { BloomIcon } from "@/components/BloomIcon";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import type { RootStackParamList } from "@/navigation/types";
import { fetchSessionReport } from "@/services/sessionService";
import { colors, fonts, radius, spacing } from "@/theme/tokens";
import type { SessionReport } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "Report">;

function MetricBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.metricRow}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text style={styles.metricLabel}>{value}%</Text>
      </View>
      <View style={styles.metricTrack}>
        <View
          style={[
            styles.metricFill,
            { width: `${value}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

export function ReportScreen({ route, navigation }: Props) {
  const { scenarioLabel, durationMinutes, sessionId } = route.params;
  const [report, setReport] = useState<SessionReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSessionReport(sessionId, scenarioLabel, durationMinutes).then(
      (data) => !cancelled && setReport(data),
    );
    return () => {
      cancelled = true;
    };
  }, [sessionId, scenarioLabel, durationMinutes]);

  if (!report) {
    return (
      <ScreenContainer>
        <View style={styles.loading}>
          <ActivityIndicator color={colors.purpleDeep} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={styles.eyebrow}>
            {report.scenarioLabel} &middot; {report.durationMinutes} min
          </Text>
          <Text style={styles.title}>Session report</Text>
        </View>

        <View style={styles.metricsCard}>
          <MetricBar
            label="Grammar accuracy"
            value={report.grammarAccuracy}
            color={colors.purple}
          />
          <MetricBar
            label="Vocabulary range"
            value={report.vocabularyRange}
            color={colors.sageDeep}
          />
          <MetricBar
            label="Speaking pace"
            value={report.speakingPace}
            color="#E0B34E"
          />
        </View>

        {report.newBadge && (
          <View style={styles.badgeCard}>
            <View style={styles.badgeIcon}>
              <Feather name="award" size={24} color={colors.purpleDeep} />
            </View>
            <View>
              <Text style={styles.badgeEyebrow}>Newly earned</Text>
              <Text style={styles.badgeTitle}>{report.newBadge.title}</Text>
              <Text style={styles.badgeDetail}>{report.newBadge.detail}</Text>
            </View>
          </View>
        )}

        <View>
          <Text style={styles.sectionLabel}>Your garden</Text>
          <View style={styles.gardenCard}>
            {report.garden.map((bloom) => (
              <View
                key={bloom.id}
                style={{ alignItems: "center", gap: spacing.sm }}
              >
                <View
                  style={[
                    styles.gardenSlot,
                    { backgroundColor: `${bloom.color}33` },
                  ]}
                >
                  <BloomIcon size={22} color={bloom.color} />
                </View>
                <Text style={styles.gardenLabel}>{bloom.label}</Text>
              </View>
            ))}
            <View style={{ alignItems: "center", gap: spacing.sm }}>
              <View style={styles.gardenSlotEmpty}>
                <Feather name="plus" size={14} color="#C7BCCF" />
              </View>
              <Text style={styles.gardenLabel}>New</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={styles.shareButton}
          accessibilityLabel="Share progress"
        >
          <Feather name="share" size={15} color={colors.ink} />
          <Text style={styles.shareLabel}>Share progress</Text>
        </Pressable>
        <PrimaryButton
          label="Back to home"
          onPress={() => navigation.popToTop()}
          style={{ flex: 1 }}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.lg,
  },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.purpleDeep,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 24,
    color: colors.ink,
    marginTop: 2,
  },
  metricsCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  metricRow: { flexDirection: "row", justifyContent: "space-between" },
  metricLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.ink,
  },
  metricTrack: {
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.tabTrack,
    overflow: "hidden",
  },
  metricFill: { height: "100%", borderRadius: 5 },
  badgeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.inkDeep,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  badgeIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.mimosa,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeEyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.mimosa,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  badgeTitle: {
    fontFamily: fonts.bodyBold,
    fontSize: 15.5,
    color: colors.white,
  },
  badgeDetail: { fontFamily: fonts.body, fontSize: 12, color: "#C9BED3" },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  gardenCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  gardenSlot: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  gardenSlotEmpty: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  gardenLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
    color: colors.textTertiary,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
  shareButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  shareLabel: { fontFamily: fonts.bodyBold, fontSize: 14.5, color: colors.ink },
});
