export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

export const isString = (value: unknown): value is string => {
  return typeof value === "string";
};

export const isUuidString = (value: string): boolean => {
  // RFC 4122 UUID (v1-v5) の一般的な形式チェック
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
};

export const getOptionalString = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;
  return isString(value) ? value : null;
};

export const getOptionalStringArray = (value: unknown): string[] | null => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const strings = value.filter((v): v is string => typeof v === "string");
  if (strings.length !== value.length) return null;
  return strings;
};

export const getOptionalUrlArray = (value: unknown): string[] | null => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const arr: string[] = [];
  for (const v of value) {
    if (typeof v !== "string") return null;
    const s = v.trim();
    // Must start with http:// or https://
    if (!/^https?:\/\//.test(s)) return null;
    try {
      const u = new URL(s);
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    } catch {
      return null;
    }
    arr.push(s);
  }
  return arr;
};

export type FriendObject = { id: string; username: string };

export const isFriendObject = (value: unknown): value is FriendObject => {
  if (!isRecord(value)) return false;
  const id = (value as any).id;
  const username = (value as any).username;
  return (
    isString(id) &&
    isUuidString(id) &&
    isString(username) &&
    username.trim() !== ""
  );
};

export const getOptionalFriendArray = (
  value: unknown,
): FriendObject[] | null => {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return null;
  const arr: FriendObject[] = [];
  for (const v of value) {
    if (!isFriendObject(v)) return null;
    arr.push(v);
  }
  return arr;
};
