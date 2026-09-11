import React, { useState } from "react";
import { Clock3, X } from "lucide-react";
import { todayKey } from "../utils/dates";

export default function LogTimeModal({ t, eisenhower, onClose, onSave }) {
  const [date, setDate] = useState(todayKey());
  const [startTime, setStartTime] = useState("09:00");
  const [hours, setHours] = useState(1);
  const [minutes, setMinutes] = useState(0);
  const [note, setNote] = useState("");
  const [showSuggest, setShowSuggest] = useState(false);
  const suggestions = eisenhower.filter((e) => !note || e.text.toLowerCase().includes(note.toLowerCase()));
  return (
    <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "flex-end", zIndex: 10, borderRadius: 20 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: t.bg, width: "100%", borderRadius: "18px 18px 0 0", padding: "20px 22px 26px", fontFamily: "system-ui", maxHeight: "88%", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 15, fontWeight: 600, fontFamily: "Georgia,serif" }}><Clock3 size={16} color={t.moss} /> Log past focus time</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: t.sub, cursor: "pointer" }}><X size={17} /></button>
        </div>
        <label style={{ fontSize: 11, color: t.sub, textTransform: "uppercase", letterSpacing: "0.06em" }}>Date</label>
        <input type="date" value={date} max={todayKey()} onChange={(e) => setDate(e.target.value)} style={{ width: "100%", marginTop: 6, marginBottom: 14, background: "transparent", border: `1px solid ${t.line}`, borderRadius: 10, padding: "9px 12px", color: t.ink, fontSize: 13.5, outline: "none" }} />
        <label style={{ fontSize: 11, color: t.sub, textTransform: "uppercase", letterSpacing: "0.06em" }}>Start time</label>
        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} style={{ width: "100%", marginTop: 6, marginBottom: 14, background: "transparent", border: `1px solid ${t.line}`, borderRadius: 10, padding: "9px 12px", color: t.ink, fontSize: 13.5, outline: "none" }} />
        <label style={{ fontSize: 11, color: t.sub, textTransform: "uppercase", letterSpacing: "0.06em" }}>Duration</label>
        <div style={{ display: "flex", gap: 10, marginTop: 6, marginBottom: 14 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
            <input type="number" min={0} max={23} value={hours} onChange={(e) => setHours(e.target.value)} style={{ width: "100%", background: "transparent", border: `1px solid ${t.line}`, borderRadius: 10, padding: "9px 12px", color: t.ink, fontSize: 13.5, outline: "none" }} />
            <span style={{ fontSize: 12, color: t.sub }}>hrs</span>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
            <input type="number" min={0} max={59} value={minutes} onChange={(e) => setMinutes(e.target.value)} style={{ width: "100%", background: "transparent", border: `1px solid ${t.line}`, borderRadius: 10, padding: "9px 12px", color: t.ink, fontSize: 13.5, outline: "none" }} />
            <span style={{ fontSize: 12, color: t.sub }}>min</span>
          </div>
        </div>
        <label style={{ fontSize: 11, color: t.sub, textTransform: "uppercase", letterSpacing: "0.06em" }}>Note / task (optional)</label>
        <div style={{ position: "relative" }}>
          <input value={note} onFocus={() => setShowSuggest(true)} onChange={(e) => { setNote(e.target.value); setShowSuggest(true); }} placeholder="What did you work on?" style={{ width: "100%", marginTop: 6, marginBottom: showSuggest && suggestions.length ? 4 : 20, background: "transparent", border: `1px solid ${t.line}`, borderRadius: 10, padding: "9px 12px", color: t.ink, fontSize: 13.5, outline: "none" }} />
          {showSuggest && suggestions.length > 0 && (
            <div style={{ background: t.surface, border: `1px solid ${t.line}`, borderRadius: 10, marginBottom: 16, overflow: "hidden" }}>
              {suggestions.slice(0, 5).map((s) => <div key={s.id} onClick={() => { setNote(s.text); setShowSuggest(false); }} style={{ padding: "8px 12px", fontSize: 12.5, cursor: "pointer", borderBottom: `1px solid ${t.line}` }}>{s.text}</div>)}
            </div>
          )}
        </div>
        <button onClick={() => onSave({ date, startTime, hours, minutes, note })} style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "none", background: t.ink, color: t.bg, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>Save entry</button>
      </div>
    </div>
  );
}
