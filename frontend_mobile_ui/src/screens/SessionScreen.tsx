import { Feather } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";

import { BloomIcon } from "@/components/BloomIcon";
import { ScreenContainer } from "@/components/ScreenContainer";
import type { RootStackParamList } from "@/navigation/types";
import { colors, fonts, spacing } from "@/theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Session">;

const DURATION_SECONDS: Record<Props["route"]["params"]["duration"], number> = {
  quick: 3 * 60,
  standard: 5 * 60,
  deep: 7 * 60,
};

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function SessionScreen({ route, navigation }: Props) {
  const { scenarioId, scenarioLabel, prompt, duration } = route.params;
  const targetSeconds = DURATION_SECONDS[duration];
  const [elapsed, setElapsed] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  // useAudioRecorder releases the native recorder on unmount for us; this
  // ref just tracks whether *we* started it, so cleanup only stops a
  // recording that is actually in progress instead of calling stop() on an
  // idle/already-released recorder.
  const isRecordingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Microphone access needed",
          "Enable microphone access in Settings to record a session.",
        );
        navigation.goBack();
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      if (cancelled) return;

      await recorder.prepareToRecordAsync();
      if (cancelled) return;

      recorder.record();
      isRecordingRef.current = true;
      setIsReady(true);
    }

    start().catch(() => {
      if (!cancelled) {
        Alert.alert(
          "Recording failed",
          "Could not start the microphone. Please try again.",
        );
        navigation.goBack();
      }
    });

    return () => {
      cancelled = true;
      // Always stop an in-progress recording on unmount, even if the user
      // backs out mid-session — an un-stopped recorder leaks the OS audio
      // session and can block the next screen from recording.
      if (isRecordingRef.current) {
        isRecordingRef.current = false;
        recorder.stop().catch(() => {});
      }
    };
    // recorder is a stable, auto-managed instance from useAudioRecorder;
    // re-running this effect on every render would restart the recording.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  useEffect(() => {
    if (!isReady) return;
    const interval = setInterval(() => {
      setElapsed((prev) => {
        if (prev + 1 >= targetSeconds) {
          clearInterval(interval);
          finishSession().catch(() => {});
          return targetSeconds;
        }
        return prev + 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, targetSeconds]);

  async function finishSession() {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;
    try {
      await recorder.stop();
      navigation.replace("Processing", {
        scenarioId,
        scenarioLabel,
        durationSeconds: elapsed,
        audioUri: recorder.uri ?? "",
      });
    } catch {
      Alert.alert(
        "Something went wrong",
        "We could not save your recording. Please try again.",
      );
      navigation.goBack();
    }
  }

  return (
    <ScreenContainer background={colors.inkDeep}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityLabel="Cancel session"
        >
          <Feather name="x" size={20} color="#B3A6BC" />
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={styles.headerEyebrow}>{scenarioLabel}</Text>
          <Text style={styles.headerTitle}>Session in progress</Text>
        </View>
        <Feather name="volume-2" size={20} color="#B3A6BC" />
      </View>

      <View style={styles.center}>
        <View style={styles.listeningPill}>
          <BloomIcon size={14} />
          <Text style={styles.listeningLabel}>
            Speak naturally. I&apos;m listening.
          </Text>
        </View>

        <View style={styles.micRing}>
          <View style={styles.micCircle}>
            <BloomIcon size={58} />
          </View>
        </View>

        <Text style={styles.prompt}>{prompt}</Text>

        <Text style={styles.clock}>
          {formatClock(elapsed)} / {formatClock(targetSeconds)}
        </Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={styles.finishButton}
          onPress={finishSession}
          disabled={!isReady}
        >
          <Feather name="check" size={18} color={colors.ink} />
          <Text style={styles.finishLabel}>Finish & submit</Text>
        </Pressable>
        <Text style={styles.footnote}>Your voice stays private and secure</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  headerEyebrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: "#9C8FA6",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  headerTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.white,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xl,
    paddingHorizontal: 30,
  },
  listeningPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  listeningLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    color: "#D9D0DE",
  },
  micRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderColor: "rgba(198,159,213,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  micCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  prompt: {
    fontFamily: fonts.displayItalic,
    fontStyle: "italic",
    fontSize: 22,
    lineHeight: 30,
    color: colors.white,
    textAlign: "center",
  },
  clock: { fontFamily: fonts.body, fontSize: 13, color: "#9C8FA6" },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
    alignItems: "center",
  },
  finishButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    height: 60,
    borderRadius: 999,
    backgroundColor: colors.mimosa,
  },
  finishLabel: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.ink },
  footnote: {
    fontFamily: fonts.body,
    fontSize: 11.5,
    color: colors.textTertiary,
  },
});
