import { z } from "zod";

export const freezeSchema = z.object({
  reason: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type FreezeInput = z.input<typeof freezeSchema>;
