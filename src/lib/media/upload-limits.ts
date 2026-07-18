import type { UploadKind } from "@/lib/media/cloudinary-folder";

/** Default ceiling for every upload kind that doesn't override it below. */
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB (2097152 bytes)

/**
 * Per-kind overrides. Nutrition plans are delivered as photos of a printed or
 * handwritten plan taken on a phone, which routinely exceed the 2MB default
 * even after client-side compression — so that kind alone gets 3MB.
 */
const KIND_MAX_UPLOAD_BYTES: Partial<Record<UploadKind, number>> = {
  nutrition: 3 * 1024 * 1024, // 3MB
};

export function maxUploadBytesFor(kind: UploadKind): number {
  return KIND_MAX_UPLOAD_BYTES[kind] ?? MAX_UPLOAD_BYTES;
}

/** Human-readable limit in MB, for user-facing messages. */
export function maxUploadMb(bytes: number): number {
  return Math.round(bytes / (1024 * 1024));
}

export const ACCEPTED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
export const ACCEPTED_VIDEO_EXTENSIONS = ["mp4", "webm"];

/** All accepted formats, for Cloudinary's signed `allowed_formats` param. */
export const ALLOWED_FORMATS = [
  ...ACCEPTED_IMAGE_EXTENSIONS,
  ...ACCEPTED_VIDEO_EXTENSIONS,
];

/** Comma-joined form of ALLOWED_FORMATS, the exact string Cloudinary signs. */
export const ALLOWED_FORMATS_PARAM = ALLOWED_FORMATS.join(",");

export function fileTooLargeMessage(bytes: number): string {
  return `الحد الأقصى المسموح ${maxUploadMb(bytes)} ميجابايت`;
}
export const INVALID_FILE_TYPE_MESSAGE = "امتداد الملف غير مدعوم";

export function getFileExtension(fileName: string): string {
  return fileName.split(".").pop()?.toLowerCase() ?? "";
}

export function isAcceptedExtension(
  fileName: string,
  resourceType: "image" | "video",
): boolean {
  const ext = getFileExtension(fileName);
  const allowed = resourceType === "video" ? ACCEPTED_VIDEO_EXTENSIONS : ACCEPTED_IMAGE_EXTENSIONS;
  return allowed.includes(ext);
}
