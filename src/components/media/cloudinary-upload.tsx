"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { getCloudinarySignatureAction } from "@/lib/actions/media";

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
    setBusy(true);
    const sig = await getCloudinarySignatureAction(folder);
    if (!sig.ok) {
      setBusy(false);
      setUnconfigured(true);
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
