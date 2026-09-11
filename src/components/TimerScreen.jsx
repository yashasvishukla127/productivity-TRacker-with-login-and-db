import React from "react";
import { Play, Pause, RotateCcw, Plus, Check, X } from "lucide-react";
import { MODES } from "../theme";
import { fmt } from "../utils/dates";

export default function TimerScreen({ t, modeKey, switchMode, phase, running, secondsLeft, stopwatchSecs, startPause, reset, R, CIRC, progress, tasks, newTask, setNewTask, addTask, toggleTask, removeTask, activeTaskId, setActiveTaskId }) {
  const displaySeconds = modeKey === "stopwatch" ? stopwatchSecs : secondsLeft;
  const activeTask = tasks.find((tk) => tk.id === activeTaskId);
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
        {Object.entries(MODES).map(([key, m]) => (
          <button key={key} onClick={() => switchMode(key)} style={{ flex: 1, padding: "8px 6px", borderRadius: 999, border: `1px solid ${modeKey === key ? t.moss : t.line}`, background: modeKey === key ? t.moss : "transparent", color: modeKey === key ? t.bg : t.sub, fontSize: 12.5, fontWeight: 600, cursor: "pointer", transition: "all .2s" }}>{m.label}</button>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
        <div style={{ position: "relative", width: 260, height: 260, maxWidth: "100%" }}>
          <svg width={260} height={260} viewBox="0 0 260 260" style={{ transform: "rotate(-90deg)", width: "100%", height: "auto" }}>
            <circle cx={130} cy={130} r={R} fill="none" stroke={t.line} strokeWidth={10} />
            {modeKey !== "stopwatch" && <circle cx={130} cy={130} r={R} fill="none" stroke={phase === "work" ? t.moss : t.clay} strokeWidth={10} strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - progress)} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />}
            {modeKey === "stopwatch" && running && <circle cx={130} cy={130} r={R} fill="none" stroke={t.moss} strokeWidth={10} strokeDasharray={`${CIRC * 0.16} ${CIRC * 0.84}`} strokeLinecap="round" />}
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 46, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", fontFamily: "Georgia,serif" }}>{fmt(displaySeconds)}</span>
            <span style={{ fontSize: 12, color: t.sub, fontFamily: "system-ui", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>{modeKey === "stopwatch" ? "elapsed" : phase === "work" ? "focus" : "break"}</span>
            {activeTask && <span style={{ fontSize: 11.5, color: t.moss, fontFamily: "system-ui", marginTop: 8, maxWidth: 160, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeTask.text}</span>}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 14, marginBottom: 26 }}>
        <button onClick={reset} style={{ width: 46, height: 46, borderRadius: "50%", border: `1px solid ${t.line}`, background: "transparent", color: t.sub, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><RotateCcw size={17} /></button>
        <button onClick={startPause} style={{ width: 64, height: 64, borderRadius: "50%", border: "none", background: t.ink, color: t.bg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 6px 18px rgba(0,0,0,0.15)" }}>{running ? <Pause size={22} fill={t.bg} /> : <Play size={22} fill={t.bg} style={{ marginLeft: 2 }} />}</button>
        <div style={{ width: 46 }} />
      </div>
      <div style={{ borderTop: `1px solid ${t.line}`, paddingTop: 16 }}>
        <div style={{ fontSize: 11, color: t.sub, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Focus on</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input value={newTask} onChange={(e) => setNewTask(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTask()} placeholder="Add a task" style={{ flex: 1, minWidth: 0, background: "transparent", border: `1px solid ${t.line}`, borderRadius: 10, padding: "8px 12px", color: t.ink, fontSize: 13.5, outline: "none", fontFamily: "system-ui" }} />
          <button onClick={addTask} style={{ width: 36, flexShrink: 0, borderRadius: 10, border: `1px solid ${t.line}`, background: "transparent", color: t.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Plus size={16} /></button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
          {tasks.length === 0 && <div style={{ fontSize: 12.5, color: t.sub, fontStyle: "italic" }}>No tasks yet — add one to attach to your session.</div>}
          {tasks.map((tk) => (
            <div key={tk.id} onClick={() => setActiveTaskId(tk.id === activeTaskId ? null : tk.id)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8, background: activeTaskId === tk.id ? (t.moss + "22") : "transparent", cursor: "pointer" }}>
              <button onClick={(e) => { e.stopPropagation(); toggleTask(tk.id); }} style={{ width: 17, height: 17, borderRadius: 5, border: `1.5px solid ${tk.done ? t.moss : t.sub}`, background: tk.done ? t.moss : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>{tk.done && <Check size={11} color={t.bg} />}</button>
              <span style={{ fontSize: 13, flex: 1, textDecoration: tk.done ? "line-through" : "none", color: tk.done ? t.sub : t.ink }}>{tk.text}</span>
              <button onClick={(e) => { e.stopPropagation(); removeTask(tk.id); }} style={{ background: "none", border: "none", color: t.sub, cursor: "pointer", opacity: 0.6, display: "flex" }}><X size={13} /></button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
