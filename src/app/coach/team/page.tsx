import { requireCoachArea } from "@/lib/auth/session";
import { canManageTeam } from "@/lib/permissions/team";
import { listTeamMembers } from "@/lib/services/team";
import { TeamView, type TeamMemberRow } from "./team-view";

export const dynamic = "force-dynamic";

export default async function CoachTeamPage() {
  const ctx = await requireCoachArea(canManageTeam);
  const raw = await listTeamMembers(ctx.coachId);

  const members: TeamMemberRow[] = raw.map((m) => {
    const tp = (m.teamProfile ?? {}) as Record<string, unknown>;
    return {
      id: String(m._id),
      name: m.name,
      username: m.username,
      email: m.email ?? null,
      phone: m.phone ?? null,
      status: m.status,
      specialization: tp.specialization as TeamMemberRow["specialization"],
      permissions: (tp.permissions ?? {}) as TeamMemberRow["permissions"],
      suspendedByOwner: Boolean(tp.suspendedByOwner),
      lastLoginAt: m.lastLoginAt ? String(m.lastLoginAt) : null,
    };
  });

  return <TeamView members={members} />;
}
