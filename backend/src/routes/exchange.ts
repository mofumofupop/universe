import type { Context } from "hono";
import { createSupabaseClient } from "../lib/supabase.js";
import { isRecord, isString, isUuidString } from "../lib/validators.js";

export const exchangeHandler = async (c: Context) => {
  let body: unknown;
  try {
    const json = await c.req.json();
    if (!isRecord(json))
      return c.json({ success: false, message: "不正なパラメーターです" }, 400);
    body = json;
  } catch {
    return c.json({ success: false, message: "不正なJSONです" }, 400);
  }

  const id = (body as any).id;
  const password_hash = (body as any).password_hash;
  const qr = (body as any).qr;
  if (!isString(id) || !isUuidString(id))
    return c.json({ success: false, message: "id が不正です" }, 400);
  if (!isString(password_hash) || password_hash.trim() === "")
    return c.json(
      { success: false, message: "password_hash が不足しています" },
      400,
    );
  if (!isString(qr) || qr.trim() === "")
    return c.json({ success: false, message: "qr が不足しています" }, 400);

  const supabase = createSupabaseClient(c);
  if (!supabase)
    return c.json(
      { success: false, message: "サーバー設定が不足しています" },
      500,
    );

  const { data: me, error: meErr } = await supabase
    .from("profiles")
    .select("id,username,password_hash,friends")
    .eq("id", id)
    .single();
  if (meErr || !me)
    return c.json({ success: false, message: "認証に失敗しました" }, 401);
  if ((me as any).password_hash !== password_hash)
    return c.json({ success: false, message: "認証に失敗しました" }, 401);

  const { data: qrRow, error: qrErr } = await supabase
    .from("qrs")
    .select("id,qr,created_at")
    .eq("qr", qr)
    .single();
  if (qrErr || !qrRow)
    return c.json({ success: false, message: "相手が見つかりません" }, 400);

  const created = new Date(qrRow.created_at).getTime();
  const now = Date.now();
  const FIVE_MIN_MS = 5 * 60 * 1000;
  if (now - created >= FIVE_MIN_MS)
    return c.json(
      { success: false, message: "QRコードの有効期限が切れています" },
      400,
    );

  const otherId = qrRow.id as string;
  if (otherId === id)
    return c.json(
      { success: false, message: "自分自身との交換はできません" },
      400,
    );

  const { data: other, error: otherErr } = await supabase
    .from("profiles")
    .select("id,username,friends")
    .eq("id", otherId)
    .single();
  if (otherErr || !other)
    return c.json(
      { success: false, message: "相手のプロフィールが見つかりません" },
      400,
    );

  const meFriends = Array.isArray((me as any).friends)
    ? (me as any).friends
    : [];
  const otherFriends = Array.isArray((other as any).friends)
    ? (other as any).friends
    : [];

  const meFriendObj = { id: other.id, username: other.username };
  const otherFriendObj = { id: me.id, username: me.username };

  const addIfMissing = (arr: any[], obj: any) => {
    return arr.some((f) => f && f.id === obj.id) ? arr : [...arr, obj];
  };

  const newMeFriends = addIfMissing(meFriends, meFriendObj);
  const newOtherFriends = addIfMissing(otherFriends, otherFriendObj);

  const { error: updateMeErr } = await supabase
    .from("profiles")
    .update({ friends: newMeFriends })
    .eq("id", id);
  if (updateMeErr)
    return c.json(
      { success: false, message: "プロフィール更新に失敗しました" },
      500,
    );

  const { error: updateOtherErr } = await supabase
    .from("profiles")
    .update({ friends: newOtherFriends })
    .eq("id", otherId);
  if (updateOtherErr)
    return c.json(
      { success: false, message: "プロフィール更新に失敗しました" },
      500,
    );

  const { error: delErr } = await supabase
    .from("qrs")
    .delete()
    .eq("id", otherId)
    .eq("qr", qr);
  if (delErr) {
    console.error("Failed to delete used QR:", delErr);
    return c.json(
      {
        success: true,
        message: "名刺を交換しました",
        id: me.id,
        username: me.username,
        new: { id: other.id, username: other.username },
      },
      200,
    );
  }

  return c.json(
    {
      success: true,
      message: "名刺を交換しました",
      id: me.id,
      username: me.username,
      new: { id: other.id, username: other.username },
    },
    200,
  );
};

export default exchangeHandler;
