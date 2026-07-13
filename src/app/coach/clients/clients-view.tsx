"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  UserPlus,
  Search,
  Users,
  MoreHorizontal,
  Eye,
  Archive,
  Trash2,
  Snowflake,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/components/providers/i18n-provider";
import { GOAL_LABELS, label } from "@/lib/i18n/labels";
import { archiveClientAction, deleteClientAction } from "@/lib/actions/clients";
import type { AccountStatus, ClientGoal } from "@/lib/constants";

export interface ClientListItem {
  id: string;
  name: string;
  code: string;
  goal?: ClientGoal;
  status: AccountStatus;
  frozen?: boolean;
  weight?: number | null;
  lastLoginAt?: string | null;
}

export function ClientsView({
  clients,
  canWrite,
  limitReached = false,
}: {
  clients: ClientListItem[];
  canWrite: boolean;
  limitReached?: boolean;
}) {
  const { t, locale } = useI18n();
  const L = (ar: string, en: string) => (locale === "ar" ? ar : en);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState(searchParams.get("status") ?? "all");
  const [isPending, startTransition] = useTransition();

  const filtered = clients.filter((c) => {
    const q = query.toLowerCase();
    const matchesQuery =
      c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q);
    const matchesStatus =
      status === "all" ||
      (status === "frozen" ? c.frozen : status === "expired" ? c.status === "expired" && !c.frozen : c.status === status && !c.frozen);
    return matchesQuery && matchesStatus;
  });

  function lastActive(iso?: string | null) {
    if (!iso) return "—";
    return formatDistanceToNow(new Date(iso), {
      addSuffix: true,
      locale: locale === "ar" ? ar : enUS,
    });
  }

  function onArchive(id: string) {
    startTransition(async () => {
      await archiveClientAction(id);
      router.refresh();
    });
  }

  function onDelete(id: string, name: string) {
    if (!window.confirm(`${t.common.delete}: ${name}?`)) return;
    startTransition(async () => {
      await deleteClientAction(id);
      router.refresh();
    });
  }

  return (
    <div>
      <PageHeader
        title={t.dashboard.coachNav.allClients}
        description={`${clients.length} ${t.dashboard.stats.myClients}`}
      >
        {canWrite && (
          limitReached ? (
            <Button asChild>
              <Link href="/coach/subscription">{L("ترقية الاشتراك", "Upgrade subscription")}</Link>
            </Button>
          ) : (
            <Button asChild>
              <Link href="/coach/clients/new">
                <UserPlus className="h-4 w-4" />
                {t.dashboard.coachNav.addClient}
              </Link>
            </Button>
          )
        )}
      </PageHeader>

      {canWrite && limitReached && (
        <div className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {L("لقد وصلت إلى الحد الأقصى المسموح به في باقتك", "You've reached the maximum number of clients allowed in your plan")}
        </div>
      )}

      {clients.length === 0 ? (
        <EmptyState
          icon={Users}
          title={t.common.emptyTitle}
          description={t.common.emptyDescription}
        >
          {canWrite && !limitReached && (
            <Button asChild>
              <Link href="/coach/clients/new">
                <UserPlus className="h-4 w-4" />
                {t.dashboard.coachNav.addClient}
              </Link>
            </Button>
          )}
        </EmptyState>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground start-3" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.dashboard.ui.search}
                className="ps-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="sm:w-48">
                <SelectValue placeholder={t.dashboard.ui.filterByStatus} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t.common.all}</SelectItem>
                <SelectItem value="active">{t.account.active}</SelectItem>
                <SelectItem value="frozen">{L("مجمّد", "Frozen")}</SelectItem>
                <SelectItem value="expired">{t.account.expired}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Users} title={t.common.noResults} />
          ) : (
            <Card>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t.common.name}</TableHead>
                      <TableHead className="hidden md:table-cell">{t.dashboard.ui.goal}</TableHead>
                      <TableHead className="hidden lg:table-cell">{t.client.currentWeight}</TableHead>
                      <TableHead className="hidden sm:table-cell">{t.dashboard.ui.lastActive}</TableHead>
                      <TableHead>{t.common.status}</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell>
                          <Link href={`/coach/clients/${c.id}`} className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-xs text-primary">
                                {c.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{c.name}</div>
                              <div className="text-xs text-muted-foreground" dir="ltr">{c.code}</div>
                            </div>
                          </Link>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{label(GOAL_LABELS, c.goal, locale)}</TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">{c.weight ? `${c.weight} kg` : "—"}</TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">{lastActive(c.lastLoginAt)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <StatusBadge status={c.status} />
                            {c.frozen && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-1.5 py-0.5 text-xs font-medium text-warning">
                                <Snowflake className="h-3 w-3" />
                                {L("مجمّد", "Frozen")}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isPending}>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/coach/clients/${c.id}`}>
                                  <Eye className="h-4 w-4" />
                                  {t.common.view}
                                </Link>
                              </DropdownMenuItem>
                              {canWrite && (
                                <>
                                  <DropdownMenuItem onClick={() => onArchive(c.id)}>
                                    <Archive className="h-4 w-4" />
                                    {locale === "ar" ? "أرشفة" : "Archive"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => onDelete(c.id, c.name)}
                                    className="text-destructive focus:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    {t.common.delete}
                                  </DropdownMenuItem>
                                </>
                              )}
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
        </>
      )}
    </div>
  );
}
