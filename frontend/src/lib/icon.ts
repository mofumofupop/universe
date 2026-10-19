const ICON_SIZE = 256;

/** Center-crops an image file to a square and encodes it as a 256x256 PNG, as /api/icon requires. */
export async function cropToSquareIcon(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  try {
    const side = Math.min(bitmap.width, bitmap.height);
    const sx = Math.floor((bitmap.width - side) / 2);
    const sy = Math.floor((bitmap.height - side) / 2);

    const canvas = document.createElement("canvas");
    canvas.width = ICON_SIZE;
    canvas.height = ICON_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("画像を処理できませんでした");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, ICON_SIZE, ICON_SIZE);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("画像を処理できませんでした"))),
        "image/png",
      );
    });
  } finally {
    bitmap.close();
  }
}
