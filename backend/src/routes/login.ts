import type { AppContext } from "../lib/db.js";
import { rateLimited } from "../lib/db.js";
import { verifyPassword } from "../lib/password.js";
import { isRecord, isString } from "../lib/validators.js";

type LoginRequestBody = {
  username?: unknown;
  password_hash?: unknown;
};

export const loginHandler = async (c: AppContext) => {
  let body: LoginRequestBody;
  try {
    const json = await c.req.json();
    if (!isRecord(json)) {
      return c.json({ success: false, message: "不正なパラメーターです" }, 400);
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

  const limited = await rateLimited(c, c.env.LOGIN_LIMITER);
  if (limited) return limited;

  const profile = await c.env.DB.prepare(
    "SELECT id, username, password_hash FROM profiles WHERE username = ?",
  )
    .bind(username)
    .first<{ id: string; username: string; password_hash: string }>();

  if (!profile || !(await verifyPassword(password_hash, profile.password_hash))) {
    return c.json({ success: false, message: "ログインに失敗しました" }, 401);
  }

  return c.json({
    success: true,
    message: "ログインに成功しました",
    id: profile.id,
    username: profile.username,
  });
};

export default loginHandler;
