"use client";

import { useState } from "react";
import { CldUploadWidget } from "next-cloudinary";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
export const cloudinaryConfigured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

/**
 * Image upload that returns a stored URL.
 * - When Cloudinary is configured (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME + preset),
 *   uses the Cloudinary upload widget.
 * - Otherwise falls back to manual URL entry so the feature still works (we
 *   store URLs only either way).
 */
export function CloudinaryUpload({
  folder,
  onUploaded,
  iconOnly,
  label,
  resourceType = "image",
}: {
  folder?: string;
  onUploaded: (url: string, publicId?: string) => void;
  iconOnly?: boolean;
  label?: string;
  resourceType?: "image" | "video" | "auto";
}) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [busy, setBusy] = useState(false);
  const text = label ?? (resourceType === "video" ? L("رفع فيديو", "Upload video") : L("رفع صورة", "Upload image"));

  if (!cloudinaryConfigured) {
    // Graceful fallback: prompt for a URL (store-URL-only contract preserved).
    return (
      <Button
        type="button"
        variant="outline"
        size={iconOnly ? "icon" : "default"}
        onClick={() => {
          const url = window.prompt(L("أدخل رابط الصورة", "Enter image URL"));
          if (url && /^https?:\/\//.test(url)) onUploaded(url);
        }}
        title={L("Cloudinary غير مُعدّ — أدخل رابطاً", "Cloudinary not configured — paste a URL")}
      >
        <ImagePlus className="h-4 w-4" />
        {!iconOnly && text}
      </Button>
    );
  }

  return (
    <CldUploadWidget
      uploadPreset={UPLOAD_PRESET}
      options={{ folder, sources: ["local", "camera", "url"], multiple: false, maxFiles: 1, resourceType }}
      onUpload={() => setBusy(true)}
      onSuccess={(result) => {
        setBusy(false);
        const info = result?.info;
        if (info && typeof info === "object" && "secure_url" in info) {
          onUploaded(
            (info as { secure_url: string }).secure_url,
            (info as { public_id?: string }).public_id,
          );
        }
      }}
      onError={() => setBusy(false)}
    >
      {({ open }) => (
        <Button
          type="button"
          variant="outline"
          size={iconOnly ? "icon" : "default"}
          disabled={busy}
          onClick={() => open()}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {!iconOnly && text}
        </Button>
      )}
    </CldUploadWidget>
  );
}
