import type { AppContext } from "../lib/db.js";
import { authenticate } from "../lib/db.js";
import { isString, isUuidString } from "../lib/validators.js";

// The frontend crops icons to a 256x256 PNG before upload; leave headroom for other clients.
const MAX_ICON_DIMENSION = 512;
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const errorResponse = (
  c: AppContext,
  message: string,
  status: 400 | 401 | 500,
) => {
  return c.json({ success: false, message }, status);
};

/** Reads width/height from the IHDR chunk, or null when the bytes are not a PNG. */
const readPngSize = (bytes: Uint8Array) => {
  if (bytes.length < 24) return null;
  if (!PNG_SIGNATURE.every((b, i) => bytes[i] === b)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
};

export const iconHandler = async (c: AppContext) => {
  const contentType = (c.req.header("content-type") || "").toLowerCase();
  if (!contentType.includes("multipart/form-data")) {
    return errorResponse(
      c,
      "multipart/form-data (field: icon) を送信してください",
      400,
    );
  }

  let id: string | undefined;
  let password_hash: string | undefined;
  let file: File | null = null;

  try {
    const formData = await c.req.formData();
    const fid = formData.get("id");
    const fpass = formData.get("password_hash");
    const ficon = formData.get("icon");

    id = typeof fid === "string" ? fid : undefined;
    password_hash = typeof fpass === "string" ? fpass : undefined;
    file = ficon instanceof File ? ficon : null;
  } catch {
    return errorResponse(c, "multipart の解析に失敗しました", 400);
  }

  if (!isString(id) || !isUuidString(id)) {
    return errorResponse(c, "id が不正です", 400);
  }
  if (!isString(password_hash) || password_hash.trim() === "") {
    return errorResponse(c, "password_hash が不足しています", 400);
  }
  if (!file) {
    return errorResponse(c, "icon (ファイル) が不足しています", 400);
  }
  if (file.size > MAX_FILE_SIZE) {
    return errorResponse(c, "icon のサイズが大きすぎます (2MB 上限)", 400);
  }

  const db = c.env.DB;
  if (!(await authenticate(db, id, password_hash))) {
    return errorResponse(c, "認証に失敗しました", 401);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const size = readPngSize(bytes);
  if (
    !size ||
    size.width !== size.height ||
    size.width < 1 ||
    size.width > MAX_ICON_DIMENSION
  ) {
    return errorResponse(
      c,
      `icon は ${MAX_ICON_DIMENSION}px 以下の正方形 PNG で送信してください`,
      400,
    );
  }

  await c.env.ICONS.put(`${id}.png`, bytes, {
    httpMetadata: { contentType: "image/png" },
  });

  // Version query busts browser caches because icons are served as immutable
  const iconUrl = `/icons/${id}.png?v=${Date.now()}`;
  await db
    .prepare("UPDATE profiles SET icon_url = ? WHERE id = ?")
    .bind(iconUrl, id)
    .run();

  return c.json({
    success: true,
    message: "情報を送信します",
    icon_url: iconUrl,
  });
};

export const iconFileHandler = async (c: AppContext) => {
  const file = c.req.param("file") ?? "";
  const id = file.endsWith(".png") ? file.slice(0, -".png".length) : "";
  if (!isUuidString(id)) {
    return c.json({ success: false, message: "Not Found" }, 404);
  }

  const object = await c.env.ICONS.get(`${id}.png`);
  if (!object) {
    return c.json({ success: false, message: "Not Found" }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(object.body, { headers });
};

export default iconHandler;
