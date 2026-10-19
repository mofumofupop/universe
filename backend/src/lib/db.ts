import type { Context } from "hono";

export type AppEnv = { Bindings: Env };
export type AppContext = Context<AppEnv>;

export type FriendSummary = { id: string; username: string; name: string | null };

/** Returns a 429 response when the client IP has exceeded `limiter`, otherwise null. */
export const rateLimited = async (c: AppContext, limiter: RateLimit) => {
  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  const { success } = await limiter.limit({ key: ip });
  if (success) return null;
  return c.json(
    {
      success: false,
      message: "リクエストが多すぎます。しばらくしてから再度お試しください",
    },
    429,
  );
};

export const isUniqueViolation = (err: unknown): boolean => {
  return err instanceof Error && err.message.includes("UNIQUE constraint failed");
};

export const parseJsonArray = (value: string | null): string[] => {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
};

/** Returns the profile id when `password_hash` matches, otherwise null. */
export const authenticate = async (
  db: D1Database,
  id: string,
  password_hash: string,
): Promise<string | null> => {
  const row = await db
    .prepare("SELECT id, password_hash FROM profiles WHERE id = ?")
    .bind(id)
    .first<{ id: string; password_hash: string }>();
  if (!row || row.password_hash !== password_hash) return null;
  return row.id;
};

export const listFriends = async (db: D1Database, userId: string): Promise<FriendSummary[]> => {
  const { results } = await db
    .prepare(
      `SELECT p.id, p.username, p.name
       FROM friendships f JOIN profiles p ON p.id = f.friend_id
       WHERE f.user_id = ?
       ORDER BY f.created_at, f.rowid`,
    )
    .bind(userId)
    .all<FriendSummary>();
  return results;
};
