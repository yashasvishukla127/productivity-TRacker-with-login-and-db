import React, { useRef, useState } from "react";
import { Target, ChevronLeft, ChevronRight } from "lucide-react";
import { todayKey } from "../utils/dates";

export default function GoalCalendar({ t, sessions, dailyGoalMinutes, setDailyGoalMinutes }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState(dailyGoalMinutes / 60);
  const [selectedDay, setSelectedDay] = useState(null);
  // Hovered/tapped day for the floating tooltip: { dateStr, minutes, left, top }.
  // Kept separate from selectedDay so hovering never disturbs the persistent
  // bottom summary — hover is a quick peek, click/tap is what "sticks".
  const [hoverDay, setHoverDay] = useState(null);
  const gridRef = useRef(null);
  const year = cursor.getFullYear(); const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalsByDay = {};
  sessions.forEach((s) => { if (s.date.startsWith(`${year}-${(month + 1).toString().padStart(2, "0")}`)) totalsByDay[s.date] = (totalsByDay[s.date] || 0) + s.minutes; });
  const focusDays = Object.keys(totalsByDay).length;
  const goalDays = Object.values(totalsByDay).filter((m) => m >= dailyGoalMinutes).length;
  const rate = focusDays > 0 ? Math.round((goalDays / focusDays) * 100) : 0;
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const todayStr = todayKey();

  function saveGoal() {
    const h = Math.max(0.5, Math.min(16, Number(goalDraft) || 0.5));
    setDailyGoalMinutes(Math.round(h * 60));
    setEditingGoal(false);
  }

  // Builds the tooltip payload for a given day and positions it relative to
  // the grid container, anchored just above the hovered cell.
  function showHover(e, dateStr, minutes) {
    const cellRect = e.currentTarget.getBoundingClientRect();
    const gridRect = gridRef.current?.getBoundingClientRect();
    if (!gridRect) return;
    setHoverDay({
      dateStr,
      minutes,
      left: cellRect.left - gridRect.left + cellRect.width / 2,
      top: cellRect.top - gridRect.top,
    });
  }
  function hideHover(dateStr) {
    setHoverDay((h) => (h && h.dateStr === dateStr ? null : h));
  }

  return (
    <div style={{ background: t.surface, borderRadius: 14, padding: "16px 12px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}><Target size={14} color={t.clay} /> Focus goal</div>
        {editingGoal ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input autoFocus type="number" step={0.5} min={0.5} max={16} value={goalDraft} onChange={(e) => setGoalDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveGoal()} style={{ width: 50, background: t.bg, border: `1px solid ${t.line}`, borderRadius: 6, padding: "3px 6px", color: t.ink, fontSize: 12, textAlign: "center", outline: "none" }} />
            <button onClick={saveGoal} style={{ background: t.moss, border: "none", borderRadius: 6, color: "#fff", fontSize: 11, fontWeight: 600, padding: "4px 8px", cursor: "pointer" }}>Set</button>
          </div>
        ) : (
          <span onClick={() => { setGoalDraft(dailyGoalMinutes / 60); setEditingGoal(true); }} style={{ fontSize: 11.5, color: t.clay, background: t.clay + "1f", padding: "3px 8px", borderRadius: 999, fontWeight: 600, cursor: "pointer" }}>Goal: {(dailyGoalMinutes / 60).toFixed(dailyGoalMinutes % 60 ? 1 : 0)}h · tap to edit</span>
        )}
      </div>
      <div style={{ fontSize: 11, color: t.sub, marginBottom: 12 }}>Focus days: {focusDays} · Goal days: {goalDays} · Completion {rate}%</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <button onClick={() => setCursor(new Date(year, month - 1, 1))} style={{ background: "none", border: "none", color: t.sub, cursor: "pointer" }}><ChevronLeft size={16} /></button>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
        <button onClick={() => setCursor(new Date(year, month + 1, 1))} style={{ background: "none", border: "none", color: t.sub, cursor: "pointer" }}><ChevronRight size={16} /></button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, fontSize: 10, color: t.sub, marginBottom: 6, textAlign: "center" }}>{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <span key={d}>{d}</span>)}</div>
      <div ref={gridRef} style={{ position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
            const minutes = totalsByDay[dateStr] || 0;
            const met = minutes >= dailyGoalMinutes && minutes > 0;
            const over = minutes > dailyGoalMinutes;
            const isToday = dateStr === todayStr;
            const ringMax = Math.max(dailyGoalMinutes * 2, minutes, 1);
            const goalFrac = dailyGoalMinutes / ringMax;
            const totalFrac = Math.min(minutes / ringMax, 1);
            const circumference = 2 * Math.PI * 12;
            return (
              <button
                key={i}
                onClick={() => setSelectedDay({ dateStr, minutes })}
                onMouseEnter={(e) => showHover(e, dateStr, minutes)}
                onMouseLeave={() => hideHover(dateStr)}
                onTouchStart={(e) => showHover(e, dateStr, minutes)}
                onTouchEnd={() => hideHover(dateStr)}
                onFocus={(e) => showHover(e, dateStr, minutes)}
                onBlur={() => hideHover(dateStr)}
                title={`${new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "short" })} · ${Math.floor(minutes / 60)}h ${minutes % 60}m${minutes > 0 ? ` · ${minutes >= dailyGoalMinutes ? "goal hit" : "under target"}` : " · no focus logged"}`}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", aspectRatio: "1", position: "relative", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                {isToday || minutes > 0 ? (
                  <svg width={30} height={30} style={{ transform: "rotate(-90deg)" }}>
                    <circle cx={15} cy={15} r={12} fill="none" stroke={t.line} strokeWidth={3} />
                    <circle cx={15} cy={15} r={12} fill="none" stroke={over ? t.moss : t.clay} strokeWidth={3} strokeDasharray={circumference} strokeDashoffset={circumference * (1 - totalFrac)} strokeLinecap="round" />
                    {over && <circle cx={15} cy={15} r={12} fill="none" stroke={t.clay} strokeWidth={3} strokeDasharray={`${circumference * goalFrac} ${circumference}`} strokeLinecap="butt" opacity={0.9} />}
                  </svg>
                ) : <div style={{ width: 26, height: 26, borderRadius: "50%", background: "transparent" }} />}
                <span style={{ position: "absolute", fontSize: 11, color: isToday ? t.ink : met ? t.moss : t.sub, fontWeight: isToday || met ? 700 : 400 }}>{d}</span>
                {selectedDay?.dateStr === dateStr && <span style={{ position: "absolute", inset: -2, borderRadius: "50%", border: `1.5px solid ${t.ink}` }} />}
              </button>
            );
          })}
        </div>

        {hoverDay && (() => {
          const h = Math.floor(hoverDay.minutes / 60); const m = hoverDay.minutes % 60;
          const diff = hoverDay.minutes - dailyGoalMinutes;
          const diffH = Math.floor(Math.abs(diff) / 60); const diffM = Math.abs(diff) % 60;
          const label = new Date(hoverDay.dateStr + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" });
          return (
            <div
              style={{
                position: "absolute",
                left: hoverDay.left,
                top: hoverDay.top - 8,
                transform: "translate(-50%, -100%)",
                background: t.ink,
                color: t.bg,
                borderRadius: 8,
                padding: "7px 10px",
                fontSize: 11,
                whiteSpace: "nowrap",
                pointerEvents: "none",
                zIndex: 30,
                boxShadow: "0 4px 14px rgba(0,0,0,0.28)",
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 2 }}>{label}</div>
              <div>{hoverDay.minutes > 0 ? `${h}h ${m}m focused` : "No focus logged"}</div>
              {hoverDay.minutes > 0 && (
                <div style={{ color: diff >= 0 ? "#8FD19E" : "#E8A6A6", fontWeight: 600, marginTop: 1 }}>
                  {diff >= 0 ? "+" : "−"}{diffH}h {diffM}m {diff >= 0 ? "over" : "under"} target
                </div>
              )}
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "100%",
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderTop: `5px solid ${t.ink}`,
                }}
              />
            </div>
          );
        })()}
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 12, fontSize: 10, color: t.sub }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: t.clay, display: "inline-block" }} />Under target</span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: t.moss, display: "inline-block" }} />Over target</span>
      </div>
      <div style={{ marginTop: 10, minHeight: 34, background: t.bg, borderRadius: 10, padding: "9px 12px", fontSize: 12, color: selectedDay ? t.ink : t.sub }}>
        {selectedDay ? (() => {
          const h = Math.floor(selectedDay.minutes / 60); const m = selectedDay.minutes % 60;
          const diff = selectedDay.minutes - dailyGoalMinutes;
          const diffH = Math.floor(Math.abs(diff) / 60); const diffM = Math.abs(diff) % 60;
          return <span><strong>{new Date(selectedDay.dateStr + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "short" })}</strong>{" · "}{h}h {m}m focused{selectedDay.minutes > 0 ? ` · ${diff >= 0 ? "+" : "−"}${diffH}h ${diffM}m vs target` : " · no focus logged"}</span>;
        })() : "Hover or tap any day to see exact hours focused, even well past your target."}
      </div>
    </div>
  );
}
