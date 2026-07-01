"use client";

import { createContext, useContext, useEffect } from "react";

export interface BrandContextValue {
  academyName: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  buttonColor: string;
  headerColor: string;
  sidebarColor: string;
  linkColor: string;
  loginImage?: string;
  dashboardImage?: string;
  favicon?: string;
  showFitxnetBadge: boolean;
}

/** FITXNET platform defaults — used when no BrandProvider is present (e.g. super admin). */
const FITXNET_BRAND_DEFAULTS: BrandContextValue = {
  academyName: "FITXNET",
  logo: undefined,
  primaryColor: "#DC2626",
  secondaryColor: "#111827",
  buttonColor: "#DC2626",
  headerColor: "#111827",
  sidebarColor: "#0B0B0B",
  linkColor: "#DC2626",
  loginImage: undefined,
  dashboardImage: undefined,
  favicon: undefined,
  showFitxnetBadge: true,
};

// Default value avoids the need for every layout (e.g. super admin) to wrap with BrandProvider.
const BrandContext = createContext<BrandContextValue>(FITXNET_BRAND_DEFAULTS);

export function useBrand(): BrandContextValue {
  return useContext(BrandContext);
}

/**
 * Provides the effective (coach or coach-of-client) white-label brand to the
 * dashboard tree, and exposes the brand colors as CSS custom properties so
 * Tailwind arbitrary-value classes (e.g. bg-[var(--sidebar)]) can consume them.
 */
export function BrandProvider({
  initialBrand,
  children,
}: {
  initialBrand: BrandContextValue;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary-brand", initialBrand.primaryColor);
    root.style.setProperty("--secondary-brand", initialBrand.secondaryColor);
    root.style.setProperty("--button", initialBrand.buttonColor);
    root.style.setProperty("--header", initialBrand.headerColor);
    root.style.setProperty("--sidebar", initialBrand.sidebarColor);
    root.style.setProperty("--link", initialBrand.linkColor);
    return () => {
      root.style.removeProperty("--primary-brand");
      root.style.removeProperty("--secondary-brand");
      root.style.removeProperty("--button");
      root.style.removeProperty("--header");
      root.style.removeProperty("--sidebar");
      root.style.removeProperty("--link");
    };
  }, [initialBrand]);

  return (
    <BrandContext.Provider value={initialBrand}>
      {children}
    </BrandContext.Provider>
  );
}
