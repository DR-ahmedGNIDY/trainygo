"use server";

import { createHash } from "crypto";
import { auth } from "@/lib/auth";
import { PermissionError } from "@/lib/permissions";
import { runAction, ok, fail, type ActionResult } from "./result";
import { logError } from "@/lib/logging/error-log";

export interface CloudinarySignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder?: string;
}

/**
 * Signs a Cloudinary upload request server-side (using the API secret, which never
 * reaches the client) so the browser can upload a file directly to Cloudinary from a
 * native <input type="file"> picker — no upload preset or third-party widget needed.
 */
export async function getCloudinarySignatureAction(
  folder?: string,
): Promise<ActionResult<CloudinarySignature>> {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user) throw new PermissionError("Forbidden", "FORBIDDEN");

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      await logError({
        type: "UPLOAD_ERROR",
        severity: "critical",
        message: "Cloudinary environment variables are not configured",
        userId: session.user.id,
        coachId: session.user.role === "coach" ? session.user.id : undefined,
        email: session.user.email ?? undefined,
        route: "media",
        action: "getCloudinarySignature",
        context: { folder },
      });
      return fail("Cloudinary غير مُعدّ على الخادم", "NOT_CONFIGURED");
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign = folder ? { folder, timestamp } : { timestamp };
    const toSign = Object.keys(paramsToSign)
      .sort()
      .map((k) => `${k}=${(paramsToSign as Record<string, string | number>)[k]}`)
      .join("&");
    const signature = createHash("sha1").update(toSign + apiSecret).digest("hex");

    return ok({ cloudName, apiKey, timestamp, signature, folder });
  });
}
