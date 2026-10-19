import type { AppContext } from "../lib/db.js";
import { listFriends } from "../lib/db.js";
import { isRecord, isString, isUuidString } from "../lib/validators.js";

type AccountRequestBody = {
  id?: unknown;
  password_hash?: unknown;
};

const badRequest = (c: AppContext) => {
  return c.json({ success: false, message: "情報が間違っています" }, 400);
};

export const accountHandler = async (c: AppContext) => {
  let body: AccountRequestBody;
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

  if (!isString(id) || !isUuidString(id)) return badRequest(c);
  if (!isString(password_hash) || password_hash.trim() === "")
    return badRequest(c);

  const db = c.env.DB;
  const profile = await db
    .prepare(
      "SELECT id, username, name, icon_url, password_hash FROM profiles WHERE id = ?",
    )
    .bind(id)
    .first<{
      id: string;
      username: string;
      name: string | null;
      icon_url: string | null;
      password_hash: string;
    }>();

  if (!profile) return badRequest(c);
  if (profile.password_hash !== password_hash) return badRequest(c);

  const friends = await listFriends(db, id);

  const friendsFriends: Record<string, { id: string; username: string }[]> =
    Object.fromEntries(friends.map((f) => [f.id, []]));
  if (friends.length > 0) {
    const { results } = await db
      .prepare(
        `SELECT f.user_id AS owner, p.id, p.username
         FROM friendships f JOIN profiles p ON p.id = f.friend_id
         WHERE f.user_id IN (SELECT friend_id FROM friendships WHERE user_id = ?)
         ORDER BY f.created_at, f.rowid`,
      )
      .bind(id)
      .all<{ owner: string; id: string; username: string }>();
    for (const row of results) {
      friendsFriends[row.owner]?.push({ id: row.id, username: row.username });
    }
  }

  return c.json({
    success: true,
    message: "情報を送信します",
    id: profile.id,
    username: profile.username,
    name: profile.name,
    icon_url: profile.icon_url,
    friends,
    friends_friends: friendsFriends,
  });
};
