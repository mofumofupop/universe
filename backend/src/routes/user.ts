import type { AppContext } from "../lib/db.js";
import { authenticate, listFriends, parseJsonArray } from "../lib/db.js";
import { isRecord, isString, isUuidString } from "../lib/validators.js";

const respondWithProfile = async (
  c: AppContext,
  target: string,
  requesterId: string | null,
) => {
  const db = c.env.DB;
  let isFriend = false;
  if (requesterId) {
    const edge = await db
      .prepare("SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?")
      .bind(requesterId, target)
      .first();
    isFriend = edge !== null;
  }

  const targetUser = await db
    .prepare(
      "SELECT id, username, name, affiliation, icon_url, social_links FROM profiles WHERE id = ?",
    )
    .bind(target)
    .first<{
      id: string;
      username: string;
      name: string | null;
      affiliation: string | null;
      icon_url: string | null;
      social_links: string;
    }>();

  if (!targetUser) {
    return c.json({ success: false, message: "取得できませんでした" }, 400);
  }

  return c.json({
    success: true,
    message: "情報を送信します",
    id: targetUser.id,
    username: targetUser.username,
    name: targetUser.name,
    affiliation: targetUser.affiliation,
    icon_url: targetUser.icon_url,
    social_links: parseJsonArray(targetUser.social_links),
    ...(isFriend && { friends: await listFriends(db, target) }),
  });
};

/** Public profile. Credentials are accepted only by POST so they never land in URLs or logs. */
export const userHandler = async (c: AppContext) => {
  const target = c.req.query("target");
  if (!isString(target) || !isUuidString(target)) {
    return c.json({ success: false, message: "target が不正です" }, 400);
  }
  return respondWithProfile(c, target, null);
};

/** Profile as seen by an authenticated requester; includes `friends` when they are friends. */
export const userAsRequesterHandler = async (c: AppContext) => {
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

  const { target, id, password_hash } = body;
  if (!isString(target) || !isUuidString(target)) {
    return c.json({ success: false, message: "target が不正です" }, 400);
  }
  if (
    !isString(id) ||
    !isUuidString(id) ||
    !isString(password_hash) ||
    password_hash.trim() === ""
  ) {
    return c.json({ success: false, message: "不正なリクエストです" }, 400);
  }

  if (!(await authenticate(c.env.DB, id, password_hash))) {
    return c.json({ success: false, message: "認証に失敗しました" }, 401);
  }
  return respondWithProfile(c, target, id);
};

export default userHandler;
