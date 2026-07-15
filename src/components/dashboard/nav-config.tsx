import {
  LayoutDashboard,
  Users,
  UserPlus,
  Dumbbell,
  Layers,
  ClipboardList,
  Apple,
  Salad,
  NotebookPen,
  ClipboardCheck,
  FileText,
  Camera,
  Ruler,
  MessageSquare,
  CreditCard,
  Settings,
  Palette,
  Package,
  Bell,
  Home,
  TrendingUp,
  User,
  AlertTriangle,
  RotateCcw,
  Wrench,
  UserCog,
  RefreshCw,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { TeamPermissionKey, UserRole } from "@/lib/constants";
import type { TeamPermissionContext } from "@/lib/permissions/team";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  /** match exactly (for index routes) instead of prefix */
  exact?: boolean;
  /** Permission required to see this item — only enforced for team members; coaches/admins always see everything. Sidebar isolation must always be driven by this, never by hardcoding role checks. */
  permission?: TeamPermissionKey;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

/** Drops nav items (and now-empty sections) a team member's permission bag doesn't grant. Coaches/admins are never filtered — `ctx` is only passed for role === "team_member". */
function filterNavByPermissions(sections: NavSection[], ctx?: TeamPermissionContext): NavSection[] {
  if (!ctx || ctx.role !== "team_member") return sections;
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.permission || ctx.permissions[item.permission]),
    }))
    .filter((section) => section.items.length > 0);
}

export function getCoachNav(t: Dictionary, opts?: { branding?: boolean; teamCtx?: TeamPermissionContext }): NavSection[] {
  const n = t.dashboard.coachNav;
  const g = t.dashboard.groups;
  const sections: NavSection[] = [
    { items: [{ label: n.dashboard, href: "/coach", icon: LayoutDashboard, exact: true }] },
    {
      label: g.clients,
      items: [
        { label: n.allClients, href: "/coach/clients", icon: Users, exact: true, permission: "canManageClients" },
        { label: n.addClient, href: "/coach/clients/new", icon: UserPlus, permission: "canManageClients" },
      ],
    },
    {
      label: g.workout,
      items: [
        { label: n.exerciseLibrary, href: "/coach/exercises", icon: Dumbbell, permission: "canAccessExercises" },
        { label: n.workoutTemplates, href: "/coach/templates", icon: Layers, permission: "canAccessTemplates" },
        { label: n.clientPrograms, href: "/coach/programs", icon: ClipboardList, permission: "canAccessWorkout" },
        { label: n.workoutReports, href: "/coach/workout-reports", icon: FileText, permission: "canAccessReports" },
        { label: n.changeRequests, href: "/coach/exercise-change-requests", icon: RefreshCw, permission: "canAccessWorkout" },
      ],
    },
    {
      label: g.nutrition,
      items: [
        { label: n.foodLibrary, href: "/coach/nutrition/foods", icon: Apple, permission: "canAccessFoods" },
        { label: n.nutritionGenerator, href: "/coach/nutrition/generator", icon: Sparkles, permission: "canAccessTemplates" },
        { label: n.nutritionTemplates, href: "/coach/nutrition/templates", icon: Salad, permission: "canAccessTemplates" },
        { label: n.clientNutritionPlans, href: "/coach/nutrition/plans", icon: NotebookPen, permission: "canAccessNutrition" },
        { label: n.nutritionProgress, href: "/coach/nutrition/progress", icon: TrendingUp, permission: "canAccessNutrition" },
      ],
    },
    {
      label: g.progress,
      items: [
        { label: n.checkins, href: "/coach/progress/checkins", icon: ClipboardCheck, permission: "canAccessRecovery" },
        { label: n.progressPhotos, href: "/coach/progress/photos", icon: Camera, permission: "canAccessRecovery" },
        { label: n.measurements, href: "/coach/progress/measurements", icon: Ruler, permission: "canAccessMeasurements" },
      ],
    },
    {
      items: [
        { label: n.messages, href: "/coach/messages", icon: MessageSquare },
        { label: n.subscription, href: "/coach/subscription", icon: CreditCard, permission: "canManageSubscriptions" },
        { label: n.team, href: "/coach/team", icon: UserCog, permission: "canManageTeam" },
        ...(opts?.branding ? [{ label: n.branding, href: "/coach/branding", icon: Palette, permission: "canAccessBranding" as const }] : []),
        { label: n.settings, href: "/coach/settings", icon: Settings },
      ],
    },
  ];
  return filterNavByPermissions(sections, opts?.teamCtx);
}

export function getAdminNav(t: Dictionary): NavSection[] {
  const n = t.dashboard.adminNav;
  return [
    {
      items: [
        { label: n.dashboard, href: "/admin", icon: LayoutDashboard, exact: true },
        { label: n.coaches, href: "/admin/coaches", icon: Users },
        { label: n.plans, href: "/admin/plans", icon: Package },
      ],
    },
    {
      items: [
        { label: n.exercises, href: "/admin/exercises", icon: Dumbbell },
        { label: n.foods, href: "/admin/foods", icon: Apple },
      ],
    },
    {
      items: [
        { label: n.notifications, href: "/admin/notifications", icon: Bell },
      ],
    },
    {
      label: n.system,
      items: [
        { label: n.systemLogs, href: "/admin/system-logs", icon: AlertTriangle },
        { label: n.resetPlans, href: "/admin/system/plans-reset", icon: RotateCcw },
        { label: n.repairPlanDuration, href: "/admin/system/repair-plan-duration", icon: Wrench },
      ],
    },
    {
      items: [
        { label: n.settings, href: "/admin/settings", icon: Settings },
      ],
    },
  ];
}

export function getClientNav(t: Dictionary): NavSection[] {
  const n = t.dashboard.clientNav;
  return [
    {
      items: [
        { label: n.home, href: "/client", icon: Home, exact: true },
        { label: n.workout, href: "/client/workout", icon: Dumbbell },
        { label: n.nutrition, href: "/client/nutrition", icon: Apple },
        { label: n.progress, href: "/client/progress", icon: TrendingUp },
        { label: n.checkin, href: "/client/checkin", icon: ClipboardCheck },
        { label: n.messages, href: "/client/messages", icon: MessageSquare },
        { label: n.profile, href: "/client/profile", icon: User },
      ],
    },
  ];
}

export function getNavForRole(
  role: UserRole,
  t: Dictionary,
  opts?: { branding?: boolean; teamCtx?: TeamPermissionContext },
): NavSection[] {
  switch (role) {
    case "super_admin":
      return getAdminNav(t);
    case "coach":
    case "team_member":
      // Team members share the coach's nav config, filtered down to only
      // the sections their permission bag grants (see filterNavByPermissions
      // above) — never a separate hardcoded nav tree per role.
      return getCoachNav(t, opts);
    case "client":
      return getClientNav(t);
    default:
      return [];
  }
}
