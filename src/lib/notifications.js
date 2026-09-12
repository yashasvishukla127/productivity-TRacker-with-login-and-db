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

// Android 8+ ties notification sound to the *channel*, not the individual
// notification — a per-notification `sound` field is ignored unless the
// channel it's posted on was created with one. This channel is created
// once (idempotent) with importance high enough to make it a heads-up
// alert with sound even if the screen is off.
//
// `beep.wav` must exist at android/app/src/main/res/raw/beep.wav (see
// ANDROID_SETUP.md) — Android res/raw filenames can't have a dot before
// the extension, so drop the extension when referencing it here.
const TIMER_CHANNEL_ID = "timer-alerts";

export async function initNotifications() {
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    const perm = await plugin.checkPermissions();
    if (perm.display !== "granted") await plugin.requestPermissions();
    await plugin.createChannel({
      id: TIMER_CHANNEL_ID,
      name: "Timer alerts",
      description: "Focus session and break end alerts",
      importance: 5, // IMPORTANCE_HIGH — heads-up + sound
      sound: "beep", // no extension: looks up android/app/src/main/res/raw/beep.*
      visibility: 1,
    });
  } catch (e) {
    console.error("Notification setup failed", e);
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
          channelId: TIMER_CHANNEL_ID,
          sound: "beep.wav", // iOS wants the extension; Android reads it off the channel above
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
