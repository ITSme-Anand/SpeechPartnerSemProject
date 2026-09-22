import {
  useFonts as useFraunces,
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
} from "@expo-google-fonts/fraunces";
import {
  useFonts as usePlusJakartaSans,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";

/** Loads the two brand typefaces used throughout the design (Fraunces for
 * display headings, Plus Jakarta Sans for everything else). Returns false
 * until both font families have finished loading. */
export function useAppFonts(): boolean {
  const [jakartaLoaded] = usePlusJakartaSans({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [frauncesLoaded] = useFraunces({
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
  });

  return jakartaLoaded && frauncesLoaded;
}
