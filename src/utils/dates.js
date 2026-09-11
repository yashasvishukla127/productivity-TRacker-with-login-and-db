export function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
export function fmt(total) {
  const m = Math.floor(Math.abs(total) / 60).toString().padStart(2, "0");
  const s = Math.floor(Math.abs(total) % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
export function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export function dayLabel(dateStr) { return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" }); }
export function minutesSinceMidnight(date) { return date.getHours() * 60 + date.getMinutes(); }
export function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
export function mondayOf(date) { const d = new Date(date); d.setHours(0, 0, 0, 0); const day = (d.getDay() + 6) % 7; return addDays(d, -day); }
export function slotLabel(i) { const h = Math.floor(i / 2); const m = i % 2 === 0 ? "00" : "30"; return `${h.toString().padStart(2, "0")}:${m}`; }
export function slotIndexFromMinutes(mins) { return Math.round(mins / 30); }
export function isSleepText(text) { return !!text && text.trim().toLowerCase() === "sleep"; }
export function timeToMin(hhmm) { const [h, m] = (hhmm || "00:00").split(":").map(Number); return h * 60 + m; }
export function resolveRow(anchorDate, row, dayStartHour) {
  const raw = dayStartHour * 2 + row;
  const wrapped = raw >= 48;
  return { slotIdx: raw % 48, date: wrapped ? addDays(anchorDate, 1) : anchorDate };
}
