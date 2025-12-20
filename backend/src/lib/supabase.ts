import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabase: SupabaseClient | null = null;

const getSupabaseClient = () => {
  if (supabase) {
    return supabase;
  }

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    if (!url) {
      console.error("SUPABASE_URL is missing or undefined");
    }
    if (!anonKey) {
      console.error("SUPABASE_ANON_KEY is missing or undefined");
    }
    return null;
  }
  supabase = createClient(url, anonKey);
  return supabase;
};

export const createSupabaseClient = () => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error("Failed to create Supabase client");
  }
  return client;
};
