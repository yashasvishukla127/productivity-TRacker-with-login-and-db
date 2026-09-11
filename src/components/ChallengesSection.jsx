import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { uid, todayKey } from "../utils/dates";

export default function ChallengesSection({ t, challengesLog, setChallengesLog }) {
  const [newChallenge, setNewChallenge] = useState("");

  function addChallenge() {
    const text = newChallenge.trim();
    if (!text) return;
    setChallengesLog((prev) => [{ id: uid(), date: todayKey(), challenge: text, solution: "" }, ...prev]);
    setNewChallenge("");
  }
  function updateSolution(id, solution) { setChallengesLog((prev) => prev.map((c) => (c.id === id ? { ...c, solution } : c))); }
  function updateChallenge(id, challenge) { setChallengesLog((prev) => prev.map((c) => (c.id === id ? { ...c, challenge } : c))); }
  function removeItem(id) { setChallengesLog((prev) => prev.filter((c) => c.id !== id)); }

  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ fontSize: 11, color: t.sub, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Challenges & solutions</div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input value={newChallenge} onChange={(e) => setNewChallenge(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addChallenge()} placeholder="What's getting in your way?" style={{ flex: 1, minWidth: 0, background: "transparent", border: `1px solid ${t.line}`, borderRadius: 10, padding: "8px 12px", color: t.ink, fontSize: 13, outline: "none" }} />
        <button onClick={addChallenge} style={{ width: 36, flexShrink: 0, borderRadius: 10, border: `1px solid ${t.line}`, background: "transparent", color: t.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={16} /></button>
      </div>

      {challengesLog.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 10, color: t.sub, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, padding: "0 2px" }}>
          <span>Challenge</span><span>Solution</span>
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {challengesLog.length === 0 && <div style={{ fontSize: 12.5, color: t.sub, fontStyle: "italic" }}>No challenges logged yet.</div>}
        {challengesLog.map((c) => (
          <div key={c.id} style={{ background: t.surface, borderRadius: 10, padding: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, alignItems: "start" }}>
            <textarea value={c.challenge} onChange={(e) => updateChallenge(c.id, e.target.value)} rows={2} style={{ width: "100%", background: t.bg, border: `1px solid ${t.line}`, borderRadius: 8, padding: "6px 8px", color: t.ink, fontSize: 12, outline: "none", resize: "vertical", fontFamily: "system-ui" }} />
            <textarea value={c.solution} onChange={(e) => updateSolution(c.id, e.target.value)} placeholder="What helped, or what might help?" rows={2} style={{ width: "100%", background: t.bg, border: `1px solid ${t.line}`, borderRadius: 8, padding: "6px 8px", color: t.ink, fontSize: 12, outline: "none", resize: "vertical", fontFamily: "system-ui" }} />
            <div style={{ gridColumn: "span 2", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 9.5, color: t.sub }}>{new Date(c.date + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "short" })}</span>
              <button onClick={() => removeItem(c.id)} style={{ background: "none", border: "none", color: t.sub, cursor: "pointer", opacity: 0.6, display: "flex" }}><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
