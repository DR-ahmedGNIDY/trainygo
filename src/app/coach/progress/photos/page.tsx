import { requireCoachArea } from "@/lib/auth/session";
import { canAccessRecovery } from "@/lib/permissions/team";
import { getCoachPhotoEntries } from "@/lib/services/progress";
import { PhotosView, type PhotoEntry } from "./photos-view";

export const dynamic = "force-dynamic";

export default async function ProgressPhotosPage() {
  const ctx = await requireCoachArea(canAccessRecovery);
  const raw = await getCoachPhotoEntries(ctx.coachId);

  const entries: PhotoEntry[] = raw.map((e) => ({
    client: ((e.client as unknown as { name?: string })?.name) ?? "—",
    date: String(e.date),
    photos: (e.photos ?? {}) as PhotoEntry["photos"],
  }));

  return <PhotosView entries={entries} />;
}
