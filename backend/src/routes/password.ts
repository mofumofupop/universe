import type { AppContext } from "../lib/db.js";
import { authenticate, rateLimited } from "../lib/db.js";
import { toStoredHash } from "../lib/password.js";
import { isRecord, isString, isUuidString } from "../lib/validators.js";

/** Replaces the password. Both values are client-derived keys (see frontend/src/lib/password.ts). */
export const passwordHandler = async (c: AppContext) => {
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

  const { id, password_hash, new_password_hash } = body;
  if (!isString(id) || !isUuidString(id)) {
    return c.json({ success: false, message: "id が不正です" }, 400);
  }
  if (!isString(password_hash) || password_hash.trim() === "") {
    return c.json(
      { success: false, message: "password_hash が不足しています" },
      400,
    );
  }
  if (!isString(new_password_hash) || new_password_hash.trim() === "") {
    return c.json(
      { success: false, message: "new_password_hash が不足しています" },
      400,
    );
  }

  const limited = await rateLimited(c, c.env.LOGIN_LIMITER);
  if (limited) return limited;

  const db = c.env.DB;
  if (!(await authenticate(db, id, password_hash))) {
    return c.json({ success: false, message: "認証に失敗しました" }, 401);
  }

  await db
    .prepare("UPDATE profiles SET password_hash = ? WHERE id = ?")
    .bind(await toStoredHash(new_password_hash), id)
    .run();

  return c.json({ success: true, message: "パスワードを変更しました" });
};
