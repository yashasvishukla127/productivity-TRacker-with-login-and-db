import React from "react";
import { THEMES } from "../theme";

export default function SettingsScreen({ t, customDurations, setCustomDurations, sessions, setSessions, dailyGoalMinutes, setDailyGoalMinutes, themeName, setThemeName, dark, sleepSettings, setSleepSettings, dayStartHour, setDayStartHour }) {
  function update(mode, field, val) { const n = Math.max(1, Math.min(180, Number(val) || 1)); setCustomDurations((prev) => ({ ...prev, [mode]: { ...prev[mode], [field]: n } })); }
  return (
    <div>
      <div style={{ fontSize: 11, color: t.sub, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Color theme</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
        {Object.entries(THEMES).map(([key, p]) => (
          <button key={key} onClick={() => setThemeName(key)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 999, border: `1.5px solid ${themeName === key ? t.ink : t.line}`, background: t.surface, cursor: "pointer" }}>
            <span style={{ display: "flex" }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: dark ? p.mossD : p.moss, marginRight: -4, border: `1px solid ${t.bg}` }} />
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: dark ? p.clayD : p.clay, border: `1px solid ${t.bg}` }} />
            </span>
            <span style={{ fontSize: 11, color: t.ink }}>{p.name}</span>
          </button>
        ))}
      </div>

      <div style={{ fontSize: 11, color: t.sub, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Custom durations (minutes)</div>
      {["pomodoro", "deepwork"].map((mode) => (
        <div key={mode} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${t.line}` }}>
          <span style={{ fontSize: 13.5, textTransform: "capitalize" }}>{mode === "pomodoro" ? "Pomodoro" : "Deep work"}</span>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input type="number" value={customDurations[mode].work} onChange={(e) => update(mode, "work", e.target.value)} style={{ width: 44, background: "transparent", border: `1px solid ${t.line}`, borderRadius: 8, padding: "5px 6px", color: t.ink, fontSize: 13, textAlign: "center", outline: "none" }} />
            <span style={{ color: t.sub, fontSize: 12 }}>/</span>
            <input type="number" value={customDurations[mode].rest} onChange={(e) => update(mode, "rest", e.target.value)} style={{ width: 44, background: "transparent", border: `1px solid ${t.line}`, borderRadius: 8, padding: "5px 6px", color: t.ink, fontSize: 13, textAlign: "center", outline: "none" }} />
          </div>
        </div>
      ))}

      <div style={{ fontSize: 11, color: t.sub, textTransform: "uppercase", letterSpacing: "0.1em", margin: "20px 0 6px" }}>Planner day starts at</div>
      <div style={{ fontSize: 11.5, color: t.sub, marginBottom: 8 }}>Each Planner column runs 24 hours from this time instead of midnight — handy if your day starts late or you work past midnight.</div>
      <select value={dayStartHour} onChange={(e) => setDayStartHour(Number(e.target.value))} style={{ background: "transparent", border: `1px solid ${t.line}`, borderRadius: 8, padding: "7px 10px", color: t.ink, fontSize: 13, outline: "none" }}>
        {Array.from({ length: 24 }, (_, h) => (
          <option key={h} value={h} style={{ background: t.bg, color: t.ink }}>{h.toString().padStart(2, "0")}:00</option>
        ))}
      </select>

      <div style={{ fontSize: 11, color: t.sub, textTransform: "uppercase", letterSpacing: "0.1em", margin: "20px 0 6px" }}>Daily focus target</div>
      <div style={{ fontSize: 11.5, color: t.sub, marginBottom: 8 }}>Used by the Goal calendar and the "Hit target" stat in Progress → Chart.</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input type="number" step={0.5} min={0.5} max={16} value={dailyGoalMinutes / 60} onChange={(e) => setDailyGoalMinutes(Math.max(30, Math.round(Number(e.target.value) * 60)))} style={{ width: 70, background: "transparent", border: `1px solid ${t.line}`, borderRadius: 8, padding: "6px 8px", color: t.ink, fontSize: 13, textAlign: "center", outline: "none" }} />
        <span style={{ fontSize: 12.5, color: t.sub }}>hours per day</span>
      </div>

      <div style={{ fontSize: 11, color: t.sub, textTransform: "uppercase", letterSpacing: "0.1em", margin: "22px 0 6px" }}>Sleep schedule</div>
      <div style={{ fontSize: 11.5, color: t.sub, marginBottom: 8 }}>Shown as a compact yellow block on the Records timeline so it doesn't crowd your focus sessions.</div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
          <input type="checkbox" checked={sleepSettings.enabled} onChange={(e) => setSleepSettings((p) => ({ ...p, enabled: e.target.checked }))} />
          Show sleep block
        </label>
      </div>
      {sleepSettings.enabled && (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11.5, color: t.sub }}>Sleep</span>
            <input type="time" value={sleepSettings.start} onChange={(e) => setSleepSettings((p) => ({ ...p, start: e.target.value }))} style={{ background: "transparent", border: `1px solid ${t.line}`, borderRadius: 8, padding: "5px 8px", color: t.ink, fontSize: 12.5, outline: "none" }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 11.5, color: t.sub }}>Wake</span>
            <input type="time" value={sleepSettings.end} onChange={(e) => setSleepSettings((p) => ({ ...p, end: e.target.value }))} style={{ background: "transparent", border: `1px solid ${t.line}`, borderRadius: 8, padding: "5px 8px", color: t.ink, fontSize: 12.5, outline: "none" }} />
          </div>
        </div>
      )}

      <div style={{ fontSize: 11, color: t.sub, textTransform: "uppercase", letterSpacing: "0.1em", margin: "22px 0 10px" }}>Data</div>
      <div style={{ fontSize: 12.5, color: t.sub, marginBottom: 12, lineHeight: 1.5 }}>{sessions.length} sessions saved to your account. Everything here — planner, matrix, motivation notes — syncs automatically.</div>
      <button onClick={() => { if (confirm("Clear all session history? This can't be undone.")) setSessions([]); }} style={{ fontSize: 12.5, color: t.clay, background: "none", border: `1px solid ${t.line}`, borderRadius: 10, padding: "8px 14px", cursor: "pointer" }}>Clear session history</button>
    </div>
  );
}
