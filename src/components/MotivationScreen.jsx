import React, { useState } from "react";
import { Heart, Plus, Trash2 } from "lucide-react";
import { uid, todayKey } from "../utils/dates";
import ChallengesSection from "./ChallengesSection";

export default function MotivationScreen({ t, whyText, setWhyText, motivationLog, setMotivationLog, challengesLog, setChallengesLog }) {
  const [draft, setDraft] = useState(whyText);
  const [newNote, setNewNote] = useState("");
  function saveWhy() { setWhyText(draft); }
  function addNote() { const text = newNote.trim(); if (!text) return; setMotivationLog((prev) => [{ id: uid(), date: todayKey(), text }, ...prev]); setNewNote(""); }
  function removeNote(id) { setMotivationLog((prev) => prev.filter((m) => m.id !== id)); }
  return (
    <div>
      <div style={{ background: t.surface, borderRadius: 14, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 700, marginBottom: 8 }}><Heart size={14} color={t.clay} /> Why I'm doing this</div>
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={saveWhy} placeholder="Write down the reason you're building this focus habit — what you're working toward, and why it matters to you." rows={4} style={{ width: "100%", background: t.bg, border: `1px solid ${t.line}`, borderRadius: 10, padding: "10px 12px", color: t.ink, fontSize: 13, outline: "none", resize: "vertical", fontFamily: "system-ui" }} />
        <div style={{ fontSize: 10.5, color: t.sub, marginTop: 6 }}>Saved automatically — read this whenever you need a reminder.</div>
      </div>

      <ChallengesSection t={t} challengesLog={challengesLog} setChallengesLog={setChallengesLog} />

      <div style={{ fontSize: 11, color: t.sub, textTransform: "uppercase", letterSpacing: "0.1em", margin: "22px 0 10px" }}>Motivation log</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <input value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} placeholder="Jot a thought, win, or reminder…" style={{ flex: 1, minWidth: 0, background: "transparent", border: `1px solid ${t.line}`, borderRadius: 10, padding: "8px 12px", color: t.ink, fontSize: 13, outline: "none" }} />
        <button onClick={addNote} style={{ width: 36, flexShrink: 0, borderRadius: 10, border: `1px solid ${t.line}`, background: "transparent", color: t.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={16} /></button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {motivationLog.length === 0 && <div style={{ fontSize: 12.5, color: t.sub, fontStyle: "italic" }}>Nothing logged yet.</div>}
        {motivationLog.map((m) => (
          <div key={m.id} style={{ background: t.surface, borderRadius: 10, padding: "10px 12px", display: "flex", gap: 10, alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, color: t.sub, marginBottom: 2 }}>{new Date(m.date + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })}</div>
              <div style={{ fontSize: 13, lineHeight: 1.4 }}>{m.text}</div>
            </div>
            <button onClick={() => removeNote(m.id)} style={{ background: "none", border: "none", color: t.sub, cursor: "pointer", opacity: 0.6, flexShrink: 0 }}><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
