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
  Package,
  Bell,
  Home,
  TrendingUp,
  User,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { UserRole } from "@/lib/constants";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: number;
  /** match exactly (for index routes) instead of prefix */
  exact?: boolean;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

export function getCoachNav(t: Dictionary): NavSection[] {
  const n = t.dashboard.coachNav;
  const g = t.dashboard.groups;
  return [
    { items: [{ label: n.dashboard, href: "/coach", icon: LayoutDashboard, exact: true }] },
    {
      label: g.clients,
      items: [
        { label: n.allClients, href: "/coach/clients", icon: Users, exact: true },
        { label: n.addClient, href: "/coach/clients/new", icon: UserPlus },
      ],
    },
    {
      label: g.workout,
      items: [
        { label: n.exerciseLibrary, href: "/coach/exercises", icon: Dumbbell },
        { label: n.workoutTemplates, href: "/coach/templates", icon: Layers },
        { label: n.clientPrograms, href: "/coach/programs", icon: ClipboardList },
        { label: n.workoutReports, href: "/coach/workout-reports", icon: FileText },
      ],
    },
    {
      label: g.nutrition,
      items: [
        { label: n.foodLibrary, href: "/coach/nutrition/foods", icon: Apple },
        { label: n.nutritionTemplates, href: "/coach/nutrition/templates", icon: Salad },
        { label: n.clientNutritionPlans, href: "/coach/nutrition/plans", icon: NotebookPen },
        { label: n.nutritionProgress, href: "/coach/nutrition/progress", icon: TrendingUp },
      ],
    },
    {
      label: g.progress,
      items: [
        { label: n.checkins, href: "/coach/progress/checkins", icon: ClipboardCheck },
        { label: n.progressPhotos, href: "/coach/progress/photos", icon: Camera },
        { label: n.measurements, href: "/coach/progress/measurements", icon: Ruler },
      ],
    },
    {
      items: [
        { label: n.messages, href: "/coach/messages", icon: MessageSquare },
        { label: n.subscription, href: "/coach/subscription", icon: CreditCard },
        { label: n.settings, href: "/coach/settings", icon: Settings },
      ],
    },
  ];
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
        { label: n.systemLogs, href: "/admin/system-logs", icon: AlertTriangle },
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

export function getNavForRole(role: UserRole, t: Dictionary): NavSection[] {
  switch (role) {
    case "super_admin":
      return getAdminNav(t);
    case "coach":
      return getCoachNav(t);
    case "client":
      return getClientNav(t);
    default:
      return [];
  }
}
