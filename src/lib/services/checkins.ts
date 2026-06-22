import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { CheckinForm, CheckinResponse } from "@/models/Checkin";
import { User } from "@/models/User";
import { serialize } from "@/lib/serialize";
import { PermissionError } from "@/lib/permissions";
import { createNotification } from "./notifications";

const DEFAULT_FIELDS = [
  { key: "sleep", labelAr: "ساعات النوم", labelEn: "Sleep hours", type: "number" as const, required: false, order: 1 },
  { key: "water", labelAr: "الماء (لتر)", labelEn: "Water (L)", type: "number" as const, required: false, order: 2 },
  { key: "energy", labelAr: "مستوى الطاقة", labelEn: "Energy level", type: "scale" as const, required: false, order: 3 },
  { key: "adherence", labelAr: "الالتزام بالنظام", labelEn: "Diet adherence", type: "scale" as const, required: false, order: 4 },
  { key: "notes", labelAr: "ملاحظات", labelEn: "Notes", type: "text" as const, required: false, order: 5 },
];

/** Ensure a coach has a default weekly check-in form; returns its id. */
export async function getOrCreateDefaultForm(coachId: string) {
  await connectToDatabase();
  const coach = new Types.ObjectId(coachId);
  let form = await CheckinForm.findOne({ coach, titleEn: "Weekly check-in" });
  if (!form) {
    form = await CheckinForm.create({
      coach,
      titleAr: "متابعة أسبوعية",
      titleEn: "Weekly check-in",
      fields: DEFAULT_FIELDS,
      active: true,
    });
  }
  return form;
}

export async function listForms(coachId: string) {
  await connectToDatabase();
  const docs = await CheckinForm.find({ coach: new Types.ObjectId(coachId) })
    .sort({ createdAt: -1 })
    .lean();
  return serialize(docs);
}

export async function archiveForm(coachId: string, formId: string) {
  await connectToDatabase();
  const res = await CheckinForm.updateOne(
    { _id: formId, coach: new Types.ObjectId(coachId) },
    { $set: { active: false } },
  );
  return res.matchedCount > 0;
}

/** A client submits a weekly check-in to their coach. */
export async function submitCheckin(
  clientId: string,
  answers: { key: string; value: string }[],
) {
  await connectToDatabase();
  const client = await User.findOne({ _id: clientId, role: "client" })
    .select("name clientProfile.coach")
    .lean();
  const coachId = (client?.clientProfile as { coach?: Types.ObjectId })?.coach;
  if (!coachId) throw new PermissionError("No coach", "NO_COACH");

  const form = await getOrCreateDefaultForm(String(coachId));
  await CheckinResponse.create({
    form: form._id,
    client: new Types.ObjectId(clientId),
    coach: coachId,
    answers,
    submittedAt: new Date(),
  });

  await createNotification({
    recipient: String(coachId),
    type: "new_checkin",
    titleAr: `متابعة جديدة من ${client?.name ?? "عميل"}`,
    titleEn: `New check-in from ${client?.name ?? "a client"}`,
    link: "/coach/progress/checkins",
  });
  return true;
}

export async function listResponses(
  coachId: string,
  opts: { reviewed?: boolean } = {},
) {
  await connectToDatabase();
  const filter: Record<string, unknown> = { coach: new Types.ObjectId(coachId) };
  if (opts.reviewed !== undefined) filter.reviewed = opts.reviewed;
  const docs = await CheckinResponse.find(filter)
    .populate("client", "name clientProfile.clientCode")
    .sort({ submittedAt: -1 })
    .lean();
  return serialize(docs);
}

export async function reviewResponse(
  coachId: string,
  responseId: string,
  feedback?: string,
) {
  await connectToDatabase();
  const res = await CheckinResponse.updateOne(
    { _id: responseId, coach: new Types.ObjectId(coachId) },
    { $set: { reviewed: true, coachFeedback: feedback } },
  );
  return res.matchedCount > 0;
}

export async function countPendingCheckins(coachId: string) {
  await connectToDatabase();
  return CheckinResponse.countDocuments({
    coach: new Types.ObjectId(coachId),
    reviewed: false,
  });
}
