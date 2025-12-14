import { createClient } from "@supabase/supabase-js";
import type { Context } from "hono";
import {
  getOptionalString,
  getOptionalStringArray,
  isRecord,
  isString,
} from "../lib/validators.js";

interface Env {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

type RegisterRequestBody = {
  username?: unknown;
  name?: unknown;
  affiliation?: unknown;
  icon_url?: unknown;
  social_links?: unknown;
  friends?: unknown;
  password_hash?: unknown;
};

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

const createSupabaseClient = (c: Context) => {
  const url = getRuntimeEnv(c, "SUPABASE_URL");
  const anonKey = getRuntimeEnv(c, "SUPABASE_ANON_KEY");
  if (!url || !anonKey) return null;
  return createClient(url, anonKey);
};

export const registerHandler = async (c: Context) => {
  let body: RegisterRequestBody;
  try {
    const json = await c.req.json();
    if (!isRecord(json)) {
      return c.json(
        { success: false, message: "パラメーターが不足しています" },
        400,
      );
    }
    body = json;
  } catch {
    return c.json({ success: false, message: "不正なJSONです" }, 400);
  }

  const username = body.username;
  const password_hash = body.password_hash;

  if (!isString(username) || username.trim() === "") {
    return c.json(
      { success: false, message: "パラメーターが不足しています" },
      400,
    );
  }
  if (!isString(password_hash) || password_hash.trim() === "") {
    return c.json(
      { success: false, message: "パラメーターが不足しています" },
      400,
    );
  }

  const name = getOptionalString(body.name);
  const affiliation = getOptionalString(body.affiliation);
  const icon_url = getOptionalString(body.icon_url);
  const social_links = getOptionalStringArray(body.social_links);
  if (social_links === null) {
    return c.json(
      { success: false, message: "social_links の形式が不正です" },
      400,
    );
  }

  const friends = getOptionalStringArray(body.friends);
  if (friends === null) {
    return c.json({ success: false, message: "friends の形式が不正です" }, 400);
  }

  const id = crypto.randomUUID();
  const supabase = createSupabaseClient(c);
  if (!supabase) {
    return c.json(
      {
        success: false,
        message:
          "サーバー設定が不足しています (SUPABASE_URL / SUPABASE_ANON_KEY)",
      },
      500,
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      id,
      username,
      name,
      affiliation,
      icon_url,
      social_links,
      friends,
      password_hash,
    })
    .select("id,username")
    .single();

  if (error) {
    if (error.code === "23505") {
      return c.json(
        { success: false, message: "ユーザー名が既に使用されています" },
        409,
      );
    }
    return c.json({ success: false, message: "登録に失敗しました" }, 500);
  }

  return c.json({
    success: true,
    message: "登録完了",
    id: data.id,
    username: data.username,
  });
};
