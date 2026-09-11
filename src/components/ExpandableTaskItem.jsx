import React, { useState } from "react";
import { Check, X, ChevronUp, ChevronDown, Plus } from "lucide-react";
import { uid } from "../utils/dates";

export default function ExpandableTaskItem({ t, item, accentColor, expanded, onToggleExpand, onToggleDone, onDelete, onUpdate }) {
  const [subInput, setSubInput] = useState("");
  const notes = item.notes || "";
  const subtasks = item.subtasks || [];

  function addSubtask() {
    const text = subInput.trim();
    if (!text) return;
    onUpdate({ ...item, subtasks: [...subtasks, { id: uid(), text, done: false }] });
    setSubInput("");
  }
  function toggleSubtask(id) { onUpdate({ ...item, subtasks: subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s)) }); }
  function removeSubtask(id) { onUpdate({ ...item, subtasks: subtasks.filter((s) => s.id !== id) }); }
  const doneCount = subtasks.filter((s) => s.done).length;

  return (
    <div style={{ borderRadius: 8, background: expanded ? t.bg : "transparent", border: expanded ? `1px solid ${t.line}` : "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, padding: expanded ? "6px 8px 4px" : "0" }}>
        <button onClick={() => onToggleDone(item.id)} style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${item.done ? accentColor : t.sub}`, background: item.done ? accentColor : "transparent", flexShrink: 0, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{item.done && <Check size={9} color="#fff" />}</button>
        <span onClick={() => onToggleExpand(item.id)} style={{ flex: 1, textDecoration: item.done ? "line-through" : "none", color: item.done ? t.sub : t.ink, overflowWrap: "anywhere", cursor: "pointer" }}>
          {item.text}{subtasks.length > 0 && <span style={{ color: t.sub, fontSize: 10 }}> ({doneCount}/{subtasks.length})</span>}
        </span>
        <button onClick={() => onToggleExpand(item.id)} style={{ background: "none", border: "none", color: t.sub, cursor: "pointer", display: "flex", flexShrink: 0 }}>{expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>
        <button onClick={() => onDelete(item.id)} style={{ background: "none", border: "none", color: t.sub, cursor: "pointer", opacity: 0.6, display: "flex", flexShrink: 0 }}><X size={11} /></button>
      </div>
      {expanded && (
        <div style={{ padding: "0 8px 10px" }}>
          <textarea value={notes} onChange={(e) => onUpdate({ ...item, notes: e.target.value })} placeholder="Details or notes…" rows={2} style={{ width: "100%", background: t.surface, border: `1px solid ${t.line}`, borderRadius: 6, padding: "6px 8px", color: t.ink, fontSize: 11, outline: "none", resize: "vertical", fontFamily: "system-ui", marginBottom: 6 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 6 }}>
            {subtasks.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11 }}>
                <button onClick={() => toggleSubtask(s.id)} style={{ width: 12, height: 12, borderRadius: 3, border: `1.5px solid ${s.done ? accentColor : t.sub}`, background: s.done ? accentColor : "transparent", flexShrink: 0, cursor: "pointer" }} />
                <span style={{ flex: 1, textDecoration: s.done ? "line-through" : "none", color: s.done ? t.sub : t.ink }}>{s.text}</span>
                <button onClick={() => removeSubtask(s.id)} style={{ background: "none", border: "none", color: t.sub, cursor: "pointer", opacity: 0.5 }}><X size={9} /></button>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <input value={subInput} onChange={(e) => setSubInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSubtask()} placeholder="Add subtask" style={{ flex: 1, minWidth: 0, background: t.surface, border: `1px solid ${t.line}`, borderRadius: 6, padding: "5px 7px", color: t.ink, fontSize: 10.5, outline: "none" }} />
            <button onClick={addSubtask} style={{ background: accentColor, border: "none", borderRadius: 6, width: 22, flexShrink: 0, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={11} /></button>
          </div>
        </div>
      )}
    </div>
  );
}
