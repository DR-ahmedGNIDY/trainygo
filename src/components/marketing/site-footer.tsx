"use client";

import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { useI18n } from "@/components/providers/i18n-provider";

export function SiteFooter() {
  const { t } = useI18n();

  const columns = [
    {
      title: t.footer.product,
      links: [
        { href: "#features", label: t.nav.features },
        { href: "#pricing", label: t.nav.pricing },
      ],
    },
    {
      title: t.footer.company,
      links: [
        { href: "#", label: t.footer.about },
        { href: "#", label: t.footer.contact },
      ],
    },
    {
      title: t.footer.legal,
      links: [
        { href: "#", label: t.footer.privacy },
        { href: "#", label: t.footer.terms },
      ],
    },
  ];

  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-3">
            <Logo />
            <p className="max-w-xs text-sm text-muted-foreground">
              {t.brand.tagline}
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 text-sm font-semibold">{col.title}</h3>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t pt-6 text-center text-sm text-muted-foreground">
          {t.footer.rights}
        </div>
      </div>
    </footer>
  );
}
