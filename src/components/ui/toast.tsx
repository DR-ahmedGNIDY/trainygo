"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "error" | "success";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

let listeners: Array<(items: ToastItem[]) => void> = [];
let items: ToastItem[] = [];
let nextId = 1;

function emit() {
  for (const listener of listeners) listener(items);
}

function push(message: string, variant: ToastVariant) {
  const id = nextId++;
  items = [...items, { id, message, variant }];
  emit();
  setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    emit();
  }, 4000);
}

export const toast = {
  error: (message: string) => push(message, "error"),
  success: (message: string) => push(message, "success"),
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>(items);

  useEffect(() => {
    listeners.push(setToasts);
    return () => {
      listeners = listeners.filter((l) => l !== setToasts);
    };
  }, []);

  return (
    <div className="fixed bottom-4 inset-x-4 z-[100] flex flex-col items-center gap-2 pointer-events-none sm:inset-x-auto sm:end-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "pointer-events-auto flex items-center gap-2 rounded-md border px-4 py-3 text-sm shadow-lg max-w-sm",
            t.variant === "error"
              ? "bg-destructive text-destructive-foreground border-destructive"
              : "bg-primary text-primary-foreground border-primary",
          )}
        >
          {t.variant === "error" ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          )}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
