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

// Identity of the session/timer run currently in progress: a stable id
// plus the real-world timestamp it actually started at. This is what
// lets pause -> resume -> finish resolve to ONE sessions-array record
// instead of a fresh one every time the run is touched. It's set once
// when a run genuinely starts (or auto-continues into a new phase) and
// carried through pause/resume/app-restart until `finish` commits it,
// at which point it's cleared so the next run gets a new identity.
const DRAFT_SESSION_KEY = "focusmeter_draft_session";

// Shape: { id: string, startTimestamp: number }
export function saveDraftSession(meta) {
  try {
    window.localStorage.setItem(DRAFT_SESSION_KEY, JSON.stringify(meta));
  } catch (e) {
    console.error("Failed to save draft session", e);
  }
}

export function loadDraftSession() {
  try {
    const raw = window.localStorage.getItem(DRAFT_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("Failed to load draft session", e);
    return null;
  }
}

export function clearDraftSession() {
  try {
    window.localStorage.removeItem(DRAFT_SESSION_KEY);
  } catch (e) {
    console.error("Failed to clear draft session", e);
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

// Auto-continue support: given a countdown phase whose end timestamp has
// already passed (the app was backgrounded/closed through it, possibly
// through several full work/rest cycles), walk forward cycle by cycle to
// find where the timer *should* be right now, and collect every work
// phase that fully completed along the way so the caller can log a
// session for each one — this is what makes "started a pomodoro, put the
// phone in my pocket for two hours" land on the correct phase with every
// finished focus block already recorded, instead of just the one that
// was in progress when the app was last open.
//
// durations: { work: minutes, rest: minutes } for the active mode.
// Returns the resolved phase/endTimestamp to resume at (endTimestamp is
// always in the future, or exactly now if the safety cap below is hit),
// plus completedWorkPhases: [{ startTimestamp, minutes }].
const MAX_AUTO_CYCLES = 500; // safety cap so a months-old stale timer can't loop forever

export function resolveElapsedPhases({ phase, endTimestamp, durations }) {
  const completedWorkPhases = [];
  let currentPhase = phase;
  let currentEnd = endTimestamp;
  let cycles = 0;

  while (Date.now() >= currentEnd && cycles < MAX_AUTO_CYCLES) {
    if (currentPhase === "work") {
      completedWorkPhases.push({
        startTimestamp: currentEnd - durations.work * 60 * 1000,
        minutes: durations.work,
      });
      currentPhase = "rest";
      currentEnd = currentEnd + durations.rest * 60 * 1000;
    } else {
      currentPhase = "work";
      currentEnd = currentEnd + durations.work * 60 * 1000;
    }
    cycles++;
  }

  return {
    phase: currentPhase,
    endTimestamp: currentEnd,
    remainingSeconds: remainingFromEnd(currentEnd),
    completedWorkPhases,
    hitCap: cycles >= MAX_AUTO_CYCLES,
  };
}
