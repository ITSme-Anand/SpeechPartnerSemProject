import { Feather } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import type { RootStackParamList } from "@/navigation/types";
import { colors, fonts, radius, spacing } from "@/theme/tokens";
import type { SessionDuration } from "@/types";

type Props = NativeStackScreenProps<RootStackParamList, "Duration">;

const OPTIONS: {
  key: SessionDuration;
  title: string;
  caption: string;
  minutes: number;
  badge?: string;
}[] = [
  {
    key: "quick",
    title: "Quick Chat",
    caption: "Just enough to warm up",
    minutes: 3,
  },
  {
    key: "standard",
    title: "Standard",
    caption: "Room to build a few ideas",
    minutes: 5,
    badge: "MOST PICKED",
  },
  {
    key: "deep",
    title: "Deep Dive",
    caption: "For when you're on a roll",
    minutes: 7,
  },
];

export function DurationScreen({ route, navigation }: Props) {
  const { scenarioId, scenarioLabel, prompt } = route.params;
  const [selected, setSelected] = useState<SessionDuration>("standard");

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>{scenarioLabel}</Text>
        <Text style={styles.title}>How long do{"\n"}you want to talk?</Text>
        <Text style={styles.subtitle}>
          Pick your pace &mdash; you can always go longer next time.
        </Text>
      </View>

      <View style={styles.list}>
        {OPTIONS.map((option) => {
          const active = selected === option.key;
          return (
            <Pressable
              key={option.key}
              onPress={() => setSelected(option.key)}
              style={[styles.card, active && styles.cardActive]}
            >
              {option.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{option.badge}</Text>
                </View>
              )}
              <View style={styles.cardIcon}>
                <Feather name="clock" size={22} color={colors.purpleDeep} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{option.title}</Text>
                <Text style={styles.cardCaption}>{option.caption}</Text>
              </View>
              {active ? (
                <View style={styles.checkCircle}>
                  <Feather name="check" size={14} color={colors.white} />
                </View>
              ) : (
                <Text style={styles.minutes}>
                  {option.minutes}
                  <Text style={styles.minutesUnit}>min</Text>
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label="Start session"
          icon={<Feather name="arrow-right" size={18} color={colors.white} />}
          onPress={() =>
            navigation.navigate("Session", {
              scenarioId,
              scenarioLabel,
              prompt,
              duration: selected,
            })
          }
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    gap: spacing.xs,
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
    fontSize: 25,
    lineHeight: 30,
    color: colors.ink,
    marginTop: 2,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  list: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardActive: { borderColor: colors.purple },
  badge: {
    position: "absolute",
    top: -11,
    right: 18,
    backgroundColor: colors.purple,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    color: colors.white,
    fontFamily: fonts.bodyExtraBold,
    fontSize: 10.5,
    letterSpacing: 0.5,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.paperWarm,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.ink },
  cardCaption: {
    fontFamily: fonts.body,
    fontSize: 12.5,
    color: colors.textTertiary,
  },
  minutes: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.textTertiary,
  },
  minutesUnit: { fontSize: 12 },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: { padding: spacing.xl },
});
