import * as SecureStore from "expo-secure-store";

/**
 * Supabase-compatible storage adapter backed by expo-secure-store (iOS
 * Keychain / Android Keystore) instead of AsyncStorage, so session/refresh
 * tokens are encrypted at rest on-device rather than sitting in plain
 * on-disk key-value storage.
 *
 * SecureStore keys must match /^[A-Za-z0-9._-]+$/, so Supabase's own
 * storage keys (which use characters like ':') are sanitized before use.
 */
function sanitizeKey(key: string): string {
  return key.replace(/[^A-Za-z0-9._-]/g, "_");
}

export const secureStorageAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(sanitizeKey(key)),
  setItem: (key: string, value: string) =>
    SecureStore.setItemAsync(sanitizeKey(key), value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(sanitizeKey(key)),
};
