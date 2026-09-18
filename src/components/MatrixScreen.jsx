import React, { useState, useEffect } from "react";
import { Plus, Flame, CalendarClock, Users2, Ban, Sparkles } from "lucide-react";
import { QUADRANTS } from "../theme";
import { uid } from "../utils/dates";
import ExpandableTaskItem from "./ExpandableTaskItem";
import ProcrastinateBreakBoard from "./ProcrastinateBreakBoard";

const FONT_LINK_ID = "matrix-fraunces-font";
const DISPLAY_FONT = "'Fraunces', Georgia, 'Times New Roman', serif";

const QUADRANT_META = {
  do: { icon: Flame },
  schedule: { icon: CalendarClock },
  delegate: { icon: Users2 },
  eliminate: { icon: Ban },
};

// Mix a hex colour toward another (amt 0–1) so quadrant accents stay in
// harmony with whichever colour theme (Sage & Clay, Ocean & Coral, …) is
// currently active, instead of hard-coding colours that could clash.
function mix(hex, target, amt) {
  const a = hex.replace("#", ""), b = target.replace("#", "");
  const an = parseInt(a, 16), bn = parseInt(b, 16);
  const ch = (shift) => {
    const av = (an >> shift) & 255, bv = (bn >> shift) & 255;
    return Math.round(av * (1 - amt) + bv * amt);
  };
  const r = ch(16), g = ch(8), bch = ch(0);
  return `#${((1 << 24) + (r << 16) + (g << 8) + bch).toString(16).slice(1)}`;
}

