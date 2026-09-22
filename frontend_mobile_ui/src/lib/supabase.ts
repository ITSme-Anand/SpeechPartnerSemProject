import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

import { env } from "./env";
import { secureStorageAdapter } from "./secureStorage";

/**
 * Single shared Supabase client. Session tokens persist through
 * secureStorageAdapter (Keychain/Keystore) rather than AsyncStorage.
 * `detectSessionInUrl` is off because there is no browser URL on native.
 *
 * In mock mode this client is still created (Supabase tolerates a bogus
 * URL/key until a request is actually made) but nothing in the app calls
 * it — see src/services, which route through fixtures instead.
 */
export const supabase = createClient(
  env.supabaseUrl || "https://placeholder.supabase.co",
  env.supabaseAnonKey || "placeholder-anon-key",
  {
    auth: {
      storage: secureStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
