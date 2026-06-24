import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { ClientProgram } from "@/models/ClientProgram";
import { WorkoutTemplate, type IWorkoutWeek } from "@/models/WorkoutTemplate";
import { User } from "@/models/User";
import { serialize } from "@/lib/serialize";
import { PermissionError } from "@/lib/permissions";
import { createNotification } from "./notifications";

/** Deep, reference-free clone of an embedded structure (independence rule). */
function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

async function assertOwnsClient(coachId: string, clientId: string) {
  const exists = await User.exists({
    _id: clientId,
    role: "client",
    "clientProfile.coach": new Types.ObjectId(coachId),
  });
  if (!exists) throw new PermissionError("Client not found", "NOT_FOUND");
}

export async function listPrograms(
  coachId: string,
  opts: { clientId?: string; status?: "active" | "archived" } = {},
) {
  await connectToDatabase();
  const filter: Record<string, unknown> = { coach: new Types.ObjectId(coachId) };
  if (opts.clientId) filter.client = new Types.ObjectId(opts.clientId);
  if (opts.status) filter.status = opts.status;
  const docs = await ClientProgram.find(filter)
    .populate("client", "name clientProfile.clientCode")
    .sort({ createdAt: -1 })
    .lean();
  return serialize(docs);
}

export async function getActiveProgram(coachId: string, clientId: string) {
  await connectToDatabase();
  const doc = await ClientProgram.findOne({
    coach: new Types.ObjectId(coachId),
    client: new Types.ObjectId(clientId),
    status: "active",
  })
    .sort({ createdAt: -1 })
    .lean();
  return doc ? serialize(doc) : null;
}

/**
 * Assign a workout template to a client as an INDEPENDENT deep copy. Editing
 * the source template afterwards never affects this program (weeks are cloned
 * and embedded, sourceTemplate kept only as a provenance reference).
 */
export async function assignTemplateToClient(
  coachId: string,
  templateId: string,
  clientId: string,
) {
  await connectToDatabase();
  await assertOwnsClient(coachId, clientId);

  const tpl = await WorkoutTemplate.findOne({
    _id: templateId,
    $or: [
      { isSystemTemplate: true },
      { createdByCoach: new Types.ObjectId(coachId) },
    ],
  }).lean();
  if (!tpl) throw new PermissionError("Template not found", "NOT_FOUND");

  const program = await ClientProgram.create({
    client: new Types.ObjectId(clientId),
    coach: new Types.ObjectId(coachId),
    sourceTemplate: tpl._id,
    nameAr: tpl.nameAr,
    nameEn: tpl.nameEn,
    description: tpl.description,
    goal: tpl.goal,
    weeks: deepClone(tpl.weeks), // independent copy
    status: "active",
  });

  await createNotification({
    recipient: clientId,
    type: "new_program",
    titleAr: "تم إسناد برنامج تدريبي جديد لك",
    titleEn: "A new workout program was assigned to you",
    link: "/client/workout",
  });

  return program._id.toString();
}

/** Creates a brand-new, empty program for a client who doesn't have one yet (no template involved). */
export async function createBlankProgram(
  coachId: string,
  clientId: string,
  input: { nameAr: string; nameEn: string },
) {
  await connectToDatabase();
  await assertOwnsClient(coachId, clientId);

  const program = await ClientProgram.create({
    client: new Types.ObjectId(clientId),
    coach: new Types.ObjectId(coachId),
    sourceTemplate: null,
    nameAr: input.nameAr,
    nameEn: input.nameEn,
    weeks: [{ weekNumber: 1, name: { ar: "الأسبوع 1", en: "Week 1" }, days: [] }],
    status: "active",
  });
  return program._id.toString();
}

export async function duplicateProgram(
  coachId: string,
  programId: string,
  toClientId: string,
) {
  await connectToDatabase();
  const src = await ClientProgram.findOne({
    _id: programId,
    coach: new Types.ObjectId(coachId),
  }).lean();
  if (!src) throw new PermissionError("Program not found", "NOT_FOUND");
  await assertOwnsClient(coachId, toClientId);

  const copy = await ClientProgram.create({
    client: new Types.ObjectId(toClientId),
    coach: new Types.ObjectId(coachId),
    sourceTemplate: src.sourceTemplate ?? null,
    nameAr: src.nameAr,
    nameEn: src.nameEn,
    description: src.description,
    goal: src.goal,
    weeks: deepClone(src.weeks),
    status: "active",
  });
  return copy._id.toString();
}

export async function getProgram(coachId: string, programId: string) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(programId)) return null;
  const doc = await ClientProgram.findOne({
    _id: programId,
    coach: new Types.ObjectId(coachId),
  })
    .populate("client", "name clientProfile.clientCode")
    .lean();
  return doc ? serialize(doc) : null;
}

/** Edit an assigned program's embedded weeks (the independent copy). */
export async function updateProgramWeeks(
  coachId: string,
  programId: string,
  data: { nameAr?: string; nameEn?: string; weeks: IWorkoutWeek[] },
) {
  await connectToDatabase();
  const program = await ClientProgram.findOne({
    _id: programId,
    coach: new Types.ObjectId(coachId),
  });
  if (!program) throw new PermissionError("Program not found", "NOT_FOUND");
  if (data.nameAr) program.nameAr = data.nameAr;
  if (data.nameEn) program.nameEn = data.nameEn;
  program.weeks = data.weeks;
  await program.save();
  return true;
}

export async function archiveProgram(coachId: string, programId: string) {
  await connectToDatabase();
  const res = await ClientProgram.updateOne(
    { _id: programId, coach: new Types.ObjectId(coachId) },
    { $set: { status: "archived" } },
  );
  return res.matchedCount > 0;
}

export async function deleteProgram(coachId: string, programId: string) {
  await connectToDatabase();
  const res = await ClientProgram.deleteOne({
    _id: programId,
    coach: new Types.ObjectId(coachId),
  });
  return res.deletedCount > 0;
}