export default function MatrixScreen({ t, eisenhower, setEisenhower, procrastinateTasks, setProcrastinateTasks, breakTasks, setBreakTasks }) {
  const [inputs, setInputs] = useState({ do: "", schedule: "", delegate: "", eliminate: "", none: "" });
  const [expandedIds, setExpandedIds] = useState(new Set());
  const [focusedKey, setFocusedKey] = useState(null);
  const [hoveredKey, setHoveredKey] = useState(null);

  // Load a premium display serif once, for headings only — everything else
  // keeps the app's normal font so nothing else shifts.
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap";
    document.head.appendChild(link);
  }, []);

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

  // Theme-aware accent per quadrant: urgent+important is the hottest (clay),
  // important-but-not-urgent is the calmest (moss), and the other two are
  // softened/muted variants of those two so every quadrant reads distinctly
  // at a glance while still matching whatever palette is selected.
  const accents = {
    do: t.clay,
    schedule: t.moss,
    delegate: mix(t.clay, "#ffffff", 0.4),
    eliminate: mix(t.moss, "#000000", 0.3),
  };

  const cardShadow = "0 1px 2px rgba(0,0,0,0.05), 0 10px 24px -16px rgba(0,0,0,0.35)";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <Sparkles size={12} color={t.clay} />
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: t.sub }}>Eisenhower Matrix</div>
      </div>
      <div style={{ fontSize: 12.5, color: t.sub, marginBottom: 16, lineHeight: 1.55, maxWidth: 480 }}>
        Sort what you need to do by urgency and importance. Tap a task's name to add details or subtasks — these also suggest into your Planner.
      </div>

      {/* axis header */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 6, padding: "0 2px" }}>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.sub, textAlign: "center", opacity: 0.75 }}>Urgent</div>
        <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: t.sub, textAlign: "center", opacity: 0.75 }}>Not urgent</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 22 }}>
        {QUADRANTS.map((q) => {
          const items = eisenhower.filter((e) => e.quadrant === q.key);
          const accent = accents[q.key];
          const Icon = QUADRANT_META[q.key]?.icon;
          const focused = focusedKey === q.key;
          const hovered = hoveredKey === q.key;
          return (
            <div key={q.key} style={{
              background: t.surface, borderRadius: 16, padding: 13,
              border: `1px solid ${t.line}`, boxShadow: cardShadow,
              minWidth: 0, display: "flex", flexDirection: "column",
              position: "relative", overflow: "hidden",
            }}>
              <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent }} />
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 8, flexShrink: 0,
                  background: accent + "20", color: accent,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {Icon && <Icon size={13} strokeWidth={2.25} />}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: DISPLAY_FONT, fontSize: 14.5, fontWeight: 600, color: t.ink, lineHeight: 1.15 }}>{q.title}</div>
                  <div style={{ fontSize: 9.5, color: t.sub, marginTop: 1 }}>{q.sub}</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 5, margin: "10px 0 8px" }}>
                <input
                  value={inputs[q.key]}
                  onChange={(e) => setInputs((p) => ({ ...p, [q.key]: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && addItem(q.key)}
                  onFocus={() => setFocusedKey(q.key)}
                  onBlur={() => setFocusedKey(null)}
                  placeholder="Add task"
                  style={{
                    flex: 1, minWidth: 0, background: t.bg,
                    border: `1.5px solid ${focused ? accent : t.line}`,
                    borderRadius: 9, padding: "6px 9px", color: t.ink, fontSize: 11.5,
                    outline: "none", transition: "border-color 0.15s",
                  }}
                />
                <button
                  onClick={() => addItem(q.key)}
                  onMouseEnter={() => setHoveredKey(q.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  style={{
                    background: accent, border: "none", borderRadius: 9, width: 27, flexShrink: 0,
                    color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: hovered ? `0 3px 8px -2px ${accent}99` : "none",
                    transform: hovered ? "translateY(-1px)" : "none",
                    transition: "transform 0.15s, box-shadow 0.15s",
                  }}
                ><Plus size={13} /></button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 190, overflowY: "auto" }}>
                {items.length === 0 && <div style={{ fontSize: 10.5, color: t.sub, fontStyle: "italic", opacity: 0.8 }}>No tasks yet.</div>}
                {items.map((e) => (
                  <ExpandableTaskItem key={e.id} t={t} item={e} accentColor={accent} expanded={expandedIds.has(e.id)} onToggleExpand={toggleExpand} onToggleDone={toggleDone} onDelete={removeItem} onUpdate={updateItem} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: t.surface, borderRadius: 16, padding: 15, border: `1px solid ${t.line}`, boxShadow: cardShadow }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 11 }}>
          <div style={{ width: 24, height: 24, borderRadius: 8, background: t.clay + "20", color: t.clay, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Sparkles size={12} strokeWidth={2.25} />
          </div>
          <div style={{ fontFamily: DISPLAY_FONT, fontSize: 15.5, fontWeight: 600, color: t.ink }}>General tasks</div>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            value={inputs.none}
            onChange={(e) => setInputs((p) => ({ ...p, none: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && addItem("none")}
            onFocus={() => setFocusedKey("none")}
            onBlur={() => setFocusedKey(null)}
            placeholder="Add a task (sort it into a quadrant later)"
            style={{
              flex: 1, minWidth: 0, background: t.bg,
              border: `1.5px solid ${focusedKey === "none" ? t.clay : t.line}`,
              borderRadius: 9, padding: "8px 11px", color: t.ink, fontSize: 12.5,
              outline: "none", transition: "border-color 0.15s",
            }}
          />
          <button
            onClick={() => addItem("none")}
            onMouseEnter={() => setHoveredKey("none")}
            onMouseLeave={() => setHoveredKey(null)}
            style={{
              background: t.clay, border: "none", borderRadius: 9, width: 36, flexShrink: 0,
              color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: hoveredKey === "none" ? `0 3px 8px -2px ${t.clay}99` : "none",
              transform: hoveredKey === "none" ? "translateY(-1px)" : "none",
              transition: "transform 0.15s, box-shadow 0.15s",
            }}
          ><Plus size={15} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {others.length === 0 && <div style={{ fontSize: 11.5, color: t.sub, fontStyle: "italic", opacity: 0.8 }}>No general tasks yet.</div>}
          {others.map((e) => (
            <ExpandableTaskItem key={e.id} t={t} item={e} accentColor={t.clay} expanded={expandedIds.has(e.id)} onToggleExpand={toggleExpand} onToggleDone={toggleDone} onDelete={removeItem} onUpdate={updateItem} />
          ))}
        </div>
      </div>

      <ProcrastinateBreakBoard
        t={t}
        procrastinateTasks={procrastinateTasks}
        setProcrastinateTasks={setProcrastinateTasks}
        breakTasks={breakTasks}
        setBreakTasks={setBreakTasks}
      />
    </div>
  );
}
