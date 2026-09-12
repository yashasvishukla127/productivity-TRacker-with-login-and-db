// This is deliberately plain localStorage, not the Supabase storageApi:
// it's ephemeral per-device "is a timer currently running" state, not
// data you want synced across devices or kept forever.
const KEY = "focusmeter_active_timer";

// Shape:
// {
//   modeKey: "pomodoro" | "deepwork" | "stopwatch",
//   phase: "work" | "rest",
//   running: boolean,
//   endTimestamp: number | null,        // ms epoch — countdown modes, while running
//   remainingSeconds: number | null,    // countdown modes, while paused
//   stopwatchStartTimestamp: number | null, // ms epoch — stopwatch, while running
//   stopwatchBaseSecs: number,          // stopwatch seconds accumulated before current run
// }

export function saveActiveTimer(state) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save active timer", e);
  }
}

export function loadActiveTimer() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Failed to load active timer", e);
    return null;
  }
}

export function clearActiveTimer() {
  try {
    window.localStorage.removeItem(KEY);
  } catch (e) {
    console.error("Failed to clear active timer", e);
  }
}

// Recompute remaining seconds for a countdown phase from its end timestamp.
// Returns 0 or below if the phase has already finished while backgrounded.
export function remainingFromEnd(endTimestamp) {
  return Math.round((endTimestamp - Date.now()) / 1000);
}

// Recompute elapsed seconds for the stopwatch from its start timestamp.
export function elapsedStopwatch(startTimestamp, baseSecs) {
  return baseSecs + Math.floor((Date.now() - startTimestamp) / 1000);
}
