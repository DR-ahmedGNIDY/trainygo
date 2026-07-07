"use server";

import { createHash } from "crypto";
import { auth } from "@/lib/auth";
import { PermissionError } from "@/lib/permissions";
import { runAction, ok, fail, type ActionResult } from "./result";
import { logError } from "@/lib/logging/error-log";
import {
  MAX_UPLOAD_BYTES,
  FILE_TOO_LARGE_MESSAGE,
  INVALID_FILE_TYPE_MESSAGE,
  ALLOWED_FORMATS_PARAM,
  isAcceptedExtension,
} from "@/lib/media/upload-limits";
import {
  buildTenantFolder,
  isUploadKind,
  type UploadKind,
} from "@/lib/media/cloudinary-folder";
import { rateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import { getCoachAreaCtx } from "./guards";

export interface CloudinarySignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  /** The server-authoritative, tenant-scoped folder. The client MUST upload with exactly this value. */
  folder: string;
  /** The signed allowed-formats param; the client MUST send it back verbatim. */
  allowedFormats: string;
}

/**
 * Signs a Cloudinary upload request server-side. The API secret never reaches
 * the client. Security properties enforced HERE (not trusted from the browser):
 *
 *  - Only authenticated users may obtain a signature (rate-limited per user).
 *  - The upload `folder` is DERIVED from the session (tenant-scoped) — the
 *    caller only supplies a `kind`, never a raw path, so cross-tenant uploads
 *    are structurally impossible.
 *  - `allowed_formats` is signed, so Cloudinary itself rejects any file whose
 *    real format is outside jpg/jpeg/png/webp/mp4/webm — regardless of the
 *    (spoofable) declared name/extension.
 *  - Declared size over 2MB is rejected before signing.
 */
export async function getCloudinarySignatureAction(
  kind: UploadKind,
  file?: { name: string; size: number; resourceType: "image" | "video" },
): Promise<ActionResult<CloudinarySignature>> {
  return runAction(async () => {
    const session = await auth();
    if (!session?.user) throw new PermissionError("Forbidden", "FORBIDDEN");

    // Per-user rate limit on signature generation (media upload abuse guard).
    const rl = rateLimit(RATE_LIMITS.mediaSignature, `user:${session.user.id}`);
    if (!rl.ok) {
      return fail(
        "لقد تجاوزت الحد المسموح من عمليات الرفع. حاول لاحقاً.",
        "RATE_LIMITED",
      );
    }

    if (!isUploadKind(kind)) {
      return fail(INVALID_FILE_TYPE_MESSAGE, "INVALID_KIND");
    }

    if (file) {
      if (typeof file.size !== "number" || file.size > MAX_UPLOAD_BYTES) {
        return fail(FILE_TOO_LARGE_MESSAGE, "FILE_TOO_LARGE");
      }
      if (file.resourceType !== "image" && file.resourceType !== "video") {
        return fail(INVALID_FILE_TYPE_MESSAGE, "INVALID_FILE_TYPE");
      }
      if (!isAcceptedExtension(file.name, file.resourceType)) {
        return fail(INVALID_FILE_TYPE_MESSAGE, "INVALID_FILE_TYPE");
      }
    }

    // Resolve the tenant scope id. Coaches & team members share the OWNER
    // coach's namespace; clients get their own; super admins the system one.
    const role = session.user.role;
    let scopeId = session.user.id;
    if (role === "coach" || role === "team_member") {
      const ctx = await getCoachAreaCtx();
      scopeId = ctx.coachId; // ownerCoachId for a team member
    }
    const folder = buildTenantFolder(role, scopeId, kind);

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
      await logError({
        type: "UPLOAD_ERROR",
        severity: "critical",
        message: "Cloudinary environment variables are not configured",
        userId: session.user.id,
        coachId: role === "coach" ? session.user.id : undefined,
        email: session.user.email ?? undefined,
        route: "media",
        action: "getCloudinarySignature",
        context: { kind },
      });
      return fail("Cloudinary غير مُعدّ على الخادم", "NOT_CONFIGURED");
    }

    const timestamp = Math.floor(Date.now() / 1000);
    // Every param except file/api_key/resource_type must be signed and sent
    // back verbatim, or Cloudinary rejects the upload.
    const paramsToSign: Record<string, string | number> = {
      allowed_formats: ALLOWED_FORMATS_PARAM,
      folder,
      timestamp,
    };
    const toSign = Object.keys(paramsToSign)
      .sort()
      .map((k) => `${k}=${paramsToSign[k]}`)
      .join("&");
    const signature = createHash("sha1").update(toSign + apiSecret).digest("hex");

    return ok({
      cloudName,
      apiKey,
      timestamp,
      signature,
      folder,
      allowedFormats: ALLOWED_FORMATS_PARAM,
    });
  });
}
