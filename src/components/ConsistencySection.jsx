import React, { useState } from "react";
import { Plus, X, Flame, Trophy } from "lucide-react";
import { uid, todayKey, addDays } from "../utils/dates";
import ConsistencyHeatmap, { HeatmapLegend } from "./ConsistencyHeatmap";

const RANGE_OPTIONS = [10, 30, 60, 90];

function lastNDays(n) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: n }, (_, i) => addDays(today, -(n - 1 - i)));
}

// Streak: count consecutive days ending today (or ending yesterday if today isn't marked yet) where the task is in completedDates. Break on the first missing day going backward.
function computeTaskStreak(completedDates) {
  const marked = new Set(completedDates);
  let streak = 0;
  let d = new Date();
  while (true) {
    const key = todayKey(d);
    if (!marked.has(key)) {
      if (streak === 0 && key === todayKey()) {
        d = addDays(d, -1);
        continue;
      }
      break;
    }
    streak++;
    d = addDays(d, -1);
  }
  return streak;
}

// Best streak: longest run of consecutive calendar days ever logged for this
// task, not just the one currently running. Sorts the (deduped) date keys
// and walks them looking for day-over-day gaps of exactly 1.
function computeMaxStreak(completedDates) {
  if (!completedDates || completedDates.length === 0) return 0;
  const sorted = [...new Set(completedDates)].sort();
  let max = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T00:00:00");
    const curr = new Date(sorted[i] + "T00:00:00");
    const diffDays = Math.round((curr - prev) / 86400000);
    if (diffDays === 1) {
      run++;
    } else if (diffDays > 1) {
      run = 1;
    }
    if (run > max) max = run;
  }
  return max;
}

// Small pill showing an icon + number, used for current/best streak badges.
function StreakBadge({ t, icon, value, label, tint }) {
  return (
    <div
      title={label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "3px 8px",
        borderRadius: 999,
        background: t.bg,
        border: `1px solid ${t.line}`,
        fontSize: 10.5,
        fontWeight: 700,
        color: t.ink,
        flexShrink: 0,
      }}
    >
      {React.cloneElement(icon, { size: 11, color: tint, fill: value > 0 ? tint : "none", strokeWidth: 2.2 })}
      <span>{value}</span>
    </div>
  );
}

