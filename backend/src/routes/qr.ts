import type { AppContext } from "../lib/db.js";
import { authenticate, isUniqueViolation } from "../lib/db.js";
import { isRecord, isString, isUuidString } from "../lib/validators.js";

export const QR_TTL_MS = 5 * 60 * 1000;

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

export const qrHandler = async (c: AppContext) => {
  let body: Record<string, unknown>;
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

  const db = c.env.DB;
  if (!(await authenticate(db, id, password_hash))) {
    return c.json({ success: false, message: "認証に失敗しました" }, 401);
  }

  const existing = await db
    .prepare("SELECT qr, created_at FROM qrs WHERE id = ?")
    .bind(id)
    .first<{ qr: string; created_at: number }>();
  if (existing && Date.now() - existing.created_at < QR_TTL_MS) {
    return c.json({
      success: true,
      message: "情報を送信します",
      qr: existing.qr,
    });
  }

  // Retry on the unlikely collision with another user's live QR string
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const row = await db
        .prepare(
          `INSERT INTO qrs (id, qr, created_at) VALUES (?, ?, ?)
           ON CONFLICT (id) DO UPDATE SET qr = excluded.qr, created_at = excluded.created_at
           RETURNING qr`,
        )
        .bind(id, randomString(28), Date.now())
        .first<{ qr: string }>();
      if (row) {
        return c.json({
          success: true,
          message: "情報を送信します",
          qr: row.qr,
        });
      }
    } catch (err) {
      if (!isUniqueViolation(err)) {
        console.error(err);
        return c.json(
          { success: false, message: "QR の生成に失敗しました" },
          500,
        );
      }
    }
  }
  return c.json(
    { success: false, message: "QR の生成が多重に失敗しました" },
    500,
  );
};

export default qrHandler;
