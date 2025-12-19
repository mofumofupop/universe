import type { Context } from "hono";
import { createSupabaseClient } from "../lib/supabase.js";
import { isRecord, isString, isUuidString } from "../lib/validators.js";

type UserRequestBody = {
  target?: unknown;
  id?: unknown;
  password_hash?: unknown;
};

export const userHandler = async (c: Context) => {
  const target = c.req.query("target");
  const id = c.req.query("id");
  const password_hash = c.req.query("password_hash");

  if (!isString(target) || !isUuidString(target)) {
    return c.json({ success: false, message: "target が不正です" }, 400);
  }

  const hasId = isString(id) && isUuidString(id);
  const hasPassword = isString(password_hash) && password_hash.trim() !== "";

  if (hasId !== hasPassword) {
    return c.json(
      {
        success: false,
        message: "不正なリクエストです",
      },
      400,
    );
  }

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

  let isFriend = false;
  if (hasId && hasPassword) {
    const { data: requester, error: requesterErr } = await supabase
      .from("profiles")
      .select("id,password_hash,friends")
      .eq("id", id)
      .maybeSingle();

    if (requesterErr || !requester) {
      return c.json({ success: false, message: "認証に失敗しました" }, 401);
    }
    if (requester.password_hash !== password_hash) {
      return c.json({ success: false, message: "認証に失敗しました" }, 401);
    }

    const friends = Array.isArray(requester.friends) ? requester.friends : [];
    isFriend = friends.some((f: any) => f && f.id === target);
  }

  const { data: targetUser, error: targetErr } = await supabase
    .from("profiles")
    .select("id,username,name,affiliation,icon_url,social_links,friends")
    .eq("id", target)
    .maybeSingle();

  if (targetErr || !targetUser) {
    return c.json({ success: false, message: "取得できませんでした" }, 400);
  }

  const response: any = {
    success: true,
    message: "情報を送信します",
    id: targetUser.id,
    username: targetUser.username,
    name: targetUser.name,
    affiliation: targetUser.affiliation,
    icon_url: targetUser.icon_url,
    social_links: targetUser.social_links,
  };

  if (isFriend) {
    response.friends = targetUser.friends;
  }

  return c.json(response);
};

export default userHandler;
