import type { UserRole } from "@/lib/constants";

/**
 * The kinds of media the app uploads. The CLIENT only ever tells the server a
 * `kind` (never a raw folder path) — the server derives the real, tenant-scoped
 * Cloudinary folder from the authenticated session. This makes cross-tenant
 * uploads structurally impossible: a caller cannot request an arbitrary folder.
 */
export const UPLOAD_KINDS = [
  "exercises",
  "foods",
  "messages",
  "progress",
  "nutrition",
  "branding",
  "avatar",
] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

export function isUploadKind(value: unknown): value is UploadKind {
  return typeof value === "string" && (UPLOAD_KINDS as readonly string[]).includes(value);
}

const ROOT = "trainygo";

/**
 * Builds the server-authoritative folder for an upload, scoped to the tenant.
 *
 * - coach / team_member → `trainygo/coach/{coachId}/{kind}` (team members
 *   upload into their owner coach's namespace, never their own).
 * - client              → `trainygo/clients/{clientId}/{kind}`.
 * - super_admin         → `trainygo/system/{kind}` (system exercises/foods).
 *
 * `scopeId` is the coachId for coach/team_member, the client's own id for a
 * client, and ignored for super_admin.
 */
export function buildTenantFolder(
  role: UserRole,
  scopeId: string,
  kind: UploadKind,
): string {
  switch (role) {
    case "coach":
    case "team_member":
      return `${ROOT}/coach/${scopeId}/${kind}`;
    case "client":
      return `${ROOT}/clients/${scopeId}/${kind}`;
    case "super_admin":
      return `${ROOT}/system/${kind}`;
    default:
      return `${ROOT}/misc/${scopeId}/${kind}`;
  }
}
