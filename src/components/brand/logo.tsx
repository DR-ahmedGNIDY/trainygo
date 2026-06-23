import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

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
      {showText && (
        <span className={cn("font-bold tracking-tight", sizes.text)}>
          FITX<span className="text-primary">NET</span>
        </span>
      )}
    </span>
  );

  if (href === null) return content;

  return (
    <Link href={href} className="inline-flex" aria-label="FITXNET">
      {content}
    </Link>
  );
}
