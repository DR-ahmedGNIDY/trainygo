import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth/password";
import { randomString } from "@/lib/utils";
import { serialize } from "@/lib/serialize";
import { buildDefaultPermissions, isValidSpecialization } from "@/lib/permissions/team";
import type { TeamSpecialization, TeamPermissionKey } from "@/lib/constants";
import type { ITeamPermissions } from "@/models/User";

export interface GeneratedTeamCredentials {
  username: string;
  password: string;
}

export interface TeamMemberCreateInput {
  name: string;
  email?: string;
  phone?: string;
  specialization: TeamSpecialization;
  /** Optional overrides applied on top of the specialization's default preset. */
  permissionOverrides?: Partial<ITeamPermissions>;
}

export interface TeamMemberUpdateInput {
  name?: string;
  email?: string;
  phone?: string;
  specialization?: TeamSpecialization;
  permissions?: Partial<ITeamPermissions>;
}

/** List every team member owned by a coach — never crosses into other coaches' staff. */
export async function listTeamMembers(ownerCoachId: string) {
  await connectToDatabase();
  const docs = await User.find({ role: "team_member", "teamProfile.ownerCoachId": new Types.ObjectId(ownerCoachId) })
    .select("name username email phone status teamProfile lastLoginAt createdAt")
    .sort({ createdAt: -1 })
    .lean();
  return serialize(docs);
}

/** Fetch one team member, scoped to the owner coach (returns null if not theirs). */
export async function getTeamMember(ownerCoachId: string, teamMemberId: string) {
  await connectToDatabase();
  if (!Types.ObjectId.isValid(teamMemberId)) return null;
  const doc = await User.findOne({
    _id: teamMemberId,
    role: "team_member",
    "teamProfile.ownerCoachId": new Types.ObjectId(ownerCoachId),
  }).lean();
  return doc ? serialize(doc) : null;
}

/** Generates a random, unique username for a new team member (not derived from their name). */
async function generateUsername(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const candidate = `t${randomString(7).toLowerCase()}`;
    if (!(await User.exists({ username: candidate }))) return candidate;
  }
  throw new Error("Could not generate a unique username");
}

/**
 * Creates a team member under a coach with a preset permission bag derived
 * from their specialization (customizable via permissionOverrides). Returns
 * generated login credentials — shown to the coach exactly once, same
 * pattern as client creation.
 */
export async function createTeamMember(
  ownerCoachId: string,
  input: TeamMemberCreateInput,
): Promise<{ teamMemberId: string; credentials: GeneratedTeamCredentials }> {
  await connectToDatabase();
  if (!isValidSpecialization(input.specialization)) {
    throw new Error(`Unknown specialization: ${input.specialization}`);
  }

  const username = await generateUsername();
  const password = randomString(8);
  const permissions: ITeamPermissions = {
    ...buildDefaultPermissions(input.specialization),
    ...input.permissionOverrides,
  };

  const member = await User.create({
    name: input.name,
    username,
    email: input.email || undefined,
    phone: input.phone,
    passwordHash: await hashPassword(password),
    role: "team_member",
    status: "active",
    locale: "ar",
    mustChangePassword: true,
    teamProfile: {
      ownerCoachId: new Types.ObjectId(ownerCoachId),
      specialization: input.specialization,
      permissions,
      suspendedByOwner: false,
      invitedAt: new Date(),
    },
  });

  return {
    teamMemberId: member._id.toString(),
    credentials: { username, password },
  };
}

/** Update a team member's editable fields and/or permission bag, scoped to the owner coach. */
export async function updateTeamMember(
  ownerCoachId: string,
  teamMemberId: string,
  input: TeamMemberUpdateInput,
): Promise<boolean> {
  await connectToDatabase();
  const set: Record<string, unknown> = {};
  if (input.name !== undefined) set.name = input.name;
  if (input.email !== undefined) set.email = input.email || undefined;
  if (input.phone !== undefined) set.phone = input.phone;
  if (input.specialization !== undefined) {
    if (!isValidSpecialization(input.specialization)) {
      throw new Error(`Unknown specialization: ${input.specialization}`);
    }
    set["teamProfile.specialization"] = input.specialization;
  }
  if (input.permissions) {
    for (const [key, value] of Object.entries(input.permissions) as [TeamPermissionKey, boolean][]) {
      set[`teamProfile.permissions.${key}`] = value;
    }
  }

  const res = await User.updateOne(
    { _id: teamMemberId, role: "team_member", "teamProfile.ownerCoachId": new Types.ObjectId(ownerCoachId) },
    { $set: set },
  );
  return res.matchedCount > 0;
}

/** Suspend a team member's access (blocks login entirely) without deleting their account or history. */
export async function suspendTeamMember(ownerCoachId: string, teamMemberId: string): Promise<boolean> {
  await connectToDatabase();
  const res = await User.updateOne(
    { _id: teamMemberId, role: "team_member", "teamProfile.ownerCoachId": new Types.ObjectId(ownerCoachId) },
    { $set: { status: "suspended", "teamProfile.suspendedByOwner": true } },
  );
  return res.matchedCount > 0;
}

/** Lift a suspension, restoring login access. */
export async function reactivateTeamMember(ownerCoachId: string, teamMemberId: string): Promise<boolean> {
  await connectToDatabase();
  const res = await User.updateOne(
    { _id: teamMemberId, role: "team_member", "teamProfile.ownerCoachId": new Types.ObjectId(ownerCoachId) },
    { $set: { status: "active", "teamProfile.suspendedByOwner": false } },
  );
  return res.matchedCount > 0;
}

/** Hard-delete a team member (their own account only — never touches the clients/data they worked on, which stays owned by the coach). */
export async function deleteTeamMember(ownerCoachId: string, teamMemberId: string): Promise<boolean> {
  await connectToDatabase();
  const res = await User.deleteOne({
    _id: teamMemberId,
    role: "team_member",
    "teamProfile.ownerCoachId": new Types.ObjectId(ownerCoachId),
  });
  return res.deletedCount > 0;
}

/** Coach-initiated team member password reset: generates a new password shown once, forces a change on next login. */
export async function resetTeamMemberPassword(
  ownerCoachId: string,
  teamMemberId: string,
): Promise<{ password: string } | null> {
  await connectToDatabase();
  const member = await User.findOne({
    _id: teamMemberId,
    role: "team_member",
    "teamProfile.ownerCoachId": new Types.ObjectId(ownerCoachId),
  });
  if (!member) return null;

  const password = randomString(8);
  member.passwordHash = await hashPassword(password);
  member.mustChangePassword = true;
  await member.save();

  return { password };
}
