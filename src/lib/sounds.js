// Central list of available notification sounds. Each entry's `file` is
// served from /public/sounds (see public/sounds/*.wav), and `id` doubles
// as the Android notification-channel suffix in notifications.js — keep
// ids lowercase, no spaces, matching the res/raw filename (no extension).
export const SOUNDS = [
  { id: "bell",      label: "Bell",      file: "/sounds/bell.wav" },
  { id: "chime",     label: "Chime",     file: "/sounds/chime.wav" },
  { id: "ding_ding", label: "Ding Ding", file: "/sounds/ding_ding.wav" },
  { id: "soft_beep", label: "Soft Beep", file: "/sounds/soft_beep.wav" },
];

export const DEFAULT_WORK_END_SOUND = "bell";
export const DEFAULT_BREAK_END_SOUND = "ding_ding";

export function playSound(id) {
  try {
    const sound = SOUNDS.find((s) => s.id === id) || SOUNDS[0];
    const audio = new Audio(sound.file);
    audio.play().catch(() => {});
  } catch (e) {
    console.error("playSound failed", e);
  }
}