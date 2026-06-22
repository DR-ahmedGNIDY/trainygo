import Link from "next/link";
import { Dumbbell } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Trainygo placeholder logo. Swap the inner mark/wordmark here to drop in the
 * official logo later — no other code changes required.
 */
export function Logo({
  className,
  href = "/",
  showText = true,
  size = "md",
}: {
  className?: string;
  href?: string | null;
  showText?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizes = {
    sm: { box: "h-7 w-7", icon: "h-4 w-4", text: "text-base" },
    md: { box: "h-9 w-9", icon: "h-5 w-5", text: "text-lg" },
    lg: { box: "h-11 w-11", icon: "h-6 w-6", text: "text-2xl" },
  }[size];

  const content = (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm",
          sizes.box,
        )}
        aria-hidden
      >
        <Dumbbell className={sizes.icon} />
      </span>
      {showText && (
        <span className={cn("font-bold tracking-tight", sizes.text)}>
          Trainy<span className="text-primary">go</span>
        </span>
      )}
    </span>
  );

  if (href === null) return content;

  return (
    <Link href={href} className="inline-flex" aria-label="Trainygo">
      {content}
    </Link>
  );
}
