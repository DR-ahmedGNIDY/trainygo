import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

/** Unified "FITXNET" wordmark: FIT/NET in the default text color, X in brand red. */
export function BrandText({ className }: { className?: string }) {
  return (
    <span className={cn("font-bold tracking-tight", className)}>
      FIT<span className="text-primary">X</span>NET
    </span>
  );
}

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
    sm: { box: 28, text: "text-base" },
    md: { box: 36, text: "text-lg" },
    lg: { box: 44, text: "text-2xl" },
  }[size];

  const content = (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/favicon.png"
        alt="FITXNET"
        width={sizes.box}
        height={sizes.box}
        className="shrink-0"
        priority
      />
      {showText && <BrandText className={sizes.text} />}
    </span>
  );

  if (href === null) return content;

  return (
    <Link href={href} className="inline-flex" aria-label="FITXNET">
      {content}
    </Link>
  );
}
