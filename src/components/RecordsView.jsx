import React, { useState } from "react";
import { todayKey, addDays, timeToMin } from "../utils/dates";
import { SLEEP_COLOR } from "../theme";

function sleepSegmentsForDay(dateStr, sleepSettings) {
  if (!sleepSettings?.enabled) return [];
  const startMin = timeToMin(sleepSettings.start);
  const endMin = timeToMin(sleepSettings.end);
  if (startMin === endMin) return [];
  if (endMin < startMin) {
    // crosses midnight: morning remainder (from previous night) + tonight's start
    return [
      { start: 0, minutes: endMin, real: true },
      { start: startMin, minutes: 1440 - startMin, real: true },
    ];
  }
  return [{ start: startMin, minutes: endMin - startMin, real: true }];
}

export default function RecordsView({ t, sessions, sleepSettings, tasks = [] }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [daysToShow, setDaysToShow] = useState(14);
  const days = Array.from({ length: daysToShow }, (_, i) => addDays(today, -i));
  const hourMarks = [0, 4, 8, 12, 16, 20, 24];
  const [selected, setSelected] = useState(null);

  const colorByTaskId = Object.fromEntries(tasks.map((tk) => [tk.id, tk.color]));

  return (
    <div>
      <div style={{ background: t.surface, borderRadius: 14, padding: "14px 12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "54px 1fr", fontSize: 9.5, color: t.sub, marginBottom: 6 }}>
          <div />
          <div style={{ position: "relative", height: 14 }}>
            {hourMarks.map((h) => (
              <span key={h} style={{ position: "absolute", left: `${(h / 24) * 100}%`, transform: "translateX(-50%)" }}>
                {h}
              </span>
            ))}
          </div>
        </div>
        <div className="sf-scroll" style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 380, overflowY: "auto", paddingRight: 2 }}>
          {days.map((d) => {
            const key = todayKey(d);
            const daySessions = sessions.filter((s) => s.date === key);
            const sleepSegs = sleepSegmentsForDay(key, sleepSettings);
            return (
              <div key={key} style={{ display: "grid", gridTemplateColumns: "54px 1fr", alignItems: "center" }}>
                <span style={{ fontSize: 10.5, color: t.sub }}>
                  {key === todayKey() ? "Today" : d.toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                </span>
                <div style={{ position: "relative", height: 16, background: t.bg, borderRadius: 4 }}>
                  {sleepSegs.map((seg, idx) => {
                    const left = (seg.start / 1440) * 100;
                    const sleepId = `sleep-${key}-${idx}`;
                    return (
                      <div
                        key={sleepId}
                        onClick={() => setSelected({ id: sleepId, date: key, startMinutes: seg.start, minutes: seg.minutes, note: "Sleep", isSleep: true })}
                        title={`Sleep · ${seg.minutes}m`}
                        style={{
                          position: "absolute",
                          left: `${left}%`,
                          width: 9,
                          minWidth: 9,
                          maxWidth: 9,
                          top: 2,
                          bottom: 2,
                          background: SLEEP_COLOR,
                          borderRadius: 3,
                          opacity: selected?.id === sleepId ? 1 : 0.9,
                          cursor: "pointer",
                          outline: selected?.id === sleepId ? `2px solid ${t.ink}` : "none",
                          zIndex: 3,
                          boxShadow: "0 0 0 1px rgba(0,0,0,0.08)",
                        }}
                      />
                    );
                  })}
                  {daySessions.map((s) => {
                    const start = s.startMinutes ?? 540;
                    const left = (start / 1440) * 100;
                    const width = Math.max((s.minutes / 1440) * 100, 1.2);
                    return (
                      <div
                        key={s.id}
                        onClick={() => setSelected(s)}
                        title={`${s.minutes}m`}
                        style={{
                          position: "absolute",
                          left: `${left}%`,
                          width: `${width}%`,
                          top: 2,
                          bottom: 2,
                          background: colorByTaskId[s.taskId] || (s.manual ? t.clay : t.moss),
                          borderRadius: 3,
                          opacity: selected?.id === s.id ? 1 : 0.8,
                          cursor: "pointer",
                          outline: selected?.id === s.id ? `2px solid ${t.ink}` : "none",
                          zIndex: 2,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <button onClick={() => setDaysToShow((n) => n + 14)} style={{ fontSize: 11.5, color: t.moss, background: "transparent", border: `1px solid ${t.line}`, borderRadius: 999, padding: "6px 14px", cursor: "pointer", fontWeight: 600 }}>
            Show 14 more days
          </button>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 10.5, color: t.sub, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: t.moss, display: "inline-block" }} />
            Timer session
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: t.clay, display: "inline-block" }} />
            Logged manually
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: SLEEP_COLOR, display: "inline-block" }} />
            Sleep (shrunk)
          </span>
        </div>
      </div>
      <div style={{ marginTop: 10, minHeight: 40, background: t.surface, borderRadius: 10, padding: "10px 12px", fontSize: 12.5, color: selected ? t.ink : t.sub }}>
        {selected ? (
          (() => {
            const startH = Math.floor(selected.startMinutes / 60).toString().padStart(2, "0");
            const startM = (selected.startMinutes % 60).toString().padStart(2, "0");
            const endTotal = selected.startMinutes + selected.minutes;
            const endH = Math.floor((endTotal % 1440) / 60).toString().padStart(2, "0");
            const endM = (endTotal % 60).toString().padStart(2, "0");
            return (
              <span>
                <strong>{new Date(selected.date + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "short" })}</strong>
                {" · "}
                {startH}:{startM}–{endH}:{endM} · {selected.minutes}m{selected.note ? ` · ${selected.note}` : ""}
              </span>
            );
          })()
        ) : (
          "Tap a block above to see its date, time and duration. Sleep blocks are shown compact so your focus sessions stay easy to read."
        )}
      </div>
    </div>
  );
}
