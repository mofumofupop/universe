import type { Context } from "hono";
import sharp from "sharp";
import { createSupabaseClient } from "../lib/supabase.js";
import { isString, isUuidString } from "../lib/validators.js";

const ICON_SIZE = 256;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const STORAGE_BUCKET = "icons";

const errorResponse = (
  c: Context,
  message: string,
  status: 400 | 401 | 500,
  detail?: any,
) => {
  return c.json(
    {
      success: false,
      message,
      ...(detail && { detail: JSON.stringify(detail) }),
    },
    status,
  );
};

const processImageToSquare = async (buffer: Buffer): Promise<Buffer> => {
  const meta = await sharp(buffer).metadata();

  if (!meta.width || !meta.height) {
    return sharp(buffer)
      .resize(ICON_SIZE, ICON_SIZE, { fit: "cover" })
      .png()
      .toBuffer();
  }

  const size = Math.min(meta.width, meta.height);
  const left = Math.floor((meta.width - size) / 2);
  const top = Math.floor((meta.height - size) / 2);

  return sharp(buffer)
    .extract({
      left: Math.max(0, left),
      top: Math.max(0, top),
      width: size,
      height: size,
    })
    .resize(ICON_SIZE, ICON_SIZE)
    .png()
    .toBuffer();
};

export const iconHandler = async (c: Context) => {
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
  let fileBuffer: Buffer | null = null;

  try {
    const formData = await c.req.formData();
    const fid = formData.get("id");
    const fpass = formData.get("password_hash");
    const file = formData.get("icon");

    id = typeof fid === "string" ? fid : undefined;
    password_hash = typeof fpass === "string" ? fpass : undefined;

    if (file && typeof (file as any).arrayBuffer === "function") {
      const arrayBuffer = await (file as any).arrayBuffer();
      fileBuffer = Buffer.from(arrayBuffer);
    }
  } catch (err) {
    return errorResponse(c, "multipart の解析に失敗しました", 400);
  }

  if (!isString(id) || !isUuidString(id)) {
    return errorResponse(c, "id が不正です", 400);
  }
  if (!isString(password_hash) || password_hash.trim() === "") {
    return errorResponse(c, "password_hash が不足しています", 400);
  }
  if (!fileBuffer) {
    return errorResponse(c, "icon (ファイル) が不足しています", 400);
  }

  const supabase = createSupabaseClient();
  if (!supabase) {
    return errorResponse(c, "サーバー設定が不足しています", 500);
  }

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("id,password_hash")
    .eq("id", id)
    .single();

  if (profErr || !profile) {
    return errorResponse(c, "認証に失敗しました", 401);
  }
  if ((profile as any).password_hash !== password_hash) {
    return errorResponse(c, "認証に失敗しました", 401);
  }

  let processed: Buffer;
  try {
    processed = await processImageToSquare(fileBuffer);
  } catch (err) {
    return errorResponse(c, "icon を画像として処理できません", 400);
  }

  if (processed.length > MAX_FILE_SIZE) {
    return errorResponse(c, "icon のサイズが大きすぎます (50MB 上限)", 400);
  }

  const filename = `${id}.png`;

  try {
    const upload = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filename, processed, { contentType: "image/png", upsert: true });

    if (upload.error) {
      return errorResponse(
        c,
        "アイコンのストレージへの保存に失敗しました",
        500,
        upload,
      );
    }

    const publicRes = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filename);
    const publicUrl = publicRes.data?.publicUrl ?? null;

    if (!publicUrl) {
      return errorResponse(c, "公開URL の取得に失敗しました", 500, publicRes);
    }

    const { error: updErr } = await supabase
      .from("profiles")
      .update({ icon_url: publicUrl })
      .eq("id", id);

    if (updErr) {
      return errorResponse(c, "プロフィール更新に失敗しました", 500, updErr);
    }

    return c.json({
      success: true,
      message: "情報を送信します",
      icon_url: publicUrl,
    });
  } catch (err) {
    return errorResponse(c, "アイコンの保存に失敗しました", 500);
  }
};

export default iconHandler;
