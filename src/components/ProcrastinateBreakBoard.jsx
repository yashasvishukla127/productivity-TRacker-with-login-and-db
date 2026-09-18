import React, { useRef, useState } from "react";
import { Plus, X, GripVertical, Check, Coffee, Hourglass, ArrowRight, ArrowLeft } from "lucide-react";
import { uid } from "../utils/dates";

const SWIPE_THRESHOLD = 70;
const IS_TOUCH = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

function clientXY(e) {
  if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  return { x: e.clientX, y: e.clientY };
}

/* ── one task row: swipe left/right on the row body to change column, drag the grip to reorder ── */
function TaskRow({ t, col, task, dragState, rowRefs, startPointer, toggleDone, removeTask }) {
  const isDragged = dragState && dragState.id === task.id;
  const dx = isDragged && dragState.mode === "swipe" ? dragState.dx : 0;
  const dy = isDragged && dragState.mode === "reorder" ? dragState.dy : 0;
  const swipeProgress = Math.min(1, Math.abs(dx) / SWIPE_THRESHOLD);
  const accent = col === "left" ? t.clay : t.moss;

  return (
    <div
      ref={(el) => (rowRefs.current[task.id] = el)}
      onMouseDown={!IS_TOUCH ? (e) => startPointer(e, col, task.id, "swipe") : undefined}
      onTouchStart={IS_TOUCH ? (e) => startPointer(e, col, task.id, "swipe") : undefined}
      style={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 6,
        background: t.bg,
        border: `1px solid ${t.line}`,
        borderRadius: 9,
        padding: "7px 8px",
        transform: `translate(${dx}px, ${dy}px)`,
        zIndex: isDragged ? 5 : 1,
        boxShadow: isDragged ? "0 6px 16px -6px rgba(0,0,0,0.35)" : "none",
        opacity: isDragged && dragState.mode === "swipe" ? 1 - swipeProgress * 0.25 : 1,
        transition: isDragged ? "none" : "transform 0.15s",
        touchAction: "none",
        cursor: "grab",
      }}
    >
      {/* drag handle — reorder within this column */}
      <div
        onMouseDown={(e) => startPointer(e, col, task.id, "reorder")}
        onTouchStart={(e) => startPointer(e, col, task.id, "reorder")}
        style={{ cursor: "ns-resize", color: t.sub, opacity: 0.55, display: "flex", flexShrink: 0, touchAction: "none" }}
      >
        <GripVertical size={13} />
      </div>

      <button
        onClick={() => toggleDone(col, task.id)}
        style={{
          width: 15, height: 15, borderRadius: 4, flexShrink: 0, cursor: "pointer",
          border: `1.5px solid ${task.done ? accent : t.sub}`,
          background: task.done ? accent : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {task.done && <Check size={9} color="#fff" />}
      </button>

      <span
        style={{
          flex: 1, minWidth: 0, fontSize: 12,
          color: task.done ? t.sub : t.ink,
          textDecoration: task.done ? "line-through" : "none",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}
      >
        {task.text}
      </span>

      {/* directional hint, fades in as the swipe approaches the threshold */}
      {swipeProgress > 0.15 && (
        col === "left"
          ? <ArrowRight size={13} color={t.moss} style={{ opacity: swipeProgress, flexShrink: 0 }} />
          : <ArrowLeft size={13} color={t.clay} style={{ opacity: swipeProgress, flexShrink: 0 }} />
      )}

      <X
        size={12}
        color={t.sub}
        style={{ cursor: "pointer", opacity: 0.6, flexShrink: 0 }}
        onClick={() => removeTask(col, task.id)}
      />
    </div>
  );
}

/* ── one column (Procrastinate or Break) ── */
function TaskColumn({ t, col, title, icon: Icon, tasks, inputValue, setInputValue, placeholder, emptyText, dragState, rowRefs, startPointer, addTask, toggleDone, removeTask }) {
  const accent = col === "left" ? t.clay : t.moss;
  return (
    <div style={{ flex: 1, minWidth: 0, background: t.surface, borderRadius: 16, padding: 12, border: `1px solid ${t.line}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <div style={{ width: 22, height: 22, borderRadius: 7, background: accent + "20", color: accent, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={12} strokeWidth={2.25} />
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: t.ink }}>{title}</div>
        <div style={{ marginLeft: "auto", fontSize: 10, color: t.sub }}>{tasks.length}</div>
      </div>

      <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addTask(col)}
          placeholder={placeholder}
          style={{ flex: 1, minWidth: 0, background: t.bg, border: `1.5px solid ${t.line}`, borderRadius: 9, padding: "6px 9px", color: t.ink, fontSize: 11.5, outline: "none" }}
        />
        <button
          onClick={() => addTask(col)}
          style={{ background: accent, border: "none", borderRadius: 9, width: 27, flexShrink: 0, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Plus size={13} />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 5, minHeight: 30 }}>
        {tasks.length === 0 && (
          <div style={{ fontSize: 10.5, color: t.sub, fontStyle: "italic", opacity: 0.8 }}>{emptyText}</div>
        )}
        {tasks.map((task) => (
          <TaskRow key={task.id} t={t} col={col} task={task} dragState={dragState} rowRefs={rowRefs} startPointer={startPointer} toggleDone={toggleDone} removeTask={removeTask} />
        ))}
      </div>
    </div>
  );
}

/* ── board: side-by-side Procrastinate / Break columns ── */
export default function ProcrastinateBreakBoard({ t, procrastinateTasks, setProcrastinateTasks, breakTasks, setBreakTasks }) {
  const [leftInput, setLeftInput] = useState("");
  const [rightInput, setRightInput] = useState("");
  const [dragState, setDragState] = useState(null); // {id, col, mode, dx, dy}

  const rowRefs = useRef({});
  const dragRef = useRef(null);
  const cleanupRef = useRef(null);

  function addTask(col) {
    if (col === "left") {
      const text = leftInput.trim();
      if (!text) return;
      setProcrastinateTasks((p) => [...p, { id: uid(), text, done: false }]);
      setLeftInput("");
    } else {
      const text = rightInput.trim();
      if (!text) return;
      setBreakTasks((p) => [...p, { id: uid(), text, done: false }]);
      setRightInput("");
    }
  }

  function toggleDone(col, id) {
    const setter = col === "left" ? setProcrastinateTasks : setBreakTasks;
    setter((p) => p.map((tk) => (tk.id === id ? { ...tk, done: !tk.done } : tk)));
  }

  function removeTask(col, id) {
    const setter = col === "left" ? setProcrastinateTasks : setBreakTasks;
    setter((p) => p.filter((tk) => tk.id !== id));
  }

  // swipe a task across into the other column, keeping its id/text/done —
  // moving it into breakTasks (or out of it) is exactly what the Timer's
  // break-time list reads from, so this is the sync point.
  function moveAcross(col, id) {
    const fromList = col === "left" ? procrastinateTasks : breakTasks;
    const task = fromList.find((tk) => tk.id === id);
    if (!task) return;
    if (col === "left") {
      setProcrastinateTasks((p) => p.filter((tk) => tk.id !== id));
      setBreakTasks((p) => [...p, task]);
    } else {
      setBreakTasks((p) => p.filter((tk) => tk.id !== id));
      setProcrastinateTasks((p) => [...p, task]);
    }
  }

  function reorder(col, fromIdx, toIdx) {
    const setter = col === "left" ? setProcrastinateTasks : setBreakTasks;
    setter((p) => {
      if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= p.length || toIdx >= p.length) return p;
      const next = p.slice();
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  }

  function startPointer(e, col, id, mode) {
    e.preventDefault();
    e.stopPropagation();
    const { x, y } = clientXY(e);
    const list = col === "left" ? procrastinateTasks : breakTasks;
    const startIndex = list.findIndex((tk) => tk.id === id);
    const el = rowRefs.current[id];
    if (!el || !el.parentElement) return;

    // snapshot sibling row positions once, used to hit-test reorder position while dragging
    const siblingRects = Array.from(el.parentElement.children).map((c) => c.getBoundingClientRect());

    const state = { col, id, mode, startX: x, startY: y, dx: 0, dy: 0, startIndex, currentIndex: startIndex, siblingRects };
    dragRef.current = state;
    setDragState({ id, col, mode, dx: 0, dy: 0 });

    function handleMove(evt) {
      const d = dragRef.current;
      if (!d) return;
      const { x: cx, y: cy } = clientXY(evt);
      let dx = cx - d.startX;
      let dy = cy - d.startY;

      if (d.mode === "swipe") {
        // only allow the "forward" direction for each column
        dx = d.col === "left" ? Math.max(0, dx) : Math.min(0, dx);
        d.dx = dx;
        if (Math.abs(dx) > 4 && evt.cancelable) evt.preventDefault();
      } else {
        d.dy = dy;
        let newIndex = d.startIndex;
        for (let i = 0; i < d.siblingRects.length; i++) {
          const r = d.siblingRects[i];
          const mid = r.top + r.height / 2;
          if (cy < mid) { newIndex = i; break; }
          newIndex = i + 1;
        }
        d.currentIndex = Math.max(0, Math.min(d.siblingRects.length - 1, newIndex));
        if (evt.cancelable) evt.preventDefault();
      }

      setDragState({ id: d.id, col: d.col, mode: d.mode, dx: d.dx, dy: d.dy });
    }

    function handleEnd() {
      const d = dragRef.current;
      if (d) {
        if (d.mode === "swipe") {
          if (Math.abs(d.dx) >= SWIPE_THRESHOLD) moveAcross(d.col, d.id);
        } else if (d.mode === "reorder" && d.currentIndex !== d.startIndex) {
          reorder(d.col, d.startIndex, d.currentIndex);
        }
      }
      dragRef.current = null;
      setDragState(null);
      cleanup();
    }

    function cleanup() {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
      cleanupRef.current = null;
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    cleanupRef.current = cleanup;
  }

  return (
    <div style={{ marginTop: 22 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <Hourglass size={12} color={t.clay} />
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: t.sub }}>Procrastinate &amp; Break</div>
      </div>
      <div style={{ fontSize: 12, color: t.sub, marginBottom: 12, lineHeight: 1.5, maxWidth: 480 }}>
        Drag the grip to reorder a column. Swipe a task right to send it on break — it syncs straight into the Timer's break list. Swipe a break task left to bring it back.
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <TaskColumn
          t={t} col="left" title="Procrastinate" icon={Coffee}
          tasks={procrastinateTasks} inputValue={leftInput} setInputValue={setLeftInput}
          placeholder="Add something you're avoiding…"
          emptyText="Nothing here — swipe a task right to send it on break."
          dragState={dragState} rowRefs={rowRefs} startPointer={startPointer}
          addTask={addTask} toggleDone={toggleDone} removeTask={removeTask}
        />
        <TaskColumn
          t={t} col="right" title="Break" icon={Hourglass}
          tasks={breakTasks} inputValue={rightInput} setInputValue={setRightInput}
          placeholder="Add a break idea…"
          emptyText="Nothing on break yet — swipe one left to bring it back."
          dragState={dragState} rowRefs={rowRefs} startPointer={startPointer}
          addTask={addTask} toggleDone={toggleDone} removeTask={removeTask}
        />
      </div>
    </div>
  );
}
