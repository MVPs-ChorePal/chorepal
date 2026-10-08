import Constants from "expo-constants";
import { Platform } from "react-native";

// Dev-only convenience: a relative fetch('/api/...') resolves fine on web
// (same origin as the dev server) but not on native, which needs the dev
// server's actual host. Once real hosting is chosen, this should read a
// configured production base URL instead.
export function getApiUrl(path: string) {
  if (Platform.OS === "web") return path;
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) return path;
  return `http://${hostUri}${path}`;
}
