import type { AppContext } from "../lib/db.js";
import { authenticate } from "../lib/db.js";
import { isRecord, isString, isUuidString } from "../lib/validators.js";
import { QR_TTL_MS } from "./qr.js";

type ProfileSummary = { id: string; username: string; name: string | null };

export const exchangeHandler = async (c: AppContext) => {
  let body: Record<string, unknown>;
  try {
    const json = await c.req.json();
    if (!isRecord(json))
      return c.json({ success: false, message: "不正なパラメーターです" }, 400);
    body = json;
  } catch {
    return c.json({ success: false, message: "不正なJSONです" }, 400);
  }

  const id = body.id;
  const password_hash = body.password_hash;
  const qr = body.qr;

  if (!isString(qr) || qr.trim() === "")
    return c.json({ success: false, message: "qr が不足しています" }, 400);

  const hasId = isString(id) && isUuidString(id);
  const hasPassword = isString(password_hash) && password_hash.trim() !== "";

  if (hasId !== hasPassword) {
    return c.json({ success: false, message: "不正なリクエストです" }, 400);
  }

  const db = c.env.DB;
  const selectProfile = db.prepare(
    "SELECT id, username, name FROM profiles WHERE id = ?",
  );

  let me: ProfileSummary | null = null;
  if (hasId && hasPassword) {
    if (!(await authenticate(db, id, password_hash)))
      return c.json({ success: false, message: "認証に失敗しました" }, 401);
    me = await selectProfile.bind(id).first<ProfileSummary>();
    if (!me)
      return c.json({ success: false, message: "認証に失敗しました" }, 401);
  }

  const qrRow = await db
    .prepare("SELECT id, created_at FROM qrs WHERE qr = ?")
    .bind(qr)
    .first<{ id: string; created_at: number }>();
  if (!qrRow)
    return c.json({ success: false, message: "相手が見つかりません" }, 400);

  if (Date.now() - qrRow.created_at >= QR_TTL_MS)
    return c.json(
      { success: false, message: "QRコードの有効期限が切れています" },
      400,
    );

  if (me && qrRow.id === me.id)
    return c.json(
      { success: false, message: "自分自身との交換はできません" },
      400,
    );

  const other = await selectProfile.bind(qrRow.id).first<ProfileSummary>();
  if (!other)
    return c.json(
      { success: false, message: "相手のプロフィールが見つかりません" },
      400,
    );

  const newFriend = { id: other.id, username: other.username, name: other.name };

  if (!me) {
    return c.json({
      success: true,
      message: "名刺を見せてもらいました",
      id: null,
      username: null,
      new: newFriend,
    });
  }

  const addFriend = db.prepare(
    "INSERT OR IGNORE INTO friendships (user_id, friend_id) VALUES (?, ?)",
  );
  await db.batch([
    addFriend.bind(me.id, other.id),
    addFriend.bind(other.id, me.id),
    db.prepare("DELETE FROM qrs WHERE id = ? AND qr = ?").bind(other.id, qr),
  ]);

  return c.json({
    success: true,
    message: "名刺を交換しました",
    id: me.id,
    username: me.username,
    new: newFriend,
  });
};

export default exchangeHandler;
