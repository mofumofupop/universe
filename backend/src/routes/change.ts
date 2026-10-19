import type { AppContext } from "../lib/db.js";
import { authenticate } from "../lib/db.js";
import {
  getOptionalString,
  getOptionalUrlArray,
  isRecord,
  isString,
  isUuidString,
} from "../lib/validators.js";

type ChangeRequestBody = {
  id?: unknown;
  password_hash?: unknown;
  name?: unknown;
  affiliation?: unknown;
  social_links?: unknown;
  username?: unknown;
  friends?: unknown;
};

export const changeHandler = async (c: AppContext) => {
  let body: ChangeRequestBody;
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

  if (body.username !== undefined) {
    return c.json(
      { success: false, message: "username は変更できません" },
      400,
    );
  }

  const name = getOptionalString(body.name);
  const affiliation = getOptionalString(body.affiliation);
  const social_links = getOptionalUrlArray(body.social_links);
  if (social_links === null) {
    return c.json(
      { success: false, message: "social_links の形式が不正です" },
      400,
    );
  }
  if (social_links.length > 5) {
    return c.json(
      { success: false, message: "social_links は最大5個です" },
      400,
    );
  }

  if (body.friends !== undefined) {
    return c.json({ success: false, message: "friends は変更できません" }, 400);
  }

  const db = c.env.DB;
  if (!(await authenticate(db, id, password_hash))) {
    return c.json({ success: false, message: "認証に失敗しました" }, 401);
  }

  const columns: string[] = [];
  const values: string[] = [];
  if (name !== null) {
    columns.push("name = ?");
    values.push(name);
  }
  if (affiliation !== null) {
    columns.push("affiliation = ?");
    values.push(affiliation);
  }
  if (social_links.length > 0) {
    columns.push("social_links = ?");
    values.push(JSON.stringify(social_links));
  }

  if (columns.length === 0) {
    return c.json(
      { success: false, message: "更新するデータがありません" },
      400,
    );
  }

  const updated = await db
    .prepare(
      `UPDATE profiles SET ${columns.join(", ")} WHERE id = ? RETURNING id, username`,
    )
    .bind(...values, id)
    .first<{ id: string; username: string }>();

  if (!updated) {
    return c.json({ success: false, message: "更新に失敗しました" }, 500);
  }

  return c.json({
    success: true,
    message: "更新完了",
    id: updated.id,
    username: updated.username,
  });
};
