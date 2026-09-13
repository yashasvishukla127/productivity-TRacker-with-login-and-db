import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { uid, todayKey, addDays } from "../utils/dates";
import ConsistencyHeatmap from "./ConsistencyHeatmap";

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

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask()}
          placeholder="Add a consistency task"
          style={{ flex: 1, minWidth: 0, background: t.bg, border: `1px solid ${t.line}`, borderRadius: 8, padding: "8px 10px", color: t.ink, fontSize: 12.5, outline: "none" }}
        />
        <button onClick={addTask} style={{ background: t.moss, border: "none", borderRadius: 8, width: 34, flexShrink: 0, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Add task">
          <Plus size={15} />
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: t.sub, textTransform: "uppercase", letterSpacing: "0.08em" }}>Last {rangeDays} days</div>
        <div style={{ display: "flex", gap: 4, background: t.surface, borderRadius: 8, padding: 3 }}>
          {RANGE_OPTIONS.map((n) => (
            <button
              key={n}
              onClick={() => setRangeDays(n)}
              style={{
                padding: "5px 9px",
                borderRadius: 6,
                border: "none",
                background: rangeDays === n ? t.bg : "transparent",
                color: rangeDays === n ? t.ink : t.sub,
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                boxShadow: rangeDays === n ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {n}d
            </button>
          ))}
        </div>
      </div>

      {consistencyTasks.length === 0 ? (
        <div style={{ fontSize: 11.5, color: t.sub, fontStyle: "italic", padding: "8px 0 18px" }}>
          No tasks yet. Add one above to start tracking.
        </div>
      ) : (
        <div style={{ marginBottom: 22, paddingBottom: 18, borderBottom: `1px solid ${t.line}` }}>
          <div style={{ fontSize: 11, color: t.sub, marginBottom: 8 }}>Overview — share of tasks completed each day</div>
          <div className="sf-scroll" style={{ overflowX: "auto" }}>
            <ConsistencyHeatmap t={t} days={days} getValue={overviewValue} cellSize={11} gap={3} />
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {consistencyTasks.map((task) => {
          const streak = computeTaskStreak(task.completedDates);
          return (
            <div key={task.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <input
                  value={task.text}
                  onChange={(e) => renameTask(task.id, e.target.value)}
                  style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: t.ink, fontSize: 12.5, outline: "none", padding: "2px 0" }}
                  aria-label="Task name"
                />
                <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 700, color: t.moss, fontFamily: "Georgia,serif" }} title="Current streak">{streak}</span>
                <button onClick={() => removeTask(task.id)} style={{ background: "none", border: "none", color: t.sub, cursor: "pointer", opacity: 0.6, display: "flex", flexShrink: 0, padding: 2 }} aria-label="Delete task">
                  <X size={12} />
                </button>
              </div>
              <div className="sf-scroll" style={{ overflowX: "auto" }}>
                <ConsistencyHeatmap
                  t={t}
                  days={days}
                  getValue={(key) => task.completedDates.includes(key)}
                  onCellClick={(key) => toggleDate(task.id, key)}
                  getAriaLabel={(key, done) => `${task.text} ${key}${done ? " completed" : ""}`}
                  cellSize={9}
                  gap={2}
                  showMonthLabels={false}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 11, color: t.sub, marginTop: 16 }}>Tap a square to mark that day · streak counts consecutive days ending today (or yesterday if today is still open).</div>
    </div>
  );
}
