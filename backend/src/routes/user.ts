import type { AppContext } from "../lib/db.js";
import { authenticate, listFriends, parseJsonArray } from "../lib/db.js";
import { isString, isUuidString } from "../lib/validators.js";

export const userHandler = async (c: AppContext) => {
  const target = c.req.query("target");
  const id = c.req.query("id");
  const password_hash = c.req.query("password_hash");

  if (!isString(target) || !isUuidString(target)) {
    return c.json({ success: false, message: "target が不正です" }, 400);
  }

  const hasId = isString(id) && isUuidString(id);
  const hasPassword = isString(password_hash) && password_hash.trim() !== "";

  if (hasId !== hasPassword) {
    return c.json(
      {
        success: false,
        message: "不正なリクエストです",
      },
      400,
    );
  }

  const db = c.env.DB;
  let isFriend = false;
  if (hasId && hasPassword) {
    if (!(await authenticate(db, id, password_hash))) {
      return c.json({ success: false, message: "認証に失敗しました" }, 401);
    }
    const edge = await db
      .prepare("SELECT 1 FROM friendships WHERE user_id = ? AND friend_id = ?")
      .bind(id, target)
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

export default userHandler;
