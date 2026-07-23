/**
 * Browser-side Web Push helpers (client only).
 *
 * These do only transport plumbing: register the Service Worker, subscribe with
 * the VAPID public key, and hand the raw subscription to the backend. No
 * business logic — the backend decides everything about content and delivery.
 */

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function permissionState(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

async function postSubscription(subscription: PushSubscription, locale: string): Promise<void> {
  await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subscription,
      meta: {
        os: navigator.platform,
        deviceName: navigator.userAgent.slice(0, 120),
        locale,
      },
    }),
  });
}

/**
 * Ensure the browser is subscribed and the backend knows. Requests permission
 * if needed. Returns true when a live subscription is registered.
 */
export async function enablePush(locale: string): Promise<boolean> {
  if (!isPushSupported() || !VAPID_PUBLIC_KEY) return false;

  const permission =
    Notification.permission === "default"
      ? await Notification.requestPermission()
      : Notification.permission;
  if (permission !== "granted") return false;

  const reg = (await navigator.serviceWorker.ready.catch(() => null)) ?? (await registerServiceWorker());
  if (!reg) return false;

  const existing = await reg.pushManager.getSubscription();
  const subscription =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    }));

  await postSubscription(subscription, locale);
  return true;
}

/**
 * Silently re-sync an already-granted subscription on load (e.g. after token
 * rotation or a new login). No permission prompt.
 */
export async function syncPushIfGranted(locale: string): Promise<void> {
  if (!isPushSupported() || Notification.permission !== "granted") return;
  await enablePush(locale);
}
