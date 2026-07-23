import { z } from "zod";

export const freezeSchema = z.object({
  reason: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type FreezeInput = z.input<typeof freezeSchema>;

/** Allowed subscription durations (months) — mirrors the add-client form. */
export const SUBSCRIPTION_MONTHS = [1, 3, 6, 12] as const;

export const renewSchema = z.object({
  months: z
    .union([z.number(), z.string()])
    .transform((v) => (typeof v === "string" ? Number(v) : v))
    .pipe(
      z
        .number()
        .refine((n) => (SUBSCRIPTION_MONTHS as readonly number[]).includes(n), "مدة غير صالحة"),
    ),
});

export type RenewInput = z.input<typeof renewSchema>;

export const cancelSchema = z.object({
  reason: z.string().trim().max(200).optional().or(z.literal("")),
});

export type CancelInput = z.input<typeof cancelSchema>;
