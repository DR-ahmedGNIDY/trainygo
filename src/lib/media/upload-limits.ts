export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB (2097152 bytes)

export const ACCEPTED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
export const ACCEPTED_VIDEO_EXTENSIONS = ["mp4", "webm"];

/** All accepted formats, for Cloudinary's signed `allowed_formats` param. */
export const ALLOWED_FORMATS = [
  ...ACCEPTED_IMAGE_EXTENSIONS,
  ...ACCEPTED_VIDEO_EXTENSIONS,
];

/** Comma-joined form of ALLOWED_FORMATS, the exact string Cloudinary signs. */
export const ALLOWED_FORMATS_PARAM = ALLOWED_FORMATS.join(",");

export const FILE_TOO_LARGE_MESSAGE = "الحد الأقصى المسموح 2 ميجابايت";
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
