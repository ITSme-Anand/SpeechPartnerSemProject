import { Feather } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Circle, G, Path, Text as SvgText } from "react-native-svg";

import { PrimaryButton } from "@/components/PrimaryButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import type { RootStackParamList } from "@/navigation/types";
import { scenarioWheel, topicSparks } from "@/services/fixtures/data";
import { colors, fonts, radius, spacing } from "@/theme/tokens";
import type { Scenario } from "@/types";

const WEDGE_COLORS = [
  "#C69FD5",
  "#FDFDC9",
  "#A8C4A2",
  "#F3C6E0",
  "#B9A6E8",
  "#FCE8A8",
  "#8FBF8A",
  "#E3A9C4",
  "#D8C2ED",
  "#9C6FB0",
];

type Mode = "wheel" | "own";
type Props = NativeStackScreenProps<RootStackParamList, "ChoosePractice">;

export function ChoosePracticeScreen({ navigation }: Props) {
  const [mode, setMode] = useState<Mode>("wheel");
  const [landedOn, setLandedOn] = useState<Scenario | null>(null);
  const [ownTopic, setOwnTopic] = useState("");

  function spin() {
    const pick =
      scenarioWheel[Math.floor(Math.random() * scenarioWheel.length)]!;
    setLandedOn(pick);
  }

  function goToDuration(scenario: Scenario) {
    navigation.navigate("Duration", {
      scenarioId: scenario.id,
      scenarioLabel: scenario.label,
      prompt: scenario.prompt,
    });
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Choose your practice</Text>
        <Text style={styles.title}>Pick a vibe, or{"\n"}let fate decide.</Text>
      </View>

      <View style={styles.tabTrack}>
        <Pressable
          style={[styles.tab, mode === "wheel" && styles.tabActive]}
          onPress={() => setMode("wheel")}
        >
          <Feather
            name="target"
            size={14}
            color={mode === "wheel" ? colors.ink : colors.textTertiary}
          />
          <Text
            style={[styles.tabLabel, mode === "wheel" && styles.tabLabelActive]}
          >
            Surprise me
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, mode === "own" && styles.tabActive]}
          onPress={() => setMode("own")}
        >
          <Feather
            name="edit-3"
            size={14}
            color={mode === "own" ? colors.ink : colors.textTertiary}
          />
          <Text
            style={[styles.tabLabel, mode === "own" && styles.tabLabelActive]}
          >
            My own topic
          </Text>
        </Pressable>
      </View>

      {mode === "wheel" ? (
        <View style={styles.wheelSection}>
          <WheelSvg />

          {landedOn ? (
            <View style={styles.resultCard}>
              <Text style={styles.resultEyebrow}>You landed on</Text>
              <Text style={styles.resultTitle}>{landedOn.label}</Text>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <PrimaryButton
                  label="Let's go"
                  onPress={() => goToDuration(landedOn)}
                  style={{ flex: 1 }}
                />
                <Pressable onPress={spin} style={styles.spinAgainButton}>
                  <Feather name="refresh-cw" size={14} color={colors.white} />
                  <Text style={styles.spinAgainLabel}>Spin again</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable onPress={spin} style={styles.spinButton}>
              <Feather name="refresh-cw" size={18} color={colors.white} />
              <Text style={styles.spinButtonLabel}>Spin the wheel</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.ownSection}>
          <View style={styles.ownInputCard}>
            <Text style={styles.ownEyebrow}>Talk about anything</Text>
            <TextInput
              value={ownTopic}
              onChangeText={setOwnTopic}
              placeholder="meeting my partner's parents for the first time"
              placeholderTextColor="#B7ADC0"
              multiline
              style={styles.ownInput}
            />
          </View>

          <View style={{ gap: spacing.sm }}>
            <View style={styles.rowBetween}>
              <Text style={styles.sparkLabel}>Need a spark?</Text>
            </View>
            <View style={styles.chipWrap}>
              {topicSparks.map((spark) => (
                <Pressable
                  key={spark}
                  style={styles.chip}
                  onPress={() => setOwnTopic(spark)}
                >
                  <Text style={styles.chipLabel}>{spark}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      )}

      {mode === "own" && (
        <View style={styles.footer}>
          <PrimaryButton
            label="Start practicing"
            disabled={!ownTopic.trim()}
            onPress={() =>
              goToDuration({
                id: "own-topic",
                label: ownTopic.trim(),
                prompt: `Talk about: ${ownTopic.trim()}`,
              })
            }
          />
        </View>
      )}
    </ScreenContainer>
  );
}

function WheelSvg() {
  const cx = 150;
  const cy = 150;
  const r = 140;
  const segments = 10;
  const wedges = Array.from({ length: segments }, (_, i) => {
    const startAngle = (i / segments) * 2 * Math.PI - Math.PI / 2;
    const endAngle = ((i + 1) / segments) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const midAngle = (startAngle + endAngle) / 2;
    const labelR = r * 0.62;
    const lx = cx + labelR * Math.cos(midAngle);
    const ly = cy + labelR * Math.sin(midAngle);
    const rotation = (midAngle * 180) / Math.PI + 90;
    return {
      path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`,
      fill: WEDGE_COLORS[i],
      lx,
      ly,
      rotation,
      label: scenarioWheel[i]?.label ?? "",
    };
  });

  return (
    <View style={styles.wheelWrap}>
      <Svg width={220} height={220} viewBox="0 0 300 300">
        <G>
          {wedges.map((w, i) => (
            <Path
              key={i}
              d={w.path}
              fill={w.fill}
              stroke={colors.white}
              strokeWidth={4}
            />
          ))}
          {wedges.map((w, i) => (
            <SvgText
              key={`t${i}`}
              x={w.lx}
              y={w.ly}
              fill={colors.ink}
              fontSize={10}
              fontWeight="700"
              textAnchor="middle"
              transform={`rotate(${w.rotation} ${w.lx} ${w.ly})`}
            >
              {w.label}
            </SvgText>
          ))}
        </G>
        <Circle cx={cx} cy={cy} r={34} fill={colors.white} />
      </Svg>
      <View style={styles.wheelPointer}>
        <Feather name="chevron-down" size={22} color={colors.ink} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: 4 },
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
  },
  tabTrack: {
    flexDirection: "row",
    backgroundColor: colors.tabTrack,
    borderRadius: radius.pill,
    padding: 5,
    marginHorizontal: spacing.xl,
    marginTop: spacing.md,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: radius.pill,
  },
  tabActive: { backgroundColor: colors.white },
  tabLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.textTertiary,
  },
  tabLabelActive: { color: colors.ink },
  wheelSection: {
    flex: 1,
    alignItems: "center",
    paddingTop: spacing.md,
    gap: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  wheelWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.sm,
  },
  wheelPointer: { position: "absolute", top: -18 },
  spinButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.purpleDeep,
  },
  spinButtonLabel: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
  resultCard: {
    width: "100%",
    backgroundColor: colors.ink,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  resultEyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
    color: "#C9BED3",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  resultTitle: {
    fontFamily: fonts.displayItalic,
    fontStyle: "italic",
    fontSize: 24,
    color: colors.mimosa,
  },
  spinAgainButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: "#4B4152",
  },
  spinAgainLabel: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  ownSection: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  ownInputCard: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.purple,
    borderStyle: "dashed",
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  ownEyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    textTransform: "uppercase",
    color: colors.purpleDeep,
  },
  ownInput: {
    fontFamily: fonts.displayItalic,
    fontStyle: "italic",
    fontSize: 18,
    lineHeight: 24,
    color: colors.ink,
    minHeight: 60,
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sparkLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 12.5,
    color: colors.textTertiary,
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
  },
  chipLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    color: colors.ink,
  },
  footer: { padding: spacing.xl },
});
