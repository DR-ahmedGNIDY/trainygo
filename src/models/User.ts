import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  ACCOUNT_STATUSES,
  CLIENT_GOALS,
  CLIENT_FREEZE_STATUSES,
  GENDERS,
  LOCALES,
  PLAN_TIERS,
  TEAM_PERMISSION_KEYS,
  TEAM_SPECIALIZATIONS,
  THEMES,
  USER_ROLES,
  type AccountStatus,
  type ClientFreezeStatus,
  type ClientGoal,
  type Gender,
  type Locale,
  type PlanTier,
  type TeamPermissionKey,
  type TeamSpecialization,
  type Theme,
  type UserRole,
} from "@/lib/constants";
import type { IPlanFeatures } from "@/models/Plan";

/** Embedded media reference (Cloudinary). */
export interface IMedia {
  url: string;
  publicId?: string;
}

/** Coach-specific profile, populated only when role === "coach". */
export interface ICoachProfile {
  /** Coach's public brand / business name (shown to their clients). */
  brandName?: string;
  whatsappNumber?: string;
  trialStartDate?: Date;
  trialEndDate?: Date;
  currentPlan?: Types.ObjectId | null;
  subscriptionStatus?: AccountStatus;
  subscriptionStartDate?: Date | null;
  subscriptionEndDate?: Date | null;
  /** Denormalized snapshot of the plan at activation time, so it still reads correctly if the plan is later edited/deleted. */
  subscriptionPlanName?: { ar: string; en: string };
  subscriptionTier?: PlanTier;
  planFeatures?: IPlanFeatures;
  maxClients: number;
  /** Max team members this coach may create. 0 = none (trial default); undefined = unlimited (legacy/paid). */
  maxTeamMembers?: number;
  /** True while a super admin has manually suspended this coach's subscription (status forced to "expired"). */
  suspendedByAdmin?: boolean;
  /** Status to restore when the admin lifts the manual suspension. */
  preSuspendStatus?: AccountStatus;
  /**
   * Per-feature manual overrides set by a super admin.
   * `true`  → force-enable regardless of plan.
   * `false` → force-disable regardless of plan.
   * `null` / absent → defer to plan's `planFeatures`.
   */
  featureOverrides?: {
    branding?: boolean | null;
  };
  /** White-label branding configuration for this coach's academy. Optional — absence means use FITXNET defaults. */
  brandSettings?: {
    academyName: string;
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    buttonColor: string;
    headerColor: string;
    sidebarColor: string;
    linkColor: string;
    loginImage?: string;
    dashboardImage?: string;
    favicon?: string;
    showFitxnetBadge: boolean;
  };
}

/** Full grant of every team permission — a coach acting in their own area, or a super admin, is never limited by the team permission bag. */
export type ITeamPermissions = Record<TeamPermissionKey, boolean>;

/**
 * Team-member-specific profile, populated only when role === "team_member".
 * A team member is staff hired by a coach (nutrition specialist, assistant
 * coach, etc.) who acts on the owner coach's data — never their own. Every
 * data query for a team member must use `ownerCoachId`, never the team
 * member's own `_id`.
 */
export interface ITeamProfile {
  /** The coach account this staff member works for. All data scoping keys off this, never the team member's own _id. */
  ownerCoachId: Types.ObjectId;
  /** Preset label used only to seed default permissions on creation — the coach can freely customize permissions afterward. Never read for authorization decisions. */
  specialization: TeamSpecialization;
  /** The actual authority granted to this team member. Every canAccessX()/canManageX() check reads from here, never from `specialization`. */
  permissions: ITeamPermissions;
  /** True while the owner coach has manually suspended this team member's access (independent of the owner's own subscription status). */
  suspendedByOwner?: boolean;
  invitedAt: Date;
}

/** Client-specific profile, populated only when role === "client". */
export interface IClientProfile {
  coach: Types.ObjectId;
  /** Unique human-friendly client code, e.g. "TRG-7F3K9". Generated on creation. */
  clientCode: string;
  age?: number;
  gender?: Gender;
  height?: number; // cm
  startWeight?: number; // kg
  currentWeight?: number; // kg
  goal?: ClientGoal;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date | null;
  active: boolean;
  /**
   * Coach-initiated subscription freeze. "active" = running normally;
   * "frozen" = temporarily paused by the coach, preserving `remainingDays`
   * so the client resumes with the exact days they had left. This is NOT
   * cancellation. Defaults to "active".
   */
  subscriptionFreezeStatus?: ClientFreezeStatus;
  /** When the current freeze began (set on freeze, kept for history/timeline). */
  freezeStartDate?: Date | null;
  /** When the most recent freeze was resumed (set on resume). */
  freezeEndDate?: Date | null;
  /** Days left on the subscription captured at freeze time — never lost while frozen. */
  remainingDays?: number | null;
  /** Cumulative total of days the client has spent frozen across all freeze periods. */
  totalFrozenDays?: number;
  /** Free-text reason recorded for the current/most-recent freeze. */
  freezeReason?: string;
  /** The coach/team member who performed the last freeze or resume (audit). */
  lastFreezeBy?: Types.ObjectId | null;
}

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  username: string;
  email?: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  status: AccountStatus;
  /** Bumped to invalidate all existing JWTs for this user (suspend, password reset, forced logout). */
  sessionVersion: number;
  locale: Locale;
  theme: Theme;
  avatar?: IMedia;
  mustChangePassword: boolean;
  lastLoginAt?: Date;
  coachProfile?: ICoachProfile;
  clientProfile?: IClientProfile;
  teamProfile?: ITeamProfile;
  createdAt: Date;
  updatedAt: Date;
}

