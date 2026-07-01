import type { Metadata } from "next";
import { LoginForm } from "./login-form";

// White-label branding intentionally does NOT apply here: this is a single shared
// login page across all coaches' clients (no per-coach subdomain/slug routing exists
// in this codebase), so the coach can't be identified before authentication. It
// always renders with the default FITXNET identity.
export const metadata: Metadata = {
  title: "تسجيل الدخول",
};

export default function LoginPage() {
  return <LoginForm />;
}
