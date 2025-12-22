import type { Context } from "hono";
import { createSupabaseClient } from "../lib/supabase.js";
import {
  getOptionalString,
  getOptionalUrlArray,
  isRecord,
  isString,
  isUuidString,
} from "../lib/validators.js";

type ChangeRequestBody = {
  id?: unknown;
  password_hash?: unknown;
  name?: unknown;
  affiliation?: unknown;
  social_links?: unknown;
};

export const changeHandler = async (c: Context) => {
  let body: ChangeRequestBody;
  try {
    const json = await c.req.json();
    if (!isRecord(json)) {
      return c.json({ success: false, message: "不正なパラメーターです" }, 400);
    }
    body = json;
  } catch {
    return c.json({ success: false, message: "不正なJSONです" }, 400);
  }

  const id = body.id;
  const password_hash = body.password_hash;

  if (!isString(id) || !isUuidString(id)) {
    return c.json({ success: false, message: "id が不正です" }, 400);
  }
  if (!isString(password_hash) || password_hash.trim() === "") {
    return c.json(
      { success: false, message: "password_hash が不足しています" },
      400,
    );
  }

  if ((body as any).username !== undefined) {
    return c.json(
      { success: false, message: "username は変更できません" },
      400,
    );
  }

  const name = getOptionalString(body.name);
  const affiliation = getOptionalString(body.affiliation);
  const social_links = getOptionalUrlArray(body.social_links);
  if (social_links === null) {
    return c.json(
      { success: false, message: "social_links の形式が不正です" },
      400,
    );
  }
  if (social_links.length > 5) {
    return c.json(
      { success: false, message: "social_links は最大5個です" },
      400,
    );
  }

  if ((body as any).friends !== undefined) {
    return c.json({ success: false, message: "friends は変更できません" }, 400);
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

  const { data: profile, error: fetchErr } = await supabase
    .from("profiles")
    .select("id,username,password_hash")
    .eq("id", id as string)
    .maybeSingle();

  if (fetchErr || !profile) {
    return c.json({ success: false, message: "認証に失敗しました" }, 401);
  }
  if (profile.password_hash !== password_hash) {
    return c.json({ success: false, message: "認証に失敗しました" }, 401);
  }

  const updatePayload: Record<string, unknown> = {};
  if (name !== null) updatePayload.name = name;
  if (affiliation !== null) updatePayload.affiliation = affiliation;
  if (social_links.length > 0) updatePayload.social_links = social_links;

  if (Object.keys(updatePayload).length === 0) {
    return c.json(
      { success: false, message: "更新するデータがありません" },
      400,
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", id as string)
    .select("id,username")
    .single();

  if (error) {
    if (error.code === "23505") {
      return c.json(
        { success: false, message: "ユーザー名が既に使用されています" },
        409,
      );
    }
    return c.json({ success: false, message: "更新に失敗しました" }, 500);
  }

  return c.json({
    success: true,
    message: "更新完了",
    id: data.id,
    username: data.username,
  });
};
