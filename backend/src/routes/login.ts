import type { Context } from "hono";
import { createSupabaseClient } from "../lib/supabase.js";
import { isRecord, isString } from "../lib/validators.js";

type LoginRequestBody = {
  username?: unknown;
  password_hash?: unknown;
};

export const loginHandler = async (c: Context) => {
  let body: LoginRequestBody;
  try {
    const json = await c.req.json();
    if (!isRecord(json)) {
      return c.json(
        { success: false, message: "不正なパラメーターです" },
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
      { success: false, message: "username が不足しています" },
      400,
    );
  }
  if (!isString(password_hash) || password_hash.trim() === "") {
    return c.json(
      { success: false, message: "password_hash が不足しています" },
      400,
    );
  }

  const supabase = createSupabaseClient();
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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id,username,password_hash")
    .eq("username", username)
    .maybeSingle();

  if (error || !profile) {
    return c.json(
      { success: false, message: "ログインに失敗しました" },
      401,
    );
  }

  if (profile.password_hash !== password_hash) {
    return c.json(
      { success: false, message: "ログインに失敗しました" },
      401,
    );
  }

  return c.json({
    success: true,
    message: "ログインに成功しました",
    id: profile.id,
    username: profile.username,
  });
};

export default loginHandler;
