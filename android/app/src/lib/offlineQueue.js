// Plain localStorage, deliberately not the Supabase storageApi — same reasoning
// as timerEngine.js: this must work with zero network access.
//
// Only keeps the latest value per key. If persist("sessions", A) fails, then
// later persist("sessions", B) also fails, there's no point flushing A —
// B already contains everything A did plus more, so B replaces A here.

const KEY = "pendingWrites";

function readAll() {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function writeAll(obj) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(obj));
  } catch (e) {
    // localStorage full or unavailable — nothing more we can do here
  }
}

export function queueWrite(key, value) {
  const pending = readAll();
  pending[key] = value;
  writeAll(pending);
}

export function getQueuedWrites() {
  return readAll();
}

export function clearQueuedWrite(key) {
  const pending = readAll();
  if (key in pending) {
    delete pending[key];
    writeAll(pending);
  }
}