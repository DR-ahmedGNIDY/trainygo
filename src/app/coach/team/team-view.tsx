"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Users,
  MoreHorizontal,
  Ban,
  CheckCircle2,
  Trash2,
  KeyRound,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/components/providers/i18n-provider";
import { TEAM_SPECIALIZATIONS, TEAM_PERMISSION_KEYS, type TeamSpecialization, type TeamPermissionKey } from "@/lib/constants";
import { buildDefaultPermissions } from "@/lib/permissions/team";
import {
  createTeamMemberAction,
  updateTeamMemberAction,
  suspendTeamMemberAction,
  reactivateTeamMemberAction,
  deleteTeamMemberAction,
  resetTeamMemberPasswordAction,
} from "@/lib/actions/team";
import type { AccountStatus } from "@/lib/constants";

const SPECIALIZATION_LABELS: Record<TeamSpecialization, { ar: string; en: string }> = {
  nutrition_specialist: { ar: "أخصائي تغذية", en: "Nutrition Specialist" },
  assistant_coach: { ar: "مدرب مساعد", en: "Assistant Coach" },
  fitness_coach: { ar: "مدرب لياقة", en: "Fitness Coach" },
  academy_manager: { ar: "مدير الأكاديمية", en: "Academy Manager" },
  physiotherapist: { ar: "أخصائي علاج طبيعي", en: "Physiotherapist" },
};

const PERMISSION_LABELS: Record<TeamPermissionKey, { ar: string; en: string }> = {
  canAccessNutrition: { ar: "التغذية", en: "Nutrition" },
  canAccessWorkout: { ar: "التمارين", en: "Workout" },
  canAccessReports: { ar: "التقارير", en: "Reports" },
  canManageClients: { ar: "إدارة العملاء", en: "Manage Clients" },
  canManageTeam: { ar: "إدارة الفريق", en: "Manage Team" },
  canManageSubscriptions: { ar: "إدارة الاشتراكات", en: "Manage Subscriptions" },
  canAccessBranding: { ar: "الهوية البصرية", en: "Branding" },
  canAccessBilling: { ar: "الفواتير", en: "Billing" },
  canAccessAnalytics: { ar: "التحليلات", en: "Analytics" },
  canAccessRecovery: { ar: "التعافي", en: "Recovery" },
  canAccessTemplates: { ar: "القوالب", en: "Templates" },
  canAccessFoods: { ar: "مكتبة الأطعمة", en: "Food Library" },
  canAccessExercises: { ar: "مكتبة التمارين", en: "Exercise Library" },
  canAccessMeasurements: { ar: "القياسات", en: "Measurements" },
  canAccessSystem: { ar: "النظام", en: "System" },
  canAccessSuperAdmin: { ar: "الإدارة العليا", en: "Super Admin" },
};

export interface TeamMemberRow {
  id: string;
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  status: AccountStatus;
  specialization: TeamSpecialization;
  permissions: Record<TeamPermissionKey, boolean>;
  suspendedByOwner: boolean;
  lastLoginAt: string | null;
}

export function TeamView({ members }: { members: TeamMemberRow[] }) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TeamMemberRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [newPassword, setNewPassword] = useState<string | null>(null);

  function suspend(id: string) {
    startTransition(async () => { await suspendTeamMemberAction(id); router.refresh(); });
  }
  function reactivate(id: string) {
    startTransition(async () => { await reactivateTeamMemberAction(id); router.refresh(); });
  }
  function remove(m: TeamMemberRow) {
    if (!window.confirm(L(`حذف ${m.name} من الفريق؟`, `Remove ${m.name} from the team?`))) return;
    startTransition(async () => { await deleteTeamMemberAction(m.id); router.refresh(); });
  }
  function resetPassword(id: string) {
    startTransition(async () => {
      const res = await resetTeamMemberPasswordAction(id);
      if (res.ok) setNewPassword(res.data!.password);
    });
  }

  return (
    <div>
      <PageHeader title={L("الفريق", "Team")} description={L("إدارة أعضاء الفريق وصلاحياتهم.", "Manage team members and their permissions.")}>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><UserPlus className="h-4 w-4" />{L("إضافة عضو", "Add member")}</Button>
      </PageHeader>

      {members.length === 0 ? (
        <EmptyState icon={Users} title={t.common.emptyTitle} description={t.common.emptyDescription}>
          <Button onClick={() => { setEditing(null); setOpen(true); }}><UserPlus className="h-4 w-4" />{L("إضافة عضو", "Add member")}</Button>
        </EmptyState>
      ) : (
        <Card className={isPending ? "opacity-60" : ""}>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.common.name}</TableHead>
                  <TableHead className="hidden sm:table-cell">{L("التخصص", "Specialization")}</TableHead>
                  <TableHead className="hidden md:table-cell">{t.common.email}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-xs text-muted-foreground" dir="ltr">{m.username}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{L(SPECIALIZATION_LABELS[m.specialization].ar, SPECIALIZATION_LABELS[m.specialization].en)}</TableCell>
                    <TableCell className="hidden text-muted-foreground md:table-cell" dir="ltr">{m.email || "—"}</TableCell>
                    <TableCell><StatusBadge status={m.status} /></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditing(m); setOpen(true); }}>
                            <KeyRound className="h-4 w-4" />{L("تعديل الصلاحيات", "Edit permissions")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => resetPassword(m.id)}>
                            <KeyRound className="h-4 w-4" />{L("إعادة تعيين كلمة المرور", "Reset password")}
                          </DropdownMenuItem>
                          {m.status === "suspended" ? (
                            <DropdownMenuItem onClick={() => reactivate(m.id)}><CheckCircle2 className="h-4 w-4" />{L("إعادة التفعيل", "Reactivate")}</DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => suspend(m.id)}><Ban className="h-4 w-4" />{L("إيقاف", "Suspend")}</DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => remove(m)} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" />{t.common.delete}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <TeamMemberDialog open={open} onOpenChange={setOpen} editing={editing} onSaved={() => { setOpen(false); router.refresh(); }} />

      <Dialog open={!!newPassword} onOpenChange={(o) => !o && setNewPassword(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{L("كلمة المرور الجديدة", "New password")}</DialogTitle></DialogHeader>
          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
            <span className="text-sm text-muted-foreground">{L("كلمة المرور", "Password")}</span>
            <code className="font-mono text-sm font-semibold" dir="ltr">{newPassword}</code>
          </div>
          <DialogFooter>
            <Button onClick={() => setNewPassword(null)}>{t.common.close}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TeamMemberDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: TeamMemberRow | null;
  onSaved: () => void;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [specialization, setSpecialization] = useState<TeamSpecialization>("assistant_coach");
  const [permissions, setPermissions] = useState<Record<TeamPermissionKey, boolean>>(buildDefaultPermissions("assistant_coach"));
  const [creds, setCreds] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCreds(null);
    setError(null);
    if (editing) {
      setName(editing.name);
      setEmail(editing.email ?? "");
      setPhone(editing.phone ?? "");
      setSpecialization(editing.specialization);
      setPermissions({ ...buildDefaultPermissions(editing.specialization), ...editing.permissions });
    } else {
      setName(""); setEmail(""); setPhone("");
      setSpecialization("assistant_coach");
      setPermissions(buildDefaultPermissions("assistant_coach"));
    }
  }, [open, editing]);

  function onSpecializationChange(v: string) {
    const spec = v as TeamSpecialization;
    setSpecialization(spec);
    if (!editing) setPermissions(buildDefaultPermissions(spec));
  }

  async function save() {
    setSaving(true);
    setError(null);
    if (editing) {
      const res = await updateTeamMemberAction(editing.id, { name, email, phone, specialization, permissions });
      setSaving(false);
      if (!res.ok) return setError(res.error);
      onSaved();
      return;
    }
    const res = await createTeamMemberAction({ name, email, phone, specialization });
    if (!res.ok) {
      setSaving(false);
      return setError(res.error);
    }
    const permRes = await updateTeamMemberAction(res.data!.teamMemberId, { permissions });
    setSaving(false);
    // The member exists either way, so surface the credentials regardless —
    // losing them would strand an account whose password is shown only once.
    setCreds(res.data!.credentials);
    if (!permRes.ok) setError(permRes.error);
  }

  function copyAll() {
    if (!creds) return;
    navigator.clipboard?.writeText(`${L("اسم المستخدم", "Username")}: ${creds.username}\n${L("كلمة المرور", "Password")}: ${creds.password}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (creds) {
    return (
      <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) onSaved(); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{L("تم إنشاء عضو الفريق", "Team member created")}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {[
              { k: L("اسم المستخدم", "Username"), v: creds.username },
              { k: L("كلمة المرور المؤقتة", "Temporary password"), v: creds.password },
            ].map((row) => (
              <div key={row.k} className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
                <span className="text-sm text-muted-foreground">{row.k}</span>
                <code className="font-mono text-sm font-semibold" dir="ltr">{row.v}</code>
              </div>
            ))}
          </div>
          {error && (
            <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button onClick={copyAll} className="gap-2">{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? t.common.copied : L("نسخ البيانات", "Copy details")}</Button>
            <Button variant="outline" onClick={() => { onOpenChange(false); onSaved(); }}>{t.common.close}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? L("تعديل عضو الفريق", "Edit team member") : L("إضافة عضو للفريق", "Add team member")}</DialogTitle></DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label>{t.common.name}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-2"><Label>{t.common.email} <span className="text-xs text-muted-foreground">({t.common.optional})</span></Label><Input dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-2"><Label>{t.common.phone} <span className="text-xs text-muted-foreground">({t.common.optional})</span></Label><Input dir="ltr" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{L("التخصص", "Specialization")}</Label>
            <Select value={specialization} onValueChange={onSpecializationChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEAM_SPECIALIZATIONS.map((s) => <SelectItem key={s} value={s}>{L(SPECIALIZATION_LABELS[s].ar, SPECIALIZATION_LABELS[s].en)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>{L("الصلاحيات", "Permissions")}</Label>
            <div className="grid grid-cols-2 gap-2 rounded-md border border-input p-3 sm:grid-cols-3">
              {TEAM_PERMISSION_KEYS.filter((k) => k !== "canAccessSuperAdmin").map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={permissions[key] ?? false}
                    onChange={(e) => setPermissions((p) => ({ ...p, [key]: e.target.checked }))}
                  />
                  {L(PERMISSION_LABELS[key].ar, PERMISSION_LABELS[key].en)}
                </label>
              ))}
            </div>
          </div>
        </div>
        {error && (
          <p role="alert" className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button onClick={save} disabled={saving || !name}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{t.common.save}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
