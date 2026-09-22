/**
 * Design tokens mirrored from the "Grammar Partner Cards" design artifact.
 * Keep this the single source of truth for color/spacing/radius — screens
 * should reference these, not inline hex values, so the palette can be
 * retuned (e.g. for dark mode) in one place.
 */

export const colors = {
  purple: "#C69FD5",
  purpleDeep: "#9C6FB0",
  mimosa: "#FDFDC9",
  ink: "#2B2233",
  inkDeep: "#1A1420",
  paper: "#F5F1F7",
  paperWarm: "#FBF6EE",
  sage: "#A8C4A2",
  sageDeep: "#6F8F68",
  rose: "#D98BAE",
  white: "#FFFFFF",

  // Frequently reused derived tones from the mockups
  textSecondary: "#5b5164",
  textTertiary: "#8a7f92",
  textFaint: "#B6ACBE",
  border: "#E3DCE9",
  borderMuted: "#EEE8F0",
  tabTrack: "#EDE7F3",
  successTint: "#E8F0E6",
  accentTint: "#F2E4F8",
} as const;

export const gradients = {
  primaryButton: [colors.purple, colors.purpleDeep] as const,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 22,
  pill: 999,
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 24,
};

export const shadows = {
  card: {
    shadowColor: colors.ink,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  button: {
    shadowColor: colors.purpleDeep,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
};

export const fonts = {
  display: "Fraunces_600SemiBold",
  displayItalic: "Fraunces_600SemiBold_Italic",
  body: "PlusJakartaSans_400Regular",
  bodyMedium: "PlusJakartaSans_500Medium",
  bodySemiBold: "PlusJakartaSans_600SemiBold",
  bodyBold: "PlusJakartaSans_700Bold",
  bodyExtraBold: "PlusJakartaSans_800ExtraBold",
};
