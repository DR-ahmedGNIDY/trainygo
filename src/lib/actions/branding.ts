"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCoachCtx } from "./guards";
import { runAction, ok, fail, type ActionResult } from "./result";
import * as brandSettings from "@/lib/services/brand-settings";
import type { BrandSettings } from "@/lib/services/brand-settings";

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "لون غير صالح");

const optionalUrl = z
  .string()
  .url()
  .max(500)
  .optional()
  .or(z.literal(""))
  .transform((v) => (v === "" ? undefined : v));

// Branding edits are not gated by subscription status — a coach whose subscription
// has lapsed should still be able to manage their academy identity, so we use
// getCoachCtx() (auth only) rather than getCoachWriteCtx() (auth + subscription gate).
const brandingUpdateSchema = z.object({
  academyName: z.string().trim().min(1).max(80).optional(),
  logo: optionalUrl,
  primaryColor: hexColor.optional(),
  secondaryColor: hexColor.optional(),
  buttonColor: hexColor.optional(),
  headerColor: hexColor.optional(),
  sidebarColor: hexColor.optional(),
  linkColor: hexColor.optional(),
  loginImage: optionalUrl,
  dashboardImage: optionalUrl,
  favicon: optionalUrl,
  showFitxnetBadge: z.boolean().optional(),
});

export type BrandingUpdateInput = z.infer<typeof brandingUpdateSchema>;

export async function updateBrandingAction(
  input: BrandingUpdateInput,
): Promise<ActionResult<BrandSettings>> {
  return runAction(async () => {
    const parsed = brandingUpdateSchema.safeParse(input);
    if (!parsed.success) return fail("بيانات غير صالحة", "VALIDATION");
    const { coachId } = await getCoachCtx();
    const res = await brandSettings.updateBrandSettings(coachId, parsed.data);
    revalidatePath("/coach/branding");
    revalidatePath("/coach");
    return ok(res);
  });
}

export async function resetBrandingAction(): Promise<ActionResult> {
  return runAction(async () => {
    const { coachId } = await getCoachCtx();
    await brandSettings.resetBrandSettings(coachId);
    revalidatePath("/coach/branding");
    revalidatePath("/coach");
    return ok();
  });
}
