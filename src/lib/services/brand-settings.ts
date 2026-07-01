import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";

export type BrandSettings = NonNullable<
  NonNullable<InstanceType<typeof User>["coachProfile"]>["brandSettings"]
>;

/** FITXNET's own default branding — used whenever a coach has no white-label config. */
export const FITXNET_DEFAULT_BRAND: BrandSettings = {
  academyName: "FITXNET",
  logo: undefined,
  primaryColor: "#DC2626",
  secondaryColor: "#111827",
  buttonColor: "#DC2626",
  headerColor: "#111827",
  sidebarColor: "#0B0B0B",
  linkColor: "#DC2626",
  loginImage: undefined,
  dashboardImage: undefined,
  favicon: undefined,
  showFitxnetBadge: true,
};

/** Raw brand settings as stored on the coach, or null if not configured. */
export async function getBrandSettings(
  coachId: string,
): Promise<BrandSettings | null> {
  await connectToDatabase();
  const coach = await User.findById(coachId).select("coachProfile.brandSettings").lean();
  const brand = coach?.coachProfile?.brandSettings;
  return brand ? (brand as BrandSettings) : null;
}

/** Coach's brand settings merged over FITXNET defaults — always returns a complete object. */
export async function getEffectiveBrand(
  coachId?: string | null,
): Promise<BrandSettings> {
  if (!coachId) return { ...FITXNET_DEFAULT_BRAND };
  const brand = await getBrandSettings(coachId);
  if (!brand) return { ...FITXNET_DEFAULT_BRAND };
  return { ...FITXNET_DEFAULT_BRAND, ...brand };
}

/** Resolve a client's coach and return that coach's effective brand. For client-facing pages. */
export async function getEffectiveBrandForClient(
  clientId: string,
): Promise<BrandSettings> {
  await connectToDatabase();
  const client = await User.findById(clientId).select("clientProfile.coach").lean();
  const coachId = client?.clientProfile?.coach?.toString();
  return getEffectiveBrand(coachId);
}

export async function updateBrandSettings(
  coachId: string,
  patch: Partial<BrandSettings>,
): Promise<BrandSettings> {
  await connectToDatabase();
  const coach = await User.findById(coachId);
  if (!coach || coach.role !== "coach") {
    throw new Error("Coach not found");
  }
  const current = coach.coachProfile?.brandSettings ?? FITXNET_DEFAULT_BRAND;
  const merged = { ...FITXNET_DEFAULT_BRAND, ...current, ...patch } as BrandSettings;
  if (!coach.coachProfile) {
    throw new Error("Coach profile missing");
  }
  coach.coachProfile.brandSettings = merged;
  coach.markModified("coachProfile.brandSettings");
  await coach.save();
  return merged;
}

export async function resetBrandSettings(coachId: string): Promise<void> {
  await connectToDatabase();
  await User.updateOne(
    { _id: coachId, role: "coach" },
    { $unset: { "coachProfile.brandSettings": "" } },
  );
}
