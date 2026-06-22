import { requireRole } from "@/lib/auth/session";
import { getCoachPhotoEntries } from "@/lib/services/progress";
import { PhotosView, type PhotoEntry } from "./photos-view";

export const dynamic = "force-dynamic";

export default async function ProgressPhotosPage() {
  const session = await requireRole("coach");
  const raw = await getCoachPhotoEntries(session.user.id);

  const entries: PhotoEntry[] = raw.map((e) => ({
    client: ((e.client as unknown as { name?: string })?.name) ?? "—",
    date: String(e.date),
    photos: (e.photos ?? {}) as PhotoEntry["photos"],
  }));

  return <PhotosView entries={entries} />;
}
