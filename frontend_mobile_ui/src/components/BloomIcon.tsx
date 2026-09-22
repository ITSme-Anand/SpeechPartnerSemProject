import React from "react";
import Svg, { Circle, Path } from "react-native-svg";

import { colors } from "@/theme/tokens";

interface BloomIconProps {
  size?: number;
  color?: string;
  centerColor?: string;
}

/** The four-petal bloom mark used as the app's brand motif — reused on
 * Onboarding, Home, the Live Session mic button, Processing, and the
 * garden strip. Matches the path data from the design artifact exactly. */
export function BloomIcon({
  size = 24,
  color = colors.purple,
  centerColor = colors.mimosa,
}: BloomIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.5c2.2 3.4 5.1 5.4 8.7 6.4C17.3 10.4 14.4 12.9 12 17.5 9.6 12.9 6.7 10.4 3.3 8.9 6.9 7.9 9.8 5.9 12 2.5Z"
        fill={color}
      />
      <Circle cx={12} cy={9.6} r={1.9} fill={centerColor} />
    </Svg>
  );
}
