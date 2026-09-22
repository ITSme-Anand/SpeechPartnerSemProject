import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/theme/tokens";

interface ScreenContainerProps {
  children: React.ReactNode;
  background?: string;
  style?: StyleProp<ViewStyle>;
  edges?: ("top" | "bottom" | "left" | "right")[];
}

/** Shared full-screen wrapper so every screen respects safe areas and picks
 * up the correct background instead of repeating this boilerplate. */
export function ScreenContainer({
  children,
  background = colors.paper,
  style,
  edges,
}: ScreenContainerProps) {
  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: background }]}
      edges={edges}
    >
      <View style={[styles.flex, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
