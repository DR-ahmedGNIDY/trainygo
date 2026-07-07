"use server";

import { revalidatePath } from "next/cache";
import { getCoachAreaWriteCtx, getCoachAreaCtx, assertPermission } from "./guards";
import { runAction, ok, fail, type ActionResult } from "./result";
import { canManageTeam } from "@/lib/permissions/team";
import { rateLimit, RATE_LIMITS } from "@/lib/security/rate-limit";
import {
  teamMemberCreateSchema,
  teamMemberUpdateSchema,
  type TeamMemberCreateInput,
  type TeamMemberUpdateInput,
} from "@/lib/validations/team";
import * as team from "@/lib/services/team";
import type { GeneratedTeamCredentials } from "@/lib/services/team";
import type { ITeamPermissions } from "@/models/User";

export async function createTeamMemberAction(
  input: TeamMemberCreateInput,
): Promise<ActionResult<{ teamMemberId: string; credentials: GeneratedTeamCredentials }>> {
  return runAction(async () => {
    const parsed = teamMemberCreateSchema.safeParse(input);
    if (!parsed.success) return fail("بيانات غير صالحة", "VALIDATION");
    const ctx = await getCoachAreaWriteCtx();
    assertPermission(ctx, canManageTeam);
    // Rate limit invitations per owner coach (20 / day).
    if (!rateLimit(RATE_LIMITS.teamInvite, `coach:${ctx.coachId}`).ok) {
      return fail("لقد تجاوزت الحد اليومي لإضافة أعضاء الفريق.", "RATE_LIMITED");
    }
    const res = await team.createTeamMember(ctx.coachId, parsed.data);
    revalidatePath("/coach/team");
    return ok(res);
  });
}

export async function updateTeamMemberAction(
  teamMemberId: string,
  input: TeamMemberUpdateInput & { permissions?: Partial<ITeamPermissions> },
): Promise<ActionResult> {
  return runAction(async () => {
    const parsed = teamMemberUpdateSchema.safeParse(input);
    if (!parsed.success) return fail("بيانات غير صالحة", "VALIDATION");
    const ctx = await getCoachAreaWriteCtx();
    assertPermission(ctx, canManageTeam);
    const okUpdate = await team.updateTeamMember(ctx.coachId, teamMemberId, {
      ...parsed.data,
      permissions: input.permissions,
    });
    if (!okUpdate) return fail("غير موجود", "NOT_FOUND");
    revalidatePath("/coach/team");
    return ok();
  });
}

export async function suspendTeamMemberAction(teamMemberId: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getCoachAreaWriteCtx();
    assertPermission(ctx, canManageTeam);
    await team.suspendTeamMember(ctx.coachId, teamMemberId);
    revalidatePath("/coach/team");
    return ok();
  });
}

export async function reactivateTeamMemberAction(teamMemberId: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getCoachAreaWriteCtx();
    assertPermission(ctx, canManageTeam);
    await team.reactivateTeamMember(ctx.coachId, teamMemberId);
    revalidatePath("/coach/team");
    return ok();
  });
}

export async function deleteTeamMemberAction(teamMemberId: string): Promise<ActionResult> {
  return runAction(async () => {
    const ctx = await getCoachAreaWriteCtx();
    assertPermission(ctx, canManageTeam);
    const deleted = await team.deleteTeamMember(ctx.coachId, teamMemberId);
    if (!deleted) return fail("غير موجود", "NOT_FOUND");
    revalidatePath("/coach/team");
    return ok();
  });
}

export async function resetTeamMemberPasswordAction(
  teamMemberId: string,
): Promise<ActionResult<{ password: string }>> {
  return runAction(async () => {
    const ctx = await getCoachAreaWriteCtx();
    assertPermission(ctx, canManageTeam);
    if (!rateLimit(RATE_LIMITS.passwordReset, `coach:${ctx.coachId}`).ok) {
      return fail("لقد تجاوزت الحد المسموح من عمليات إعادة التعيين. حاول لاحقاً.", "RATE_LIMITED");
    }
    const res = await team.resetTeamMemberPassword(ctx.coachId, teamMemberId);
    if (!res) return fail("غير موجود", "NOT_FOUND");
    return ok(res);
  });
}

export async function listTeamMembersAction(): Promise<
  ActionResult<Awaited<ReturnType<typeof team.listTeamMembers>>>
> {
  return runAction(async () => {
    const ctx = await getCoachAreaCtx();
    assertPermission(ctx, canManageTeam);
    const res = await team.listTeamMembers(ctx.coachId);
    return ok(res);
  });
}
