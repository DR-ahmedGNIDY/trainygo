import { requireRole } from "@/lib/auth/session";
import { listErrorLogs, getErrorLogStats } from "@/lib/services/error-logs";
import { SystemLogsView, type ErrorLogRow } from "./system-logs-view";

export const dynamic = "force-dynamic";

export default async function AdminSystemLogsPage() {
  await requireRole("super_admin");
  const [rawLogs, stats] = await Promise.all([listErrorLogs(), getErrorLogStats()]);

  const logs: ErrorLogRow[] = rawLogs.map((l) => {
    const coach = l.coachId as unknown as { _id?: string; name?: string } | null;
    const resolver = l.resolvedBy as unknown as { name?: string } | null;
    return {
      id: String(l._id),
      type: l.type,
      severity: l.severity,
      message: l.message,
      stack: l.stack,
      code: l.code,
      coachName: coach?.name,
      email: l.email,
      route: l.route,
      action: l.action,
      context: l.context as Record<string, unknown> | undefined,
      browser: l.browser,
      device: l.device,
      ipAddress: l.ipAddress,
      environment: l.environment,
      resolved: l.resolved,
      resolvedByName: resolver?.name,
      resolvedAt: l.resolvedAt ? String(l.resolvedAt) : null,
      notes: l.notes,
      count: l.count,
      createdAt: String(l.createdAt),
      lastOccurredAt: String(l.lastOccurredAt),
    };
  });

  return <SystemLogsView logs={logs} stats={stats} />;
}
