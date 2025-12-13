import { Hono } from "hono";
import { createClient } from "@supabase/supabase-js";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

const getEnv = (key: keyof Env): string => {
  const envFromProcess = (globalThis as unknown as { process?: any }).process
    ?.env?.[key] as string | undefined;

  const value = envFromProcess;
  if (!value) {
    throw new Error(`Missing env: ${String(key)}`);
  }
  return value;
};

type Member = {
  id: number;
  name: string;
  role: string;
  avatar_url: string | null;
  tw_url: string | null;
};

const app = new Hono();

app.get("/", (c) => {
  return c.json({ message: "API is running" });
});

export default app;
