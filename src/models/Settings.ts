import { Schema, model, models, type Model, type Types } from "mongoose";

/**
 * Platform-wide settings — a single document. Editable by the Super Admin so
 * branding, domain, support contact and offline payment details can change
 * without code edits.
 */
export interface ISettings {
  _id: Types.ObjectId;
  key: "global";
  platformName: string;
  domain: string;
  /** WhatsApp number (international format, no +) used by "Contact Administration". */
  adminWhatsapp: string;
  supportEmail?: string;
  payment: {
    vodafoneCashNumber?: string;
    instapayHandle?: string;
  };
  social?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    youtube?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    key: { type: String, default: "global", unique: true },
    platformName: { type: String, default: "Trainygo" },
    domain: { type: String, default: "trainygo.com" },
    adminWhatsapp: { type: String, default: "201000000000" },
    supportEmail: { type: String, default: "support@trainygo.com" },
    payment: {
      vodafoneCashNumber: { type: String, default: "" },
      instapayHandle: { type: String, default: "" },
    },
    social: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      twitter: { type: String, default: "" },
      youtube: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

export const Settings: Model<ISettings> =
  (models.Settings as Model<ISettings>) ||
  model<ISettings>("Settings", SettingsSchema);

export default Settings;
