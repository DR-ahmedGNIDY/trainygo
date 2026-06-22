import { requireRole } from "@/lib/auth/session";
import { getProgressHistory } from "@/lib/services/progress";
import { ProgressView, type Entry } from "./progress-view";

export const dynamic = "force-dynamic";

export default async function ClientProgressPage() {
  const session = await requireRole("client");
  const history = (await getProgressHistory(session.user.id)) as unknown as Entry[];
  return <ProgressView history={history} />;
}
