import { requireRole } from "@/lib/auth/session";
import { getOwnProfile, getOwnCoachId } from "@/lib/services/client-self";
import { getClientPerformanceStats } from "@/lib/services/workout-analytics";
import { User } from "@/models/User";
import { ProfileView, type ClientSelf } from "./profile-view";
import type { ClientGoal } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function ClientProfilePage() {
  const session = await requireRole("client");
  const id = session.user.id;
  const [profile, coachId, stats] = await Promise.all([getOwnProfile(id), getOwnCoachId(id), getClientPerformanceStats(id)]);
  const coach = coachId ? await User.findById(coachId).select("name").lean() : null;

  const cp = (profile?.clientProfile ?? {}) as Record<string, unknown>;
  const self: ClientSelf = {
    name: profile?.name ?? "",
    username: profile?.username ?? "",
    code: (cp.clientCode as string) ?? "",
    goal: cp.goal as ClientGoal | undefined,
    coachName: coach?.name ?? "—",
    phone: profile?.phone ?? "",
    height: (cp.height as number) ?? null,
    weight: (cp.currentWeight as number) ?? null,
  };

  return <ProfileView self={self} stats={stats} />;
}
