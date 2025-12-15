import type { Context } from "hono";
import { createSupabaseClient } from "../lib/supabase.js";
import { isRecord, isString, isUuidString } from "../lib/validators.js";

const randomString = (length = 28) => {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let out = "";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  for (let i = 0; i < length; i++) {
    out += chars[arr[i] % chars.length];
  }
  return out;
};

export const qrHandler = async (c: Context) => {
  let body: unknown;
  try {
    const json = await c.req.json();
    if (!isRecord(json)) {
      return c.json({ success: false, message: "不正なパラメーターです" }, 400);
    }
    body = json;
  } catch {
    return c.json({ success: false, message: "不正なJSONです" }, 400);
  }

  const id = (body as any).id;
  const password_hash = (body as any).password_hash;
  if (!isString(id) || !isUuidString(id)) {
    return c.json({ success: false, message: "id が不正です" }, 400);
  }
  if (!isString(password_hash) || password_hash.trim() === "") {
    return c.json(
      { success: false, message: "password_hash が不足しています" },
      400,
    );
  }

  const supabase = createSupabaseClient(c);
  if (!supabase) {
    return c.json(
      { success: false, message: "サーバー設定が不足しています" },
      500,
    );
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id,password_hash")
    .eq("id", id)
    .single();
  if (profileErr || !profile) {
    return c.json({ success: false, message: "認証に失敗しました" }, 401);
  }
  if ((profile as any).password_hash !== password_hash) {
    return c.json({ success: false, message: "認証に失敗しました" }, 401);
  }

  const { data: existing, error: existingErr } = await supabase
    .from("qrs")
    .select("qr,created_at")
    .eq("id", id)
    .maybeSingle();
  if (existingErr) {
    return c.json({ success: false, message: "QR 取得に失敗しました" }, 500);
  }

  const FIVE_MIN_MS = 5 * 60 * 1000;
  if (existing && existing.qr && existing.created_at) {
    const created = new Date(existing.created_at).getTime();
    const now = Date.now();
    if (now - created < FIVE_MIN_MS) {
      return c.json({
        success: true,
        message: "情報を送信します",
        qr: existing.qr,
      });
    }
    for (let attempt = 0; attempt < 5; attempt++) {
      const newQr = randomString(28);
      const { data: updated, error: updateErr } = await supabase
        .from("qrs")
        .update({ qr: newQr, created_at: new Date().toISOString() })
        .eq("id", id)
        .select("qr,created_at")
        .single();
      if (!updateErr && updated) {
        return c.json({
          success: true,
          message: "情報を送信します",
          qr: updated.qr,
        });
      }
      if (updateErr && (updateErr.code as any) !== "23505") {
        return c.json(
          { success: false, message: "QR 更新に失敗しました" },
          500,
        );
      }
    }
    return c.json(
      { success: false, message: "QR の更新が多重に失敗しました" },
      500,
    );
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const qr = randomString(28);
    const { data, error } = await supabase
      .from("qrs")
      .insert({ id: id, qr })
      .select("qr")
      .single();
    if (!error && data) {
      return c.json({
        success: true,
        message: "情報を送信します",
        qr: data.qr,
      });
    }
    if (error && (error.code as any) !== "23505") {
      return c.json(
        { success: false, message: "QR の生成に失敗しました" },
        500,
      );
    }
  }
  return c.json(
    { success: false, message: "QR の生成が多重に失敗しました" },
    500,
  );
};

export default qrHandler;
