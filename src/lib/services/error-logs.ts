import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { ErrorLog, type ErrorLogSeverity, type ErrorLogType } from "@/models/ErrorLog";
import { serialize } from "@/lib/serialize";

export interface ListErrorLogsFilters {
  range?: "today" | "7d" | "30d" | "all";
  coachId?: string;
  type?: ErrorLogType;
  severity?: ErrorLogSeverity;
  resolved?: boolean;
}

function rangeStart(range?: ListErrorLogsFilters["range"]): Date | null {
  const now = Date.now();
  if (range === "today") return new Date(new Date().setHours(0, 0, 0, 0));
  if (range === "7d") return new Date(now - 7 * 86_400_000);
  if (range === "30d") return new Date(now - 30 * 86_400_000);
  return null;
}

export async function listErrorLogs(filters: ListErrorLogsFilters = {}) {
  await connectToDatabase();
  const match: Record<string, unknown> = {};
  const since = rangeStart(filters.range);
  if (since) match.lastOccurredAt = { $gte: since };
  if (filters.coachId && Types.ObjectId.isValid(filters.coachId)) {
    match.coachId = new Types.ObjectId(filters.coachId);
  }
  if (filters.type) match.type = filters.type;
  if (filters.severity) match.severity = filters.severity;
  if (filters.resolved !== undefined) match.resolved = filters.resolved;

  const docs = await ErrorLog.find(match)
    .populate("coachId", "name email")
    .populate("resolvedBy", "name")
    .sort({ lastOccurredAt: -1 })
    .limit(500)
    .lean();
  return serialize(docs);
}

export async function getErrorLogStats() {
  await connectToDatabase();
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

  const [critical, open, resolvedToday, mostFrequentDoc] = await Promise.all([
    ErrorLog.countDocuments({ severity: "critical", resolved: false }),
    ErrorLog.countDocuments({ resolved: false }),
    ErrorLog.countDocuments({ resolved: true, resolvedAt: { $gte: todayStart } }),
    ErrorLog.findOne({}).sort({ count: -1 }).select("message type count").lean(),
  ]);

  const mostFrequent = mostFrequentDoc
    ? { message: mostFrequentDoc.message, type: mostFrequentDoc.type, count: mostFrequentDoc.count }
    : null;

  return { critical, open, resolvedToday, mostFrequent };
}

export async function markErrorLogResolved(id: string, adminId: string, resolved: boolean) {
  await connectToDatabase();
  await ErrorLog.updateOne(
    { _id: id },
    resolved
      ? { $set: { resolved: true, resolvedBy: adminId, resolvedAt: new Date() } }
      : { $set: { resolved: false }, $unset: { resolvedBy: "", resolvedAt: "" } },
  );
  return true;
}

export async function addErrorLogNote(id: string, notes: string) {
  await connectToDatabase();
  await ErrorLog.updateOne({ _id: id }, { $set: { notes } });
  return true;
}

export async function deleteErrorLog(id: string) {
  await connectToDatabase();
  await ErrorLog.deleteOne({ _id: id });
  return true;
}
