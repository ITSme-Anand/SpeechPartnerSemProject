import { Feather } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { ScreenContainer } from "@/components/ScreenContainer";
import { useAuth } from "@/context/AuthContext";
import type { RootStackParamList } from "@/navigation/types";
import { colors, fonts, radius, spacing } from "@/theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

function Row({
  label,
  onPress,
  right,
}: {
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
      <Text style={styles.rowLabel}>{label}</Text>
      {right ?? (
        <Feather name="chevron-right" size={14} color={colors.textFaint} />
      )}
    </Pressable>
  );
}

export function SettingsScreen({ navigation }: Props) {
  const { userEmail, signOut } = useAuth();
  const [aiConsent, setAiConsent] = useState(true);
  const [sessionReminders, setSessionReminders] = useState(true);

  function confirmDeleteAccount() {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your account, recordings, and progress. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () =>
            Alert.alert(
              "Not implemented",
              "Wire this up to the backend delete-account endpoint.",
            ),
        },
      ],
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back"
        >
          <Feather name="chevron-left" size={20} color={colors.ink} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <Text style={styles.group}>Account</Text>
          <View style={styles.card}>
            <Row
              label={userEmail ?? "Guest"}
              right={
                <Text style={styles.verified}>
                  {userEmail ? "Verified" : "Guest mode"}
                </Text>
              }
            />
            <View style={styles.divider} />
            <Row label="Log out" onPress={() => signOut()} />
          </View>
        </View>

        <View>
          <Text style={styles.group}>Privacy & AI data</Text>
          <View style={styles.card}>
            <Row
              label="Manage voice recordings"
              onPress={() =>
                Alert.alert(
                  "Not implemented",
                  "List/delete recordings from the backend once available.",
                )
              }
            />
            <View style={styles.divider} />
            <Row
              label="Withdraw AI consent"
              right={
                <Switch
                  value={!aiConsent}
                  onValueChange={(v) => setAiConsent(!v)}
                  trackColor={{ true: colors.rose, false: colors.border }}
                />
              }
            />
            <View style={styles.divider} />
            <Row
              label="Privacy policy"
              onPress={() =>
                Alert.alert(
                  "Privacy policy",
                  "Link this to the hosted policy URL.",
                )
              }
            />
          </View>
        </View>

        <View>
          <Text style={styles.group}>Preferences</Text>
          <View style={styles.card}>
            <Row
              label="Session reminders"
              right={
                <Switch
                  value={sessionReminders}
                  onValueChange={setSessionReminders}
                  trackColor={{ true: colors.purple, false: colors.border }}
                />
              }
            />
          </View>
        </View>

        <Pressable onPress={confirmDeleteAccount}>
          <Text style={styles.deleteLink}>Delete my account</Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  title: { fontFamily: fonts.display, fontSize: 21, color: colors.ink },
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
  group: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: colors.textTertiary,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: 15,
  },
  rowLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.ink },
  verified: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textTertiary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderMuted,
    marginHorizontal: spacing.md,
  },
  deleteLink: {
    textAlign: "center",
    fontFamily: fonts.bodySemiBold,
    fontSize: 13.5,
    color: colors.rose,
  },
});
