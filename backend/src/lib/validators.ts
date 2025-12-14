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
