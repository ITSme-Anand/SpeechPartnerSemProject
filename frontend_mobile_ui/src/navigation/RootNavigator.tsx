import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import type { RootStackParamList } from "./types";

import { useAuth } from "@/context/AuthContext";
import { AuthScreen } from "@/screens/AuthScreen";
import { ChoosePracticeScreen } from "@/screens/ChoosePracticeScreen";
import { DrillScreen } from "@/screens/DrillScreen";
import { DurationScreen } from "@/screens/DurationScreen";
import { FeedbackScreen } from "@/screens/FeedbackScreen";
import { HomeScreen } from "@/screens/HomeScreen";
import { OnboardingScreen } from "@/screens/OnboardingScreen";
import { ProcessingScreen } from "@/screens/ProcessingScreen";
import { ReportScreen } from "@/screens/ReportScreen";
import { SessionScreen } from "@/screens/SessionScreen";
import { SettingsScreen } from "@/screens/SettingsScreen";

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Two independent stacks (signed-out vs signed-in) instead of one stack with
 * conditional screens: this stops a signed-out user from being deep-linked
 * or navigated back into an authenticated screen, which is a common source
 * of accidental data exposure in apps that gate on render logic alone.
 */
export function RootNavigator() {
  const { isReady, isSignedIn, hasAcceptedConsent } = useAuth();

  if (!isReady) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isSignedIn ? (
          <>
            {!hasAcceptedConsent && (
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            )}
            <Stack.Screen name="Auth" component={AuthScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen
              name="ChoosePractice"
              component={ChoosePracticeScreen}
            />
            <Stack.Screen name="Duration" component={DurationScreen} />
            <Stack.Screen name="Session" component={SessionScreen} />
            <Stack.Screen name="Processing" component={ProcessingScreen} />
            <Stack.Screen name="Feedback" component={FeedbackScreen} />
            <Stack.Screen name="Drill" component={DrillScreen} />
            <Stack.Screen name="Report" component={ReportScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
