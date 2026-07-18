"use client";

/**
 * Downscales/re-encodes an oversized image in the browser so phone photos
 * (which are routinely 4–8MB straight from the camera) fit under the upload
 * ceiling without the user having to resize anything themselves.
 *
 * Returns the ORIGINAL file untouched when it already fits, or when the
 * browser can't decode it — the caller still enforces the limit afterwards, so
 * a failed compression degrades to the normal "too large" error rather than a
 * broken upload.
 */
const MAX_DIMENSION = 2000;
const QUALITY_STEPS = [0.82, 0.7, 0.6, 0.5];

export async function compressImageIfNeeded(
  file: File,
  maxBytes: number,
): Promise<File> {
  if (file.size <= maxBytes) return file;
  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    // Try progressively harder compression until it fits.
    for (const quality of QUALITY_STEPS) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (!blob) break;
      if (blob.size <= maxBytes) {
        return new File([blob], toJpegName(file.name), {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
      }
    }
    return file;
  } catch {
    return file;
  }
}

function toJpegName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "image";
  return `${base}.jpg`;
}
