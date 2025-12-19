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

  if (!isString(qr) || qr.trim() === "")
    return c.json({ success: false, message: "qr が不足しています" }, 400);

  const hasId = isString(id) && isUuidString(id);
  const hasPassword = isString(password_hash) && password_hash.trim() !== "";

  if (hasId !== hasPassword) {
    return c.json({ success: false, message: "不正なリクエストです" }, 400);
  }

  const isViewMode = !hasId && !hasPassword;

  const supabase = createSupabaseClient();
  if (!supabase)
    return c.json(
      { success: false, message: "サーバー設定が不足しています" },
      500,
    );

  let me: any = null;
  if (!isViewMode) {
    const { data: meData, error: meErr } = await supabase
      .from("profiles")
      .select("id,username,password_hash,friends")
      .eq("id", id)
      .single();
    if (meErr || !meData)
      return c.json({ success: false, message: "認証に失敗しました" }, 401);
    if ((meData as any).password_hash !== password_hash)
      return c.json({ success: false, message: "認証に失敗しました" }, 401);
    me = meData;
  }

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
  if (!isViewMode && otherId === id)
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

  if (isViewMode) {
    return c.json({
      success: true,
      message: "名刺を見せてもらいました",
      id: null,
      username: null,
      new: { id: other.id, username: other.username },
    });
  }

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
