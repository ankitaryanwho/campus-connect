import { isLiquidGlassAvailable } from "expo-glass-effect";
export function checkLiquidGlass(): boolean {
  try {
    return isLiquidGlassAvailable();
  } catch {
    return false;
  }
}
