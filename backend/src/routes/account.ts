import type { Context } from "hono";
import { createSupabaseClient } from "../lib/supabase.js";
import { isRecord, isString, isUuidString } from "../lib/validators.js";

type AccountRequestBody = {
  id?: unknown;
  password_hash?: unknown;
};

const badRequest = (c: Context) => {
  return c.json({ success: false, message: "情報が間違っています" }, 400);
};

export const accountHandler = async (c: Context) => {
  let body: AccountRequestBody;
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

  if (!isString(id) || !isUuidString(id)) return badRequest(c);
  if (!isString(password_hash) || password_hash.trim() === "")
    return badRequest(c);

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
    .select("id,username,name,icon_url,friends,password_hash")
    .eq("id", id)
    .maybeSingle();

  if (error || !profile) return badRequest(c);
  if (profile.password_hash !== password_hash) return badRequest(c);

  const friends = Array.isArray(profile.friends) ? profile.friends : [];

  // friends は [{id, username}, ...] の配列
  const friendIds = friends.map((f: any) => f.id).filter(Boolean);

  let friendsFriends: Record<string, string[]> = {};
  if (friendIds.length > 0) {
    const { data: rows, error: friendsError } = await supabase
      .from("profiles")
      .select("id,username,friends")
      .in("id", friendIds);

    if (friendsError) {
      return c.json({ success: false, message: "取得に失敗しました" }, 500);
    }

    friendsFriends = Object.fromEntries(
      (rows ?? []).map((r: any) => [
        r.username,
        Array.isArray(r.friends)
          ? r.friends.map((ff: any) => ff.username).filter(Boolean)
          : [],
      ]),
    );
  }

  return c.json({
    success: true,
    message: "情報を送信します",
    id: profile.id,
    username: profile.username,
    name: profile.name,
    icon_url: profile.icon_url,
    friends,
    friends_friends: friendsFriends,
  });
};
