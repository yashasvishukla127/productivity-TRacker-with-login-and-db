import React, { useState, useMemo } from "react";
import { todayKey, addDays, timeToMin, minToTime, mapMinuteToPercent } from "../utils/dates";
import { SLEEP_COLOR } from "../theme";

const ACTIVE_WIDTH_PCT = 88; // waking hours get 88% of the bar, sleep gets the rest

export default function RecordsView({ t, sessions, sleepSettings, tasks = [] }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [daysToShow, setDaysToShow] = useState(14);
  const days = Array.from({ length: daysToShow }, (_, i) => addDays(today, -i));
  const [selected, setSelected] = useState(null);

  const colorByTaskId = Object.fromEntries(tasks.map((tk) => [tk.id, tk.color]));

  const sleepOn = !!sleepSettings?.enabled;
  const wakeMin = sleepOn ? timeToMin(sleepSettings.end) : 0;
  const sleepMin = sleepOn ? timeToMin(sleepSettings.start) : 0;
  const pct = (min) => mapMinuteToPercent(min, wakeMin, sleepMin, ACTIVE_WIDTH_PCT);
  const activeEndPct = sleepOn ? pct(sleepMin) : 100;

  const hourMarks = useMemo(() => {
    const activeDur = sleepOn ? ((sleepMin - wakeMin + 1440) % 1440) || 1440 : 1440;
    const stepMin = activeDur > 12 * 60 ? 180 : 120;
    const marks = [];
    for (let m = 0; m <= activeDur; m += stepMin) marks.push({ min: wakeMin + m, pct: pct(wakeMin + m) });
    return marks;
  }, [wakeMin, sleepMin, sleepOn]);

  return (
    <div>
      <div style={{ background: t.surface, borderRadius: 14, padding: "14px 12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "54px 1fr", fontSize: 9.5, color: t.sub, marginBottom: 6 }}>
          <div />
          <div style={{ position: "relative", height: 14 }}>
            {hourMarks.map((mk) => (
              <span key={mk.min} style={{ position: "absolute", left: `${mk.pct}%`, transform: "translateX(-50%)" }}>
                {minToTime(mk.min)}
              </span>
            ))}
            {sleepOn && (
              <span style={{ position: "absolute", left: `${activeEndPct + (100 - activeEndPct) / 2}%`, transform: "translateX(-50%)", color: t.sub, fontStyle: "italic" }}>
                sleep
              </span>
            )}
          </div>
        </div>
        <div className="sf-scroll" style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 380, overflowY: "auto", paddingRight: 2 }}>
          {days.map((d) => {
            const key = todayKey(d);
            const daySessions = sessions.filter((s) => s.date === key);
            const sleepId = `sleep-${key}`;
            return (
              <div key={key} style={{ display: "grid", gridTemplateColumns: "54px 1fr", alignItems: "center" }}>
                <span style={{ fontSize: 10.5, color: t.sub }}>
                  {key === todayKey() ? "Today" : d.toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                </span>
                <div style={{ position: "relative", height: 16, background: t.bg, borderRadius: 4, overflow: "hidden" }}>
                  {sleepOn && (
                    <div
                      onClick={() =>
                        setSelected({
                          id: sleepId,
                          date: key,
                          startMinutes: sleepMin,
                          minutes: (1440 - ((sleepMin - wakeMin + 1440) % 1440)) || 1440,
                          note: "Sleep",
                          isSleep: true,
                        })
                      }
                      title="Sleep (compressed)"
                      style={{
                        position: "absolute",
                        left: `${activeEndPct}%`,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        background: `repeating-linear-gradient(135deg, ${SLEEP_COLOR}33, ${SLEEP_COLOR}33 3px, ${SLEEP_COLOR}1a 3px, ${SLEEP_COLOR}1a 6px)`,
                        borderLeft: `1px solid ${t.line}`,
                        cursor: "pointer",
                        outline: selected?.id === sleepId ? `2px solid ${t.ink}` : "none",
                      }}
                    />
                  )}
                  {daySessions.map((s) => {
                    const start = s.startMinutes ?? 540;
                    const left = pct(start);
                    const right = pct(start + s.minutes);
                    const width = Math.max(right - left, 1.2);
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
                          opacity: selected?.id === s.id ? 1 : 0.85,
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
          {sleepOn && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: SLEEP_COLOR, opacity: 0.4, display: "inline-block" }} />
              Sleep (compressed)
            </span>
          )}
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
        ) : sleepOn ? (
          `Tap a block above to see its date, time and duration. The timeline starts at your wake time (${sleepSettings.end}) and sleep is compressed on the right.`
        ) : (
          "Tap a block above to see its date, time and duration. Set a wake/sleep time in Settings to compress the sleep hours."
        )}
      </div>
    </div>
  );
}