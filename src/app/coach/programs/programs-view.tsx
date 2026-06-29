"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  ClipboardList,
  MoreHorizontal,
  Archive,
  Trash2,
  Pencil,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/components/providers/i18n-provider";
import { CopyDialog } from "@/components/copy/copy-dialog";
import { ActionErrorAlert, type ActionErrorInfo } from "@/components/dashboard/action-error-alert";
import {
  assignTemplateAction,
  archiveProgramAction,
  deleteProgramAction,
} from "@/lib/actions/programs";

export interface ProgramRow {
  id: string;
  clientName: string;
  nameAr: string;
  nameEn: string;
  status: "active" | "archived";
}
export interface PickItem {
  id: string;
  nameAr: string;
  nameEn: string;
}
export interface PickClient {
  id: string;
  name: string;
  code: string;
}

export function ProgramsView({
  programs,
  templates,
  nutritionTemplates,
  clients,
  canWrite,
}: {
  programs: ProgramRow[];
  templates: PickItem[];
  nutritionTemplates: PickItem[];
  clients: PickClient[];
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function archive(id: string) {
    startTransition(async () => { await archiveProgramAction(id); router.refresh(); });
  }
  function remove(id: string) {
    if (!window.confirm(`${t.common.delete}؟`)) return;
    startTransition(async () => { await deleteProgramAction(id); router.refresh(); });
  }

  return (
    <div>
      <PageHeader title={t.dashboard.coachNav.clientPrograms} description={L("البرامج التدريبية المُسندة لعملائك.", "Workout programs assigned to your clients.")}>
        {canWrite && (
          <>
            <CopyDialog workoutTemplates={templates} nutritionTemplates={nutritionTemplates} clients={clients} />
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{t.dashboard.ui.assignProgram}</Button>
          </>
        )}
      </PageHeader>

      {programs.length === 0 ? (
        <EmptyState icon={ClipboardList} title={t.common.emptyTitle} description={L("أسند قالب تدريب لعميل لإنشاء أول برنامج.", "Assign a template to a client to create the first program.")}>
          {canWrite && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{t.dashboard.ui.assignProgram}</Button>}
        </EmptyState>
      ) : (
        <Card className={isPending ? "opacity-60" : ""}>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.dashboard.ui.client}</TableHead>
                  <TableHead>{L("البرنامج", "Program")}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {programs.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.clientName}</TableCell>
                    <TableCell>{locale === "ar" ? p.nameAr : p.nameEn}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "active" ? "success" : "secondary"}>
                        {p.status === "active" ? t.account.active : L("مؤرشف", "Archived")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {canWrite && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link href={`/coach/programs/${p.id}`}><Pencil className="h-4 w-4" />{t.common.edit}</Link></DropdownMenuItem>
                            {p.status === "active" && <DropdownMenuItem onClick={() => archive(p.id)}><Archive className="h-4 w-4" />{L("أرشفة", "Archive")}</DropdownMenuItem>}
                            <DropdownMenuItem onClick={() => remove(p.id)} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" />{t.common.delete}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {canWrite && (
        <AssignDialog
          open={open}
          onOpenChange={setOpen}
          templates={templates}
          clients={clients}
          onSaved={() => { setOpen(false); router.refresh(); }}
        />
      )}
    </div>
  );
}

function AssignDialog({
  open,
  onOpenChange,
  templates,
  clients,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  templates: PickItem[];
  clients: PickClient[];
  onSaved: () => void;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [templateId, setTemplateId] = useState("");
  const [clientId, setClientId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ActionErrorInfo | null>(null);

  async function save() {
    if (!templateId || !clientId) return;
    setSaving(true);
    setError(null);
    const res = await assignTemplateAction(templateId, clientId);
    setSaving(false);
    if (res.ok) { setTemplateId(""); setClientId(""); onSaved(); }
    else setError({ error: res.error, code: res.code });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.dashboard.ui.assignProgram}</DialogTitle>
          <DialogDescription>{L("يتم إنشاء نسخة مستقلة — تعديل القالب لاحقاً لن يؤثر على برنامج العميل.", "An independent copy is created — editing the template later won't affect the client's program.")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{L("القالب", "Template")}</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger><SelectValue placeholder={L("اختر قالباً", "Select a template")} /></SelectTrigger>
              <SelectContent>{templates.map((tpl) => <SelectItem key={tpl.id} value={tpl.id}>{locale === "ar" ? tpl.nameAr : tpl.nameEn}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t.dashboard.ui.client}</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger><SelectValue placeholder={L("اختر عميلاً", "Select a client")} /></SelectTrigger>
              <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <ActionErrorAlert result={error} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button onClick={save} disabled={saving || !templateId || !clientId}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{t.dashboard.ui.assignProgram}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