const MediaSchema = new Schema<IMedia>(
  {
    url: { type: String, required: true },
    publicId: { type: String },
  },
  { _id: false },
);

const BrandSettingsSchema = new Schema<NonNullable<ICoachProfile["brandSettings"]>>(
  {
    academyName: { type: String, trim: true, default: "FITXNET" },
    logo: { type: String, default: null },
    primaryColor: { type: String, default: "#DC2626" },
    secondaryColor: { type: String, default: "#111827" },
    buttonColor: { type: String, default: "#DC2626" },
    headerColor: { type: String, default: "#111827" },
    sidebarColor: { type: String, default: "#0B0B0B" },
    linkColor: { type: String, default: "#DC2626" },
    loginImage: { type: String, default: null },
    dashboardImage: { type: String, default: null },
    favicon: { type: String, default: null },
    showFitxnetBadge: { type: Boolean, default: true },
  },
  { _id: false },
);

const CoachProfileSchema = new Schema<ICoachProfile>(
  {
    brandName: { type: String, trim: true },
    whatsappNumber: { type: String, trim: true },
    trialStartDate: { type: Date },
    trialEndDate: { type: Date },
    currentPlan: { type: Schema.Types.ObjectId, ref: "Plan", default: null },
    subscriptionStatus: { type: String, enum: ACCOUNT_STATUSES },
    subscriptionStartDate: { type: Date, default: null },
    subscriptionEndDate: { type: Date, default: null },
    subscriptionPlanName: {
      type: new Schema({ ar: { type: String, default: "" }, en: { type: String, default: "" } }, { _id: false }),
    },
    subscriptionTier: { type: String, enum: PLAN_TIERS },
    planFeatures: {
      type: new Schema(
        {
          branding: { type: Boolean, default: false },
          aiCoach: { type: Boolean, default: false },
          customDomain: { type: Boolean, default: false },
          apiAccess: { type: Boolean, default: false },
          pdfBranding: { type: Boolean, default: false },
          advancedAnalytics: { type: Boolean, default: false },
        },
        { _id: false },
      ),
    },
    maxClients: { type: Number, default: 0 },
    maxTeamMembers: { type: Number, default: undefined },
    suspendedByAdmin: { type: Boolean, default: false },
    preSuspendStatus: { type: String, enum: ACCOUNT_STATUSES },
    featureOverrides: {
      type: new Schema({ branding: { type: Boolean, default: null } }, { _id: false }),
    },
    brandSettings: { type: BrandSettingsSchema },
  },
  { _id: false },
);

const TeamPermissionsSchema = new Schema<ITeamPermissions>(
  Object.fromEntries(TEAM_PERMISSION_KEYS.map((key) => [key, { type: Boolean, default: false }])) as Record<
    TeamPermissionKey,
    { type: BooleanConstructor; default: boolean }
  >,
  { _id: false },
);

const TeamProfileSchema = new Schema<ITeamProfile>(
  {
    ownerCoachId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    specialization: { type: String, enum: TEAM_SPECIALIZATIONS, required: true },
    permissions: { type: TeamPermissionsSchema, default: () => ({}) },
    suspendedByOwner: { type: Boolean, default: false },
    invitedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ClientProfileSchema = new Schema<IClientProfile>(
  {
    coach: { type: Schema.Types.ObjectId, ref: "User", required: true },
    clientCode: { type: String, trim: true, uppercase: true },
    age: { type: Number, min: 0, max: 120 },
    gender: { type: String, enum: GENDERS },
    height: { type: Number, min: 0 },
    startWeight: { type: Number, min: 0 },
    currentWeight: { type: Number, min: 0 },
    goal: { type: String, enum: CLIENT_GOALS },
    subscriptionStartDate: { type: Date },
    subscriptionEndDate: { type: Date, default: null },
    active: { type: Boolean, default: true },
    subscriptionFreezeStatus: { type: String, enum: CLIENT_FREEZE_STATUSES, default: "active" },
    freezeStartDate: { type: Date, default: null },
    freezeEndDate: { type: Date, default: null },
    remainingDays: { type: Number, default: null },
    totalFrozenDays: { type: Number, default: 0 },
    freezeReason: { type: String, trim: true },
    lastFreezeBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: false },
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, required: true, index: true },
    status: {
      type: String,
      enum: ACCOUNT_STATUSES,
      default: "active",
      index: true,
    },
    sessionVersion: { type: Number, default: 0 },
    locale: { type: String, enum: LOCALES, default: "ar" },
    theme: { type: String, enum: THEMES, default: "system" },
    avatar: { type: MediaSchema },
    mustChangePassword: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    coachProfile: { type: CoachProfileSchema },
    clientProfile: { type: ClientProfileSchema },
    teamProfile: { type: TeamProfileSchema },
  },
  { timestamps: true },
);

// Common lookups
UserSchema.index({ "clientProfile.coach": 1, role: 1 });
// Fast "frozen clients for this coach" widget/filter lookups.
UserSchema.index({ "clientProfile.coach": 1, "clientProfile.subscriptionFreezeStatus": 1 });
UserSchema.index({ "teamProfile.ownerCoachId": 1, role: 1 });
UserSchema.index({ role: 1, status: 1 });
// Unique client code (only clients have one — sparse avoids null collisions)
UserSchema.index(
  { "clientProfile.clientCode": 1 },
  { unique: true, sparse: true },
);

export const User: Model<IUser> =
  (models.User as Model<IUser>) || model<IUser>("User", UserSchema);

export default User;
