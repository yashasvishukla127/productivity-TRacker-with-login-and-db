function isNative() {
  return typeof window !== "undefined" && !!window.Capacitor?.isNativePlatform?.();
}

let BackgroundMode = null;
async function getPlugin() {
  if (!isNative()) return null;
  if (!BackgroundMode) {
    const mod = await import("@anuradev/capacitor-background-mode");
    BackgroundMode = mod.BackgroundMode;
  }
  return BackgroundMode;
}

export async function enableBackgroundMode() {
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    await plugin.enable({
      title: "Still Focus is running",
      text: "Your timer keeps counting in the background.",
      // check ISettings in the same .d.ts for other optional fields
      // (e.g. icon, color, resume, hidden) and set any you want
    });
  } catch (e) {
    console.error("Enable background mode failed", e);
  }
}

export async function disableBackgroundMode() {
  const plugin = await getPlugin();
  if (!plugin) return;
  try {
    await plugin.disable();
  } catch (e) {
    console.error("Disable background mode failed", e);
  }
}