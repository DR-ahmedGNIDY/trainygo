import "server-only";
import { createHash } from "crypto";
import { logError } from "@/lib/logging/error-log";

/**
 * Deletes uploaded assets from Cloudinary by public id.
 *
 * BEST-EFFORT BY DESIGN: a failure here never propagates. Deleting the plan
 * row is what the coach asked for, so a Cloudinary outage (or missing config)
 * must not turn a successful delete into an error — the worst case is an
 * orphaned file, which is exactly the state we had before this existed. Every
 * failure is logged so orphans are traceable rather than silent.
 *
 * Currently wired up for image nutrition plans only; other media (messages,
 * progress photos, avatars) still orphan their uploads.
 */
export async function destroyCloudinaryAssets(
  publicIds: (string | undefined | null)[],
  meta: { route?: string; action?: string; coachId?: string } = {},
): Promise<void> {
  const ids = publicIds.filter((id): id is string => typeof id === "string" && id.length > 0);
  if (ids.length === 0) return;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    await logError({
      type: "UPLOAD_ERROR",
      severity: "warning",
      message: "Skipped Cloudinary cleanup — credentials not configured",
      route: meta.route,
      action: meta.action,
      coachId: meta.coachId,
      context: { publicIds: ids },
    });
    return;
  }

  await Promise.all(
    ids.map(async (publicId) => {
      try {
        const timestamp = Math.floor(Date.now() / 1000);
        const toSign = `public_id=${publicId}&timestamp=${timestamp}`;
        const signature = createHash("sha1").update(toSign + apiSecret).digest("hex");

        const body = new URLSearchParams({
          public_id: publicId,
          timestamp: String(timestamp),
          signature,
          api_key: apiKey,
        });

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
          { method: "POST", body },
        );
        const json = (await res.json()) as { result?: string };
        // "not found" means it's already gone — that's the desired end state.
        if (json.result !== "ok" && json.result !== "not found") {
          throw new Error(`Cloudinary destroy returned "${json.result}"`);
        }
      } catch (e) {
        await logError(
          {
            type: "UPLOAD_ERROR",
            severity: "warning",
            message: `Failed to delete Cloudinary asset — orphaned file left behind`,
            stack: e instanceof Error ? e.stack : undefined,
            route: meta.route,
            action: meta.action,
            coachId: meta.coachId,
            context: { publicId },
          },
          e,
        );
      }
    }),
  );
}
