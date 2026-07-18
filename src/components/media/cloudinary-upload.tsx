"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { getCloudinarySignatureAction } from "@/lib/actions/media";
import { toast } from "@/components/ui/toast";
import { maxUploadBytesFor, maxUploadMb, isAcceptedExtension } from "@/lib/media/upload-limits";
import { compressImageIfNeeded } from "@/lib/media/compress-image";
import type { UploadKind } from "@/lib/media/cloudinary-folder";

/**
 * Opens the device's native image/video picker (gallery or file explorer — no
 * URL field, no third-party widget UI) and uploads the chosen file straight to
 * Cloudinary using a server-signed request, then returns the stored URL.
 *
 * `kind` is a coarse category (exercises/foods/messages/…); the server derives
 * the real tenant-scoped folder from the session — the client never controls
 * the destination path.
 */
export function CloudinaryUpload({
  kind,
  onUploaded,
  iconOnly,
  label,
  resourceType = "image",
}: {
  kind: UploadKind;
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

  async function handleFile(original: File) {
    const maxBytes = maxUploadBytesFor(kind);
    const tooLarge = L(
      `الملف أكبر من ${maxUploadMb(maxBytes)} ميجابايت`,
      `File is larger than ${maxUploadMb(maxBytes)}MB`,
    );

    // Phone camera photos routinely blow past the ceiling; shrink in-browser
    // first and only complain if it still doesn't fit. Decoding a large photo
    // is slow enough to need the spinner already showing.
    setBusy(true);
    const file =
      resourceType === "image" ? await compressImageIfNeeded(original, maxBytes) : original;

    if (file.size > maxBytes) {
      setBusy(false);
      toast.error(tooLarge);
      return;
    }
    if (!isAcceptedExtension(file.name, resourceType)) {
      setBusy(false);
      toast.error(
        L(
          resourceType === "video" ? "امتداد الفيديو غير مدعوم (mp4, webm)" : "امتداد الصورة غير مدعوم (jpg, jpeg, png, webp)",
          resourceType === "video" ? "Unsupported video format (mp4, webm)" : "Unsupported image format (jpg, jpeg, png, webp)",
        ),
      );
      return;
    }

    const sig = await getCloudinarySignatureAction(kind, {
      name: file.name,
      size: file.size,
      resourceType,
    });
    if (!sig.ok) {
      setBusy(false);
      if (sig.code === "FILE_TOO_LARGE") {
        toast.error(tooLarge);
      } else if (sig.code === "INVALID_FILE_TYPE" || sig.code === "INVALID_KIND") {
        toast.error(sig.error);
      } else if (sig.code === "RATE_LIMITED") {
        toast.error(sig.error);
      } else {
        setUnconfigured(true);
      }
      return;
    }
    const { cloudName, apiKey, timestamp, signature, folder, allowedFormats } = sig.data!;
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", apiKey);
    form.append("timestamp", String(timestamp));
    form.append("signature", signature);
    // These must exactly match the signed params, or Cloudinary rejects it.
    form.append("folder", folder);
    form.append("allowed_formats", allowedFormats);

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
