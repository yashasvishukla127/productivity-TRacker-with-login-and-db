import React, { useState } from "react";
import { Plus } from "lucide-react";
import { QUADRANTS } from "../theme";
import { uid } from "../utils/dates";
import ExpandableTaskItem from "./ExpandableTaskItem";

export default function MatrixScreen({ t, eisenhower, setEisenhower }) {
  const [inputs, setInputs] = useState({ do: "", schedule: "", delegate: "", eliminate: "", none: "" });
  const [expandedIds, setExpandedIds] = useState(new Set());

  function addItem(quadrant) {
    const text = inputs[quadrant].trim();
    if (!text) return;
    setEisenhower((prev) => [...prev, { id: uid(), text, quadrant, done: false, notes: "", subtasks: [] }]);
    setInputs((p) => ({ ...p, [quadrant]: "" }));
  }
  function toggleDone(id) { setEisenhower((prev) => prev.map((e) => (e.id === id ? { ...e, done: !e.done } : e))); }
  function removeItem(id) { setEisenhower((prev) => prev.filter((e) => e.id !== id)); }
  function updateItem(updated) { setEisenhower((prev) => prev.map((e) => (e.id === updated.id ? updated : e))); }
  function toggleExpand(id) { setExpandedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; }); }

  const others = eisenhower.filter((e) => e.quadrant === "none");

  return (
    <div>
      <div style={{ fontSize: 12, color: t.sub, marginBottom: 14, lineHeight: 1.5 }}>
        Sort what you need to do by urgency and importance. Tap a task's name to add details or subtasks — these also suggest into your Planner.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
        {QUADRANTS.map((q) => {
          const items = eisenhower.filter((e) => e.quadrant === q.key);
          return (
            <div key={q.key} style={{ background: t.surface, borderRadius: 14, padding: 12, borderTop: `3px solid ${t.moss}`, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 1 }}>{q.title}</div>
              <div style={{ fontSize: 10, color: t.sub, marginBottom: 8 }}>{q.sub}</div>
              <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
                <input value={inputs[q.key]} onChange={(e) => setInputs((p) => ({ ...p, [q.key]: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addItem(q.key)} placeholder="Add task" style={{ flex: 1, minWidth: 0, background: t.bg, border: `1px solid ${t.line}`, borderRadius: 8, padding: "6px 8px", color: t.ink, fontSize: 11.5, outline: "none" }} />
                <button onClick={() => addItem(q.key)} style={{ background: t.moss, border: "none", borderRadius: 8, width: 26, flexShrink: 0, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={13} /></button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 190, overflowY: "auto" }}>
                {items.length === 0 && <div style={{ fontSize: 10.5, color: t.sub, fontStyle: "italic" }}>No tasks yet.</div>}
                {items.map((e) => (
                  <ExpandableTaskItem key={e.id} t={t} item={e} accentColor={t.moss} expanded={expandedIds.has(e.id)} onToggleExpand={toggleExpand} onToggleDone={toggleDone} onDelete={removeItem} onUpdate={updateItem} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: t.surface, borderRadius: 14, padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Tasks</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input value={inputs.none} onChange={(e) => setInputs((p) => ({ ...p, none: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && addItem("none")} placeholder="Add a task (sort it into a quadrant later)" style={{ flex: 1, minWidth: 0, background: t.bg, border: `1px solid ${t.line}`, borderRadius: 8, padding: "8px 10px", color: t.ink, fontSize: 12.5, outline: "none" }} />
          <button onClick={() => addItem("none")} style={{ background: t.clay, border: "none", borderRadius: 8, width: 34, flexShrink: 0, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={15} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {others.length === 0 && <div style={{ fontSize: 11.5, color: t.sub, fontStyle: "italic" }}>No general tasks yet.</div>}
          {others.map((e) => (
            <ExpandableTaskItem key={e.id} t={t} item={e} accentColor={t.clay} expanded={expandedIds.has(e.id)} onToggleExpand={toggleExpand} onToggleDone={toggleDone} onDelete={removeItem} onUpdate={updateItem} />
          ))}
        </div>
      </div>
    </div>
  );
}