export default function ConsistencySection({ t, consistencyTasks, setConsistencyTasks }) {
  const [newText, setNewText] = useState("");
  const [rangeDays, setRangeDays] = useState(30);
  const days = lastNDays(rangeDays);

  function addTask() {
    const text = newText.trim();
    if (!text) return;
    setConsistencyTasks((prev) => [...prev, { id: uid(), text, completedDates: [] }]);
    setNewText("");
  }

  function renameTask(id, text) {
    setConsistencyTasks((prev) => prev.map((task) => (task.id === id ? { ...task, text } : task)));
  }

  function removeTask(id) {
    setConsistencyTasks((prev) => prev.filter((task) => task.id !== id));
  }

  function toggleDate(id, dateKey) {
    setConsistencyTasks((prev) => prev.map((task) => {
      if (task.id !== id) return task;
      const has = task.completedDates.includes(dateKey);
      return {
        ...task,
        completedDates: has
          ? task.completedDates.filter((d) => d !== dateKey)
          : [...task.completedDates, dateKey],
      };
    }));
  }

  // Overview cell value = fraction of tasks completed that day (0..1).
  // Read-only — a single day mixes several tasks, so there's no single
  // task to toggle from here; use the per-task grids below for that.
  function overviewValue(dateKey) {
    if (consistencyTasks.length === 0) return 0;
    const doneCount = consistencyTasks.reduce((n, task) => n + (task.completedDates.includes(dateKey) ? 1 : 0), 0);
    return doneCount / consistencyTasks.length;
  }

  const cardStyle = {
    background: t.surface,
    border: `1px solid ${t.line}`,
    borderRadius: 16,
    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
  };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a consistency task"
          style={{ flex: 1, minWidth: 0, background: t.bg, border: `1px solid ${t.line}`, borderRadius: 10, padding: "9px 12px", color: t.ink, fontSize: 12.5, outline: "none" }}
        />
        <button
          onClick={addTask}
          style={{
            background: `linear-gradient(135deg, ${t.moss}, ${t.clay})`,
            border: "none",
            borderRadius: 10,
            width: 38,
            flexShrink: 0,
            color: "#fff",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 2px 8px ${t.moss}55`,
          }}
          aria-label="Add task"
        >
          <Plus size={16} />
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: t.sub, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}>Last {rangeDays} days</div>
        <div style={{ display: "flex", gap: 4, background: t.bg, borderRadius: 10, padding: 3, border: `1px solid ${t.line}` }}>
          {RANGE_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => setRangeDays(n)}
              style={{
                padding: "5px 10px",
                borderRadius: 7,
                border: "none",
                background: rangeDays === n ? `linear-gradient(135deg, ${t.moss}, ${t.clay})` : "transparent",
                color: rangeDays === n ? "#fff" : t.sub,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: rangeDays === n ? "0 1px 4px rgba(0,0,0,0.15)" : "none",
                transition: "background 120ms ease, color 120ms ease",
              }}
            >
              {n}d
            </button>
          ))}
        </div>
      </div>

      {consistencyTasks.length === 0 ? (
        <div style={{ ...cardStyle, fontSize: 11.5, color: t.sub, fontStyle: "italic", padding: "18px 16px", marginBottom: 22, textAlign: "center" }}>
          No tasks yet. Add one above to start tracking.
        </div>
      ) : (
        <div style={{ ...cardStyle, padding: "16px 18px 14px", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: t.ink }}>
              Overview <span style={{ fontWeight: 400, color: t.sub }}>— share of tasks completed each day</span>
            </div>
          </div>
          <div className="sf-scroll" style={{ overflowX: "auto", paddingBottom: 4 }}>
            <ConsistencyHeatmap t={t} days={days} getValue={overviewValue} cellSize={12} gap={3.5} />
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, paddingTop: 10, borderTop: `1px solid ${t.line}` }}>
            <HeatmapLegend t={t} cellSize={10} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {consistencyTasks.map((task) => {
          const streak = computeTaskStreak(task.completedDates);
          const best = computeMaxStreak(task.completedDates);
          return (
            <div key={task.id} style={{ ...cardStyle, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <input
                  value={task.text}
                  onChange={(e) => renameTask(task.id, e.target.value)}
                  style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: t.ink, fontSize: 13, fontWeight: 600, outline: "none", padding: "2px 0" }}
                  aria-label="Task name"
                />
                <StreakBadge t={t} icon={<Flame />} value={streak} label="Current streak" tint={t.clay} />
                <StreakBadge t={t} icon={<Trophy />} value={best} label="Best streak" tint={t.moss} />
                <button onClick={() => removeTask(task.id)} style={{ background: "none", border: "none", color: t.sub, cursor: "pointer", opacity: 0.6, display: "flex", flexShrink: 0, padding: 2 }} aria-label="Delete task">
                  <X size={13} />
                </button>
              </div>
              <div className="sf-scroll" style={{ overflowX: "auto" }}>
                <ConsistencyHeatmap
                  t={t}
                  days={days}
                  getValue={(key) => task.completedDates.includes(key)}
                  onCellClick={(key) => toggleDate(task.id, key)}
                  getAriaLabel={(key, done) => `${task.text} ${key}${done ? " completed" : ""}`}
                  cellSize={10}
                  gap={2.5}
                  showMonthLabels={false}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 11, color: t.sub, marginTop: 16, textAlign: "center" }}>Tap a square to mark that day · streak counts consecutive days ending today (or yesterday if today is still open).</div>
    </div>
  );
}
