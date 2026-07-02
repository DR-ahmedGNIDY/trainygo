import { z } from "zod";
import { TEAM_SPECIALIZATIONS } from "@/lib/constants";

export const teamMemberCreateSchema = z.object({
  name: z.string().min(2, "الاسم مطلوب").max(80),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  specialization: z.enum(TEAM_SPECIALIZATIONS),
});

export type TeamMemberCreateInput = z.input<typeof teamMemberCreateSchema>;
export type TeamMemberCreateData = z.output<typeof teamMemberCreateSchema>;

export const teamMemberUpdateSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  specialization: z.enum(TEAM_SPECIALIZATIONS).optional(),
});

export type TeamMemberUpdateInput = z.input<typeof teamMemberUpdateSchema>;
export type TeamMemberUpdateData = z.output<typeof teamMemberUpdateSchema>;
