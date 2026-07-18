"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, NotebookPen, MoreHorizontal, Archive, Trash2, Pencil, Loader2, ImageIcon, ListTree, X } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
import { ActionErrorAlert, type ActionErrorInfo } from "@/components/dashboard/action-error-alert";
import { CloudinaryUpload } from "@/components/media/cloudinary-upload";
import {
  assignNutritionTemplateAction,
  archiveNutritionPlanAction,
  deleteNutritionPlanAction,
} from "@/lib/actions/programs";
import {
  createNutritionImagePlanAction,
  updateNutritionImagePlanAction,
  archiveNutritionImagePlanAction,
  deleteNutritionImagePlanAction,
} from "@/lib/actions/nutrition-image-plans";

export type PlanKind = "structured" | "image";
export interface PlanImage { url: string; publicId?: string }

export interface PlanRow {
  id: string;
  kind: PlanKind;
  clientName: string;
  nameAr: string;
  nameEn: string;
  calories: number;
  status: "active" | "archived";
  createdAt: string;
  /** Image plans only. */
  images?: PlanImage[];
  note?: string;
}
export interface PickItem { id: string; nameAr: string; nameEn: string }
export interface PickClient { id: string; name: string; code: string }

export function NutritionPlansView({
  plans,
  templates,
  clients,
  canWrite,
}: {
  plans: PlanRow[];
  templates: PickItem[];
  clients: PickClient[];
  canWrite: boolean;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PlanRow | null>(null);
  const [isPending, startTransition] = useTransition();

  function archive(row: PlanRow) {
    startTransition(async () => {
      await (row.kind === "image"
        ? archiveNutritionImagePlanAction(row.id)
        : archiveNutritionPlanAction(row.id));
      router.refresh();
    });
  }
  function remove(row: PlanRow) {
    if (!window.confirm(`${t.common.delete}؟`)) return;
    startTransition(async () => {
      await (row.kind === "image"
        ? deleteNutritionImagePlanAction(row.id)
        : deleteNutritionPlanAction(row.id));
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader title={t.dashboard.coachNav.clientNutritionPlans} description={L("خطط التغذية المُسندة لعملائك.", "Nutrition plans assigned to your clients.")}>
        {canWrite && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{L("إسناد خطة", "Assign plan")}</Button>}
      </PageHeader>

      {plans.length === 0 ? (
        <EmptyState icon={NotebookPen} title={t.common.emptyTitle} description={L("أسند قالب تغذية لعميل أو ارفع صورة الخطة لإنشاء أول خطة.", "Assign a nutrition template to a client, or upload a plan image, to create the first plan.")}>
          {canWrite && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" />{L("إسناد خطة", "Assign plan")}</Button>}
        </EmptyState>
      ) : (
        <Card className={isPending ? "opacity-60" : ""}>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.dashboard.ui.client}</TableHead>
                  <TableHead>{L("الخطة", "Plan")}</TableHead>
                  <TableHead>{L("النوع", "Type")}</TableHead>
                  <TableHead>{t.client.calories}</TableHead>
                  <TableHead>{t.common.status}</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((p) => (
                  <TableRow key={`${p.kind}-${p.id}`}>
                    <TableCell className="font-medium">{p.clientName}</TableCell>
                    <TableCell>{locale === "ar" ? p.nameAr : p.nameEn}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        {p.kind === "image" ? <ImageIcon className="h-3.5 w-3.5" /> : <ListTree className="h-3.5 w-3.5" />}
                        {p.kind === "image" ? L("صورة", "Image") : L("يدوية", "Manual")}
                      </span>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {p.kind === "image" ? "—" : `${p.calories} ${t.client.calories}`}
                    </TableCell>
                    <TableCell><Badge variant={p.status === "active" ? "success" : "secondary"}>{p.status === "active" ? t.account.active : L("مؤرشف", "Archived")}</Badge></TableCell>
                    <TableCell>
                      {canWrite && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {p.kind === "image" ? (
                              <DropdownMenuItem onClick={() => setEditing(p)}><Pencil className="h-4 w-4" />{t.common.edit}</DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem asChild><Link href={`/coach/nutrition/plans/${p.id}`}><Pencil className="h-4 w-4" />{t.common.edit}</Link></DropdownMenuItem>
                            )}
                            {p.status === "active" && <DropdownMenuItem onClick={() => archive(p)}><Archive className="h-4 w-4" />{L("أرشفة", "Archive")}</DropdownMenuItem>}
                            <DropdownMenuItem onClick={() => remove(p)} className="text-destructive focus:text-destructive"><Trash2 className="h-4 w-4" />{t.common.delete}</DropdownMenuItem>
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
        <>
          <AssignDialog open={open} onOpenChange={setOpen} templates={templates} clients={clients} onSaved={() => { setOpen(false); router.refresh(); }} />
          <EditImagePlanDialog plan={editing} onOpenChange={(v) => { if (!v) setEditing(null); }} onSaved={() => { setEditing(null); router.refresh(); }} />
        </>
      )}
    </div>
  );
}

/**
 * Assigning starts with a choice between the two parallel systems: the
 * existing template-based plan, or a plan the coach photographs and uploads.
 */
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
  const [mode, setMode] = useState<PlanKind | null>(null);

  function close(v: boolean) {
    if (!v) setMode(null);
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{L("إسناد خطة تغذية", "Assign nutrition plan")}</DialogTitle>
          <DialogDescription>
            {mode === null
              ? L("اختر طريقة إضافة الخطة.", "Choose how you want to add the plan.")
              : mode === "structured"
                ? L("يتم إنشاء نسخة مستقلة مع إعادة حساب الماكروز تلقائياً.", "An independent copy is created and macros are recalculated automatically.")
                : L("ارفع صورة الخطة من هاتفك — سيراها العميل كما هي.", "Upload the plan image from your phone — the client sees it as-is.")}
          </DialogDescription>
        </DialogHeader>

        {mode === null ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <ModeCard
              icon={<ListTree className="h-5 w-5 text-primary" />}
              title={L("خطة يدوية", "Manual plan")}
              description={L("من قالب، بوجبات وماكروز ومتابعة التزام.", "From a template, with meals, macros and adherence tracking.")}
              onClick={() => setMode("structured")}
            />
            <ModeCard
              icon={<ImageIcon className="h-5 w-5 text-primary" />}
              title={L("صورة", "Image")}
              description={L("ارفع صورة الخطة مباشرة — عرض فقط.", "Upload the plan as an image — view only.")}
              onClick={() => setMode("image")}
            />
          </div>
        ) : mode === "structured" ? (
          <StructuredAssignForm templates={templates} clients={clients} onBack={() => setMode(null)} onSaved={onSaved} />
        ) : (
          <ImagePlanForm clients={clients} onBack={() => setMode(null)} onSaved={onSaved} />
        )}

        {mode === null && (
          <DialogFooter>
            <Button variant="outline" onClick={() => close(false)}>{t.common.cancel}</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ModeCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-lg border p-4 text-start transition-colors hover:border-primary hover:bg-accent"
    >
      {icon}
      <span className="font-medium">{title}</span>
      <span className="text-xs text-muted-foreground">{description}</span>
    </button>
  );
}

function StructuredAssignForm({
  templates,
  clients,
  onBack,
  onSaved,
}: {
  templates: PickItem[];
  clients: PickClient[];
  onBack: () => void;
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
    const res = await assignNutritionTemplateAction(templateId, clientId);
    setSaving(false);
    if (res.ok) { setTemplateId(""); setClientId(""); onSaved(); }
    else setError({ error: res.error, code: res.code });
  }

  return (
    <>
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
        <Button variant="outline" onClick={onBack}>{L("رجوع", "Back")}</Button>
        <Button onClick={save} disabled={saving || !templateId || !clientId}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}{L("إسناد", "Assign")}</Button>
      </DialogFooter>
    </>
  );
}

/** Create form for an image plan (client picker shown). */
function ImagePlanForm({
  clients,
  onBack,
  onSaved,
}: {
  clients: PickClient[];
  onBack: () => void;
  onSaved: () => void;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [clientId, setClientId] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [images, setImages] = useState<PlanImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ActionErrorInfo | null>(null);

  async function save() {
    if (!clientId || !name.trim() || images.length === 0) return;
    setSaving(true);
    setError(null);
    const res = await createNutritionImagePlanAction(clientId, {
      nameAr: name.trim(),
      nameEn: name.trim(),
      images,
      note: note.trim() || undefined,
    });
    setSaving(false);
    if (res.ok) onSaved();
    else setError({ error: res.error, code: res.code });
  }

  return (
    <>
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t.dashboard.ui.client}</Label>
          <Select value={clientId} onValueChange={setClientId}>
            <SelectTrigger><SelectValue placeholder={L("اختر عميلاً", "Select a client")} /></SelectTrigger>
            <SelectContent>{clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <ImagePlanFields
          name={name}
          setName={setName}
          note={note}
          setNote={setNote}
          images={images}
          setImages={setImages}
        />
        <ActionErrorAlert result={error} />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onBack}>{L("رجوع", "Back")}</Button>
        <Button onClick={save} disabled={saving || !clientId || !name.trim() || images.length === 0}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}{L("إسناد", "Assign")}
        </Button>
      </DialogFooter>
    </>
  );
}

/** Edit dialog for an existing image plan (client is fixed). */
function EditImagePlanDialog({
  plan,
  onOpenChange,
  onSaved,
}: {
  plan: PlanRow | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<ActionErrorInfo | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [images, setImages] = useState<PlanImage[]>([]);
  // Re-seed the form whenever a different plan is opened.
  const [seededId, setSeededId] = useState<string | null>(null);
  if (plan && seededId !== plan.id) {
    setSeededId(plan.id);
    setName(locale === "ar" ? plan.nameAr : plan.nameEn);
    setNote(plan.note ?? "");
    setImages(plan.images ?? []);
    setError(null);
  }

  async function save() {
    if (!plan || !name.trim() || images.length === 0) return;
    setSaving(true);
    setError(null);
    const res = await updateNutritionImagePlanAction(plan.id, {
      nameAr: name.trim(),
      nameEn: name.trim(),
      images,
      note: note.trim() || undefined,
    });
    setSaving(false);
    if (res.ok) { setSeededId(null); onSaved(); }
    else setError({ error: res.error, code: res.code });
  }

  return (
    <Dialog open={plan !== null} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{L("تعديل خطة الصورة", "Edit image plan")}</DialogTitle>
          <DialogDescription>{plan?.clientName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <ImagePlanFields
            name={name}
            setName={setName}
            note={note}
            setNote={setNote}
            images={images}
            setImages={setImages}
          />
          <ActionErrorAlert result={error} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t.common.cancel}</Button>
          <Button onClick={save} disabled={saving || !name.trim() || images.length === 0}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}{t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Name + note + image list, shared by the create and edit forms. */
function ImagePlanFields({
  name,
  setName,
  note,
  setNote,
  images,
  setImages,
}: {
  name: string;
  setName: (v: string) => void;
  note: string;
  setNote: (v: string) => void;
  images: PlanImage[];
  setImages: (v: PlanImage[]) => void;
}) {
  const { locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);

  return (
    <>
      <div className="space-y-2">
        <Label>{L("اسم الخطة", "Plan name")}</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={L("مثال: نظام التنشيف", "e.g. Cutting plan")} />
      </div>

      <div className="space-y-2">
        <Label>{L("صور الخطة", "Plan images")}</Label>
        {images.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {images.map((img, i) => (
              <div key={`${img.url}-${i}`} className="group relative aspect-square overflow-hidden rounded-lg border">
                <Image src={img.url} alt="" fill sizes="120px" className="object-cover" />
                <button
                  type="button"
                  onClick={() => setImages(images.filter((_, j) => j !== i))}
                  className="absolute end-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                  aria-label={L("حذف الصورة", "Remove image")}
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <CloudinaryUpload
          kind="nutrition"
          label={L("رفع صورة الخطة", "Upload plan image")}
          onUploaded={(url, publicId) => setImages([...images, { url, publicId }])}
        />
        <p className="text-xs text-muted-foreground">
          {L("يمكنك رفع أكثر من صورة (صفحات متعددة). الحد الأقصى 3 ميجابايت للصورة.", "You can upload multiple images (multiple pages). Max 3MB per image.")}
        </p>
      </div>

      <div className="space-y-2">
        <Label>{L("ملاحظة (اختياري)", "Note (optional)")}</Label>
        <textarea
          className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder={L("تعليمات إضافية للعميل…", "Extra instructions for the client…")}
        />
      </div>
    </>
  );
}
