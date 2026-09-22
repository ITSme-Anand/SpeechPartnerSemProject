import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  ColorValue,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";

import { colors, fonts, radius, shadows } from "@/theme/tokens";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: "primary" | "dark";
}

/** The pill-shaped purple gradient CTA used on nearly every screen. */
export function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  icon,
  style,
  variant = "primary",
}: PrimaryButtonProps) {
  const isDisabled = disabled || loading;
  const gradientColors: readonly [ColorValue, ColorValue] =
    variant === "primary"
      ? [colors.purple, colors.purpleDeep]
      : [colors.inkDeep, colors.ink];

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed }) => [
        { opacity: isDisabled ? 0.6 : pressed ? 0.85 : 1 },
        style,
      ]}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.button, shadows.button]}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <View style={styles.content}>
            <Text style={styles.label}>{label}</Text>
            {icon}
          </View>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 58,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  label: {
    color: colors.white,
    fontFamily: fonts.bodyBold,
    fontSize: 16,
  },
});
