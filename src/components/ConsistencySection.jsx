import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { uid, todayKey, addDays } from "../utils/dates";

const WINDOW_DAYS = 30;
const NAME_COL = 148;
const DAY_COL = 28;

function windowDates() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: WINDOW_DAYS }, (_, i) => addDays(today, -(WINDOW_DAYS - 1 - i)));
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
  const days = windowDates();
  const todayStr = todayKey();

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

  const rowCount = Math.max(consistencyTasks.length, 1);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
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

      <div className="sf-scroll" style={{ overflow: "auto", maxHeight: 440, border: `1px solid ${t.line}`, borderRadius: 12 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `${NAME_COL}px repeat(${WINDOW_DAYS}, ${DAY_COL}px)`,
            gridTemplateRows: `auto repeat(${rowCount}, 40px)`,
            minWidth: NAME_COL + WINDOW_DAYS * DAY_COL,
          }}
        >
          <div style={{ gridColumn: 1, gridRow: 1, position: "sticky", top: 0, left: 0, zIndex: 6, background: t.surface2, borderBottom: `1px solid ${t.line}`, borderRight: `1px solid ${t.line}`, fontSize: 9.5, color: t.sub, display: "flex", alignItems: "center", padding: "8px 8px" }}>Task</div>
          {days.map((d, i) => {
            const key = todayKey(d);
            const isToday = key === todayStr;
            return (
              <div
                key={key}
                style={{
                  gridColumn: i + 2,
                  gridRow: 1,
                  position: "sticky",
                  top: 0,
                  zIndex: 4,
                  background: isToday ? t.moss : t.surface2,
                  color: isToday ? t.bg : t.ink,
                  textAlign: "center",
                  padding: "6px 0 4px",
                  fontSize: 9.5,
                  fontWeight: 700,
                  borderBottom: `1px solid ${t.line}`,
                  lineHeight: 1.2,
                }}
              >
                <div>{d.toLocaleDateString(undefined, { weekday: "narrow" })}</div>
                <div style={{ fontWeight: 400, opacity: 0.85 }}>{d.getDate()}</div>
              </div>
            );
          })}

          {consistencyTasks.length === 0 && (
            <div style={{ gridColumn: `1 / span ${WINDOW_DAYS + 1}`, gridRow: 2, display: "flex", alignItems: "center", padding: "0 12px", fontSize: 11.5, color: t.sub, fontStyle: "italic" }}>
              No tasks yet. Add one above to start tracking.
            </div>
          )}

          {consistencyTasks.map((task, rowIdx) => {
            const streak = computeTaskStreak(task.completedDates);
            return (
              <React.Fragment key={task.id}>
                <div style={{ gridColumn: 1, gridRow: rowIdx + 2, position: "sticky", left: 0, zIndex: 2, background: t.surface2, borderRight: `1px solid ${t.line}`, borderBottom: `1px solid ${t.line}`, display: "flex", alignItems: "center", gap: 4, padding: "0 6px", minWidth: 0 }}>
                  <input
                    value={task.text}
                    onChange={(e) => renameTask(task.id, e.target.value)}
                    style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", color: t.ink, fontSize: 11.5, outline: "none", padding: "4px 0" }}
                    aria-label="Task name"
                  />
                  <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: t.moss, fontFamily: "Georgia,serif" }} title="Current streak">{streak}</span>
                  <button onClick={() => removeTask(task.id)} style={{ background: "none", border: "none", color: t.sub, cursor: "pointer", opacity: 0.6, display: "flex", flexShrink: 0, padding: 2 }} aria-label="Delete task">
                    <X size={11} />
                  </button>
                </div>
                {days.map((d, i) => {
                  const key = todayKey(d);
                  const done = task.completedDates.includes(key);
                  const isToday = key === todayStr;
                  return (
                    <button
                      key={key}
                      onClick={() => toggleDate(task.id, key)}
                      aria-label={`${task.text} ${key}${done ? " completed" : ""}`}
                      aria-pressed={done}
                      style={{
                        gridColumn: i + 2,
                        gridRow: rowIdx + 2,
                        border: "none",
                        borderBottom: `1px solid ${t.line}`,
                        background: isToday ? t.moss + "14" : "transparent",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                      }}
                    >
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          border: `1.5px solid ${done ? t.moss : t.line}`,
                          background: done ? t.moss : "transparent",
                          display: "inline-block",
                        }}
                      />
                    </button>
                  );
                })}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div style={{ fontSize: 11, color: t.sub, marginTop: 8 }}>Last 30 days · tap a circle to mark a day · streak counts consecutive days ending today (or yesterday if today is still open).</div>
    </div>
  );
}
