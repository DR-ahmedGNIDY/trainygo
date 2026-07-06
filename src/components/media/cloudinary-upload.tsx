"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { getCloudinarySignatureAction } from "@/lib/actions/media";
import { toast } from "@/components/ui/toast";
import { MAX_UPLOAD_BYTES, isAcceptedExtension } from "@/lib/media/upload-limits";

/**
 * Opens the device's native image/video picker (gallery or file explorer — no
 * URL field, no third-party widget UI) and uploads the chosen file straight to
 * Cloudinary using a server-signed request, then returns the stored URL.
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
  resourceType?: "image" | "video";
}) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [busy, setBusy] = useState(false);
  const [unconfigured, setUnconfigured] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const text = label ?? (resourceType === "video" ? L("رفع فيديو", "Upload video") : L("رفع صورة", "Upload image"));

  async function handleFile(file: File) {
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(L("الملف أكبر من 2 ميجابايت", "الملف أكبر من 2 ميجابايت"));
      return;
    }
    if (!isAcceptedExtension(file.name, resourceType)) {
      toast.error(
        L(
          resourceType === "video" ? "امتداد الفيديو غير مدعوم (mp4, webm)" : "امتداد الصورة غير مدعوم (jpg, jpeg, png, webp)",
          resourceType === "video" ? "Unsupported video format (mp4, webm)" : "Unsupported image format (jpg, jpeg, png, webp)",
        ),
      );
      return;
    }

    setBusy(true);
    const sig = await getCloudinarySignatureAction(folder, {
      name: file.name,
      size: file.size,
      resourceType,
    });
    if (!sig.ok) {
      setBusy(false);
      if (sig.code === "FILE_TOO_LARGE") {
        toast.error(L("الملف أكبر من 2 ميجابايت", "الملف أكبر من 2 ميجابايت"));
      } else if (sig.code === "INVALID_FILE_TYPE") {
        toast.error(sig.error);
      } else {
        setUnconfigured(true);
      }
      return;
    }
    const { cloudName, apiKey, timestamp, signature } = sig.data!;
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", apiKey);
    form.append("timestamp", String(timestamp));
    form.append("signature", signature);
    if (folder) form.append("folder", folder);

    try {
      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`, {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (json?.secure_url) onUploaded(json.secure_url, json.public_id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={resourceType === "video" ? "video/*" : "image/*"}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) handleFile(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size={iconOnly ? "icon" : "default"}
        disabled={busy}
        title={unconfigured ? L("الرفع غير متاح حالياً — Cloudinary غير مُعدّ على الخادم", "Upload unavailable — Cloudinary isn't configured on the server") : undefined}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
        {!iconOnly && text}
      </Button>
    </>
  );
}
