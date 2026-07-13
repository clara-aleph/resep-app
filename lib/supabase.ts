import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function isSupabaseConfigured() {
  return Boolean(url && publishableKey);
}

/**
 * Returns the browser-safe Supabase client. Keep service-role keys on the server only.
 */
export function createSupabaseClient() {
  if (!url || !publishableKey) {
    throw new Error("Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local.");
  }

  return createClient(url, publishableKey);
}
