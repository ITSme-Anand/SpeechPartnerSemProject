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
import { useAuth } from "@/context/AuthContext";
import type { RootStackParamList } from "@/navigation/types";
import { fetchHomeSummary } from "@/services/sessionService";
import { colors, fonts, radius, spacing } from "@/theme/tokens";
import type { HomeSummary } from "@/types";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const { userEmail } = useAuth();
  const [summary, setSummary] = useState<HomeSummary | null>(null);
  const [loadError, setLoadError] = useState(false);

  const displayName = userEmail ? userEmail.split("@")[0] || "there" : "there";

  useEffect(() => {
    let cancelled = false;
    fetchHomeSummary(displayName)
      .then((data) => !cancelled && setSummary(data))
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [displayName]);

  const streakCount = summary?.streakDays.filter(Boolean).length ?? 0;

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>Welcome back</Text>
            <Text style={styles.title}>Hey, {capitalize(displayName)}.</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate("Settings")}
            style={styles.avatar}
            accessibilityLabel="Open settings"
          >
            <Feather name="user" size={20} color={colors.white} />
          </Pressable>
        </View>

        {!summary && !loadError && (
          <ActivityIndicator
            color={colors.purpleDeep}
            style={{ marginTop: spacing.xl }}
          />
        )}
        {loadError && (
          <Text style={styles.errorText}>
            Couldn&apos;t load your summary. Pull to refresh soon.
          </Text>
        )}

        {summary && (
          <>
            <View style={styles.streakCard}>
              <View style={styles.rowBetween}>
                <Text style={styles.streakLabel}>This week</Text>
                <Text style={styles.streakBadge}>{streakCount}-day streak</Text>
              </View>
              <View style={styles.rowBetween}>
                {summary.streakDays.map((practiced, i) => (
                  <View key={i} style={{ alignItems: "center", gap: 6 }}>
                    <Text style={styles.dayLabel}>{DAY_LABELS[i]}</Text>
                    <View
                      style={[
                        styles.dayDot,
                        practiced
                          ? {
                              backgroundColor:
                                i === streakCount - 1
                                  ? colors.purple
                                  : colors.sage,
                            }
                          : styles.dayDotEmpty,
                      ]}
                    />
                  </View>
                ))}
              </View>
            </View>

            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Last session</Text>
                <Text style={styles.statValue}>{summary.lastSessionScore}</Text>
                <Text style={styles.statCaption}>
                  {summary.lastSessionScenario}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Your garden</Text>
                <View style={{ flexDirection: "row", gap: 4 }}>
                  {summary.garden.map((bloom) => (
                    <BloomIcon key={bloom.id} size={16} color={bloom.color} />
                  ))}
                </View>
                <Text style={styles.statCaption}>
                  {summary.bloomsThisMonth} blooms this month
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.nextCard}
              onPress={() => navigation.navigate("ChoosePractice")}
            >
              <View style={styles.nextIcon}>
                <Feather name="coffee" size={24} color={colors.purpleDeep} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nextEyebrow}>Up next</Text>
                <Text style={styles.nextTitle}>{summary.upNext.title}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.ink} />
            </Pressable>
          </>
        )}
      </ScrollView>

      <View style={styles.ctaWrap}>
        <PrimaryButton
          label="Start a Session"
          onPress={() => navigation.navigate("ChoosePractice")}
          icon={<Feather name="mic" size={18} color={colors.white} />}
        />
      </View>
    </ScreenContainer>
  );
}

function capitalize(s: string) {
  return s.length ? s[0]!.toUpperCase() + s.slice(1) : s;
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.textTertiary,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 26,
    color: colors.ink,
    marginTop: 2,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    fontFamily: fonts.body,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  streakCard: {
    backgroundColor: colors.ink,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  streakLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: "#C9BED3",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  streakBadge: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.mimosa,
  },
  dayLabel: { fontSize: 11, color: "#9F93AB", fontFamily: fonts.body },
  dayDot: { width: 28, height: 28, borderRadius: 14 },
  dayDotEmpty: {
    borderWidth: 1.5,
    borderColor: "#5A4F63",
    borderStyle: "dashed",
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 6,
  },
  statLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    color: colors.textTertiary,
  },
  statValue: {
    fontFamily: fonts.display,
    fontSize: 30,
    color: colors.purpleDeep,
  },
  statCaption: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textTertiary,
  },
  nextCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.accentTint,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  nextIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  nextEyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    textTransform: "uppercase",
    color: colors.purpleDeep,
  },
  nextTitle: { fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.ink },
  ctaWrap: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    paddingTop: spacing.sm,
  },
});
