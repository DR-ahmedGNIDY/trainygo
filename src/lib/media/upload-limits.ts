export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB

export const ACCEPTED_IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
export const ACCEPTED_VIDEO_EXTENSIONS = ["mp4", "webm"];

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
