import { createClient } from "@supabase/supabase-js";
import type { Context } from "hono";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

const getEnvFromProcess = (key: keyof Env): string | null => {
  const envFromProcess = (globalThis as unknown as { process?: any }).process
    ?.env?.[key] as string | undefined;
  if (typeof envFromProcess === "string" && envFromProcess)
    return envFromProcess;
  return null;
};

const getRuntimeEnv = (c: Context, key: keyof Env): string | null => {
  const envFromContext = (c as any)?.env?.[key] as string | undefined;
  if (typeof envFromContext === "string" && envFromContext)
    return envFromContext;
  return getEnvFromProcess(key);
};

export const createSupabaseClient = (c: Context) => {
  const url = getRuntimeEnv(c, "SUPABASE_URL");
  const anonKey = getRuntimeEnv(c, "SUPABASE_ANON_KEY");
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
};
