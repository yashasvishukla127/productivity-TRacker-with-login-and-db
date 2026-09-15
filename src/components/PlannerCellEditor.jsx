import React, { useState } from "react";
import { X, Plus } from "lucide-react";
import { SLEEP_COLOR, taskColor } from "../theme";
import { timeToMin } from "../utils/dates";

export default function PlannerCellEditor({ t, editing, eisenhower, onClose, onSave }) {
  const dayStartHour = editing.dayStartHour || 0;
  const [text, setText] = useState(editing.current);
  const minFillEnd = (editing.start + 1) * 30;
  const [fillEndOffset, setFillEndOffset] = useState(Math.min(Math.max((editing.end + 1) * 30, minFillEnd), 1440));
  const suggestions = eisenhower.filter((e) => !text || e.text.toLowerCase().includes(text.toLowerCase()));

  function offsetToClock(offsetMin) { const mm = ((dayStartHour * 60 + offsetMin) % 1440 + 1440) % 1440; const h = Math.floor(mm / 60); const mi = mm % 60; return `${h.toString().padStart(2, "0")}:${mi.toString().padStart(2, "0")}`; }
  function clockToOffset(val, minOffset) { let raw = timeToMin(val) - dayStartHour * 60; if (raw < 0) raw += 1440; if (raw < minOffset) raw += 1440; return raw; }

  const startLabel = offsetToClock(editing.start * 30);

  function handleFillEndChange(val) { setFillEndOffset(Math.min(1440, Math.max(minFillEnd, clockToOffset(val, minFillEnd)))); }
  function bumpFillEnd(mins) { setFillEndOffset((m) => Math.min(1440, Math.max(minFillEnd, m + mins))); }
  function endIdxFromFillEnd() { return Math.max(editing.start, Math.min(47, Math.round(fillEndOffset / 30) - 1)); }

  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end", zIndex: 10, borderRadius: 20 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: t.bg, width: "100%", borderRadius: "18px 18px 0 0", padding: "20px 22px 26px", fontFamily: "system-ui", maxHeight: "88%", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{editing.type === "planned" ? "Plan" : "Log"} · {new Date(editing.date + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", day: "2-digit", month: "short" })} · from {startLabel}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.sub, cursor: "pointer" }}><X size={17} /></button>
        </div>

        <input autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Type or pick from your Eisenhower tasks" style={{ width: "100%", background: "transparent", border: `1px solid ${t.line}`, borderRadius: 10, padding: "9px 12px", color: t.ink, fontSize: 13.5, outline: "none", marginBottom: 8 }} />

        <button onClick={() => setText("Sleep")} style={{ display: "flex", alignItems: "center", gap: 5, background: SLEEP_COLOR, color: "#4a3a08", border: "none", borderRadius: 999, padding: "4px 10px", fontSize: 11.5, fontWeight: 700, cursor: "pointer", marginBottom: 12 }}>💤 Mark as Sleep</button>

        {suggestions.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 130, overflowY: "auto", marginBottom: 14 }}>
            {suggestions.map((s) => <div key={s.id} onClick={() => setText(s.text)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, background: t.surface, cursor: "pointer" }}><span style={{ width: 7, height: 7, borderRadius: "50%", background: taskColor(s.text) || t.moss, flexShrink: 0 }} /><span style={{ fontSize: 12.5, flex: 1 }}>{s.text}</span></div>)}
          </div>
        )}

        <label style={{ fontSize: 11, color: t.sub, textTransform: "uppercase", letterSpacing: "0.06em" }}>Fill until (merges into one block)</label>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, marginBottom: 8 }}>
          <input type="time" step={1800} value={offsetToClock(fillEndOffset)} onChange={(e) => handleFillEndChange(e.target.value)} style={{ background: "transparent", border: `1px solid ${t.line}`, borderRadius: 10, padding: "8px 10px", color: t.ink, fontSize: 13, outline: "none" }} />
          <span style={{ fontSize: 11, color: t.sub }}>{fillEndOffset >= 1440 ? "(end of day)" : `from ${startLabel}`}</span>
        </div>
        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
          {[{ l: "+30m", m: 30 }, { l: "+1h", m: 60 }, { l: "+2h", m: 120 }, { l: "+4h", m: 240 }, { l: "Rest of day", m: 1440 }].map((b) => (
            <button key={b.l} onClick={() => (b.l === "Rest of day" ? setFillEndOffset(1440) : bumpFillEnd(b.m))} style={{ padding: "5px 10px", borderRadius: 999, border: `1px solid ${t.line}`, background: "transparent", color: t.sub, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>{b.l}</button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {editing.current && <button onClick={() => onSave("", editing.end)} style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: `1px solid ${t.line}`, background: "transparent", color: t.clay, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Clear</button>}
          <button onClick={() => onSave(text.trim(), endIdxFromFillEnd())} style={{ flex: 2, padding: "11px 0", borderRadius: 12, border: "none", background: t.ink, color: t.bg, fontSize: 13.5, fontWeight: 600, cursor: "pointer" }}>Save</button>
        </div>
      </div>
    </div>
  );
}
