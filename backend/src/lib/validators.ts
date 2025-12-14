export const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

export const isString = (value: unknown): value is string => {
  return typeof value === "string";
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
