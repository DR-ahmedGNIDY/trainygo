import { Schema, model, models, type Model, type Types } from "mongoose";
import {
  ACCOUNT_STATUSES,
  CLIENT_GOALS,
  GENDERS,
  LOCALES,
  THEMES,
  USER_ROLES,
  type AccountStatus,
  type ClientGoal,
  type Gender,
  type Locale,
  type Theme,
  type UserRole,
} from "@/lib/constants";

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
  subscriptionEndDate?: Date | null;
  maxClients: number;
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
  locale: Locale;
  theme: Theme;
  avatar?: IMedia;
  mustChangePassword: boolean;
  lastLoginAt?: Date;
  coachProfile?: ICoachProfile;
  clientProfile?: IClientProfile;
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
    subscriptionEndDate: { type: Date, default: null },
    maxClients: { type: Number, default: 0 },
    suspendedByAdmin: { type: Boolean, default: false },
    preSuspendStatus: { type: String, enum: ACCOUNT_STATUSES },
    featureOverrides: {
      type: new Schema({ branding: { type: Boolean, default: null } }, { _id: false }),
    },
    brandSettings: { type: BrandSettingsSchema },
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
    locale: { type: String, enum: LOCALES, default: "ar" },
    theme: { type: String, enum: THEMES, default: "system" },
    avatar: { type: MediaSchema },
    mustChangePassword: { type: Boolean, default: false },
    lastLoginAt: { type: Date },
    coachProfile: { type: CoachProfileSchema },
    clientProfile: { type: ClientProfileSchema },
  },
  { timestamps: true },
);

// Common lookups
UserSchema.index({ "clientProfile.coach": 1, role: 1 });
UserSchema.index({ role: 1, status: 1 });
// Unique client code (only clients have one — sparse avoids null collisions)
UserSchema.index(
  { "clientProfile.clientCode": 1 },
  { unique: true, sparse: true },
);

export const User: Model<IUser> =
  (models.User as Model<IUser>) || model<IUser>("User", UserSchema);

export default User;
