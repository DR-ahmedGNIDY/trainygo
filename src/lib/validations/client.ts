import { z } from "zod";
import { CLIENT_GOALS, GENDERS } from "@/lib/constants";

const optionalNumber = z
  .union([z.number(), z.string()])
  .optional()
  .transform((v) => {
    if (v === undefined || v === "") return undefined;
    const n = typeof v === "string" ? Number(v) : v;
    return Number.isFinite(n) ? n : undefined;
  });

export const clientCreateSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب").max(80),
  phone: z.string().min(6, "رقم هاتف غير صالح").max(20),
  email: z.string().email().optional().or(z.literal("")),
  age: optionalNumber,
  gender: z.enum(GENDERS).optional(),
  height: optionalNumber,
  weight: optionalNumber,
  goal: z.enum(CLIENT_GOALS).optional(),
  subscriptionMonths: z
    .union([z.number(), z.string()])
    .optional()
    .transform((v) => {
      const n = typeof v === "string" ? Number(v) : v;
      return Number.isFinite(n) && n ? Number(n) : undefined;
    }),
});

/** Raw form input (strings allowed) — what callers/actions receive. */
export type ClientCreateInput = z.input<typeof clientCreateSchema>;
/** Parsed/coerced output — what services receive after validation. */
export type ClientCreateData = z.output<typeof clientCreateSchema>;

export const clientUpdateSchema = clientCreateSchema.partial().extend({
  active: z.boolean().optional(),
});

export type ClientUpdateInput = z.input<typeof clientUpdateSchema>;
export type ClientUpdateData = z.output<typeof clientUpdateSchema>;
