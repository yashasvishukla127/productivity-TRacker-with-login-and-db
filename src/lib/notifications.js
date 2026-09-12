// Works only inside the Capacitor Android build. When running as a normal
// web app (e.g. your Vercel deployment) every function here safely no-ops,
// so this file is safe to import from App.jsx unconditionally.

function isNative() {
  return typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.();
}

let LocalNotifications = null;
async function getPlugin() {
  if (!isNative()) return null;
  if (!LocalNotifications) {
    const mod = await import("@capacitor/local-notifications");
    LocalNotifications = mod.LocalNotifications;
  }
  return LocalNotifications;
}

export async function initNotifications() {
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    const perm = await plugin.checkPermissions();
    if (perm.display !== "granted") await plugin.requestPermissions();
  } catch (e) {
    console.error("Notification permission request failed", e);
  }
}

// id: small integer, reuse the same id per "slot" (e.g. 1 for the timer)
// so scheduling a new one implicitly makes sense; we still cancel first.
export async function scheduleSessionEnd(id, whenDate, title, body) {
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    await plugin.cancel({ notifications: [{ id }] });
    await plugin.schedule({
      notifications: [
        {
          id,
          title,
          body,
          schedule: { at: whenDate },
          sound: undefined,
        },
      ],
    });
  } catch (e) {
    console.error("Failed to schedule notification", e);
  }
}

export async function cancelSessionEnd(id) {
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    await plugin.cancel({ notifications: [{ id }] });
  } catch (e) {
    console.error("Failed to cancel notification", e);
  }
}

export const TIMER_NOTIFICATION_ID = 1;
