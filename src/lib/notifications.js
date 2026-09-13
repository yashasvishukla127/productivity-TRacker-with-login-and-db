// Works only inside the Capacitor Android build. When running as a normal
// web app (e.g. your Vercel deployment) every function here safely no-ops,
// so this file is safe to import from App.jsx unconditionally.

import { SOUNDS } from "./sounds";

function isNative() {
  return (
    typeof window !== "undefined" &&
    !!window.Capacitor?.isNativePlatform?.()
  );
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

function channelIdFor(soundId) {
  return `timer-${soundId}`;
}

// Android 8+ ties notification sound to the *channel*, not the individual
// notification — a per-notification `sound` field is ignored unless the
// channel it's posted on was created with one.
//
// Each sound therefore gets its own notification channel. The channel is
// created once (idempotent) with importance high enough to make it a heads-up
// alert with sound even if the screen is off.
//
// Sound files must exist at:
// android/app/src/main/res/raw/<sound-id>.wav
//
// Android res/raw filenames must be lowercase and use underscores where
// needed. When referencing them in createChannel(), the extension is omitted.

export async function initNotifications() {
  const plugin = await getPlugin();
  if (!plugin) return;

  try {
    const perm = await plugin.checkPermissions();

    if (perm.display !== "granted") {
      await plugin.requestPermissions();
    }

    for (const s of SOUNDS) {
      await plugin.createChannel({
        id: channelIdFor(s.id),
        name: `Timer alert — ${s.label}`,
        description: "Focus session and break end alerts",
        importance: 5,
        sound: s.id,
        visibility: 1,
      });
    }
  } catch (e) {
    console.error("Notification setup failed", e);
  }
}

// id: small integer, reuse the same id per "slot" (e.g. 1 for the timer)
// so scheduling a new one implicitly makes sense; we still cancel first.
//
// soundId determines which Android notification channel is used and which
// sound file iOS plays.

export async function scheduleSessionEnd(
  id,
  whenDate,
  title,
  body,
  soundId
) {
  const plugin = await getPlugin();
  if (!plugin) return;

  try {
    await plugin.cancel({
      notifications: [{ id }],
    });

    await plugin.schedule({
      notifications: [
        {
          id,
          title,
          body,
          schedule: {
            at: whenDate,
          },
          channelId: channelIdFor(soundId),
          sound: `${soundId}.wav`,
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
    await plugin.cancel({
      notifications: [{ id }],
    });
  } catch (e) {
    console.error("Failed to cancel notification", e);
  }
}

export const TIMER_NOTIFICATION_ID = 1;