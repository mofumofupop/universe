import type { AppContext } from "../lib/db.js";
import { isUniqueViolation, rateLimited } from "../lib/db.js";
import { toStoredHash } from "../lib/password.js";
import {
  getOptionalString,
  getOptionalUrlArray,
  isRecord,
  isString,
} from "../lib/validators.js";

type RegisterRequestBody = {
  username?: unknown;
  name?: unknown;
  affiliation?: unknown;
  icon_url?: unknown;
  social_links?: unknown;
  friends?: unknown;
  password_hash?: unknown;
};

export const registerHandler = async (c: AppContext) => {
  let body: RegisterRequestBody;
  try {
    const json = await c.req.json();
    if (!isRecord(json)) {
      return c.json(
        { success: false, message: "パラメーターが不足しています" },
        400,
      );
    }
    body = json;
  } catch {
    return c.json({ success: false, message: "不正なJSONです" }, 400);
  }

  const username = body.username;
  const password_hash = body.password_hash;

  if (!isString(username) || username.trim() === "") {
    return c.json(
      { success: false, message: "パラメーターが不足しています" },
      400,
    );
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return c.json(
      {
        success: false,
        message: "ユーザー名は英小文字、数字、アンダーバーのみ使用できます",
      },
      400,
    );
  }
  if (username.length > 15) {
    return c.json(
      { success: false, message: "ユーザー名は15文字以内で指定してください" },
      400,
    );
  }
  if (!isString(password_hash) || password_hash.trim() === "") {
    return c.json(
      { success: false, message: "パラメーターが不足しています" },
      400,
    );
  }

  const name = getOptionalString(body.name);
  const affiliation = getOptionalString(body.affiliation);
  // icon_url is set by /api/icon
  const social_links = getOptionalUrlArray(body.social_links);
  if (social_links === null) {
    return c.json(
      { success: false, message: "social_links の形式が不正です" },
      400,
    );
  }
  if (social_links.length < 1 || social_links.length > 5) {
    return c.json(
      {
        success: false,
        message: "social_links は1個以上5個以下で指定してください",
      },
      400,
    );
  }

  const limited = await rateLimited(c, c.env.REGISTER_LIMITER);
  if (limited) return limited;

  const id = crypto.randomUUID();
  try {
    await c.env.DB.prepare(
      `INSERT INTO profiles (id, username, name, affiliation, social_links, password_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        username,
        name,
        affiliation,
        JSON.stringify(social_links),
        await toStoredHash(password_hash),
      )
      .run();
  } catch (err) {
    if (isUniqueViolation(err)) {
      return c.json(
        { success: false, message: "ユーザー名が既に使用されています" },
        409,
      );
    }
    console.error(err);
    return c.json({ success: false, message: "登録に失敗しました" }, 500);
  }

  return c.json({
    success: true,
    message: "登録完了",
    id,
    username,
  });
};
