import React, { useRef, useState } from "react";
import { Play, Pause, RotateCcw, Plus, Check, X, Square, Flame, GripVertical } from "lucide-react";
import { MODES } from "../theme";
import { fmt } from "../utils/dates";

function arrayMove(list, fromIndex, toIndex) {
  const copy = list.slice();
  const [moved] = copy.splice(fromIndex, 1);
  copy.splice(toIndex, 0, moved);
  return copy;
}

export default function TimerScreen({
  t,
  modeKey,
  customDurations,
  switchMode,
  phase,
  running,
  secondsLeft,
  stopwatchSecs,
  startPause,
  reset,
  stopSession,
  R,
  CIRC,
  progress,
  tasks,
  newTask,
  setNewTask,
  addTask,
  toggleTask,
  removeTask,
  reorderTasks,
  breakTasks,
  newBreakTask,
  setNewBreakTask,
  addBreakTask,
  toggleBreakTask,
  removeBreakTask,
  activeTaskId,
  setActiveTaskId,
  setTaskTarget,
  todayFocusedMinutes,
  inProgressMinutes = 0,
  todayMinutesByTaskId = {}
}) {
  const displaySeconds = modeKey === "stopwatch" ? stopwatchSecs : secondsLeft;
  const activeTask = tasks.find((tk) => tk.id === activeTaskId);

  // --- Drag-to-reorder state (pointer-based so it works with touch on Android/Capacitor) ---
  const rowRefs = useRef({}); // taskId -> DOM node
  const [dragState, setDragState] = useState(null); // { id, index, startY, deltaY }

  function handleGripPointerDown(e, tk, index) {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragState({ id: tk.id, index, startY: e.clientY, deltaY: 0, pointerId: e.pointerId });
  }

  function handleGripPointerMove(e) {
    if (!dragState || dragState.pointerId !== e.pointerId) return;
    const deltaY = e.clientY - dragState.startY;
    const rowEl = rowRefs.current[dragState.id];
    const rowHeight = (rowEl && rowEl.offsetHeight ? rowEl.offsetHeight : 40) + 6; // include gap

    const shift = Math.round(deltaY / rowHeight);
    if (shift !== 0) {
      const newIndex = Math.min(
        Math.max(dragState.index + shift, 0),
        tasks.length - 1
      );
      if (newIndex !== dragState.index && typeof reorderTasks === "function") {
        const reordered = arrayMove(tasks, dragState.index, newIndex);
        reorderTasks(reordered);
        setDragState({
          id: dragState.id,
          index: newIndex,
          startY: dragState.startY + shift * rowHeight,
          deltaY: deltaY - shift * rowHeight,
          pointerId: dragState.pointerId
        });
        return;
      }
    }
    setDragState({ ...dragState, deltaY });
  }

  function handleGripPointerUp(e) {
    if (!dragState || dragState.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}
    setDragState(null);
  }

  return (
    <div>
      {/* Mode selection header */}
      <div style={{ display: "flex", gap: 6, marginBottom: 22 }}>
        {Object.entries(MODES).map(([key, m]) => (
          <button
            key={key}
            onClick={() => switchMode(key)}
            style={{
              flex: 1,
              padding: "8px 6px",
              borderRadius: 999,
              border: `1px solid ${modeKey === key ? t.moss : t.line}`,
              background: modeKey === key ? t.moss : "transparent",
              color: modeKey === key ? t.bg : t.sub,
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all .2s"
            }}
          >
            {key === "stopwatch"
              ? m.label
              : `${customDurations[key].work} / ${customDurations[key].rest}`}
          </button>
        ))}
      </div>

      {/* Radial Timer Visualization */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: phase === "rest" ? 8 : 20,
          transition: "margin .4s ease"
        }}
      >
        <div
          style={{
            position: "relative",
            width: phase === "rest" ? 120 : 260,
            height: phase === "rest" ? 120 : 260,
            maxWidth: "100%",
            transition: "width .4s ease, height .4s ease"
          }}
        >
          <svg
            width={260}
            height={260}
            viewBox="0 0 260 260"
            style={{ transform: "rotate(-90deg)", width: "100%", height: "auto" }}
          >
            <circle
              cx={130}
              cy={130}
              r={R}
              fill="none"
              stroke={t.line}
              strokeWidth={10}
            />

            {modeKey !== "stopwatch" && (
              <circle
                cx={130}
                cy={130}
                r={R}
                fill="none"
                stroke={activeTask?.color || (phase === "work" ? t.moss : t.clay)}
                strokeWidth={10}
                strokeDasharray={CIRC}
                strokeDashoffset={CIRC * (1 - progress)}
                strokeLinecap="round"
                style={{
                  transition: "stroke-dashoffset 1s linear"
                }}
              />
            )}

            {modeKey === "stopwatch" && running && (
              <circle
                cx={130}
                cy={130}
                r={R}
                fill="none"
                stroke={t.moss}
                strokeWidth={10}
                strokeDasharray={`${CIRC * 0.16} ${CIRC * 0.84}`}
                strokeLinecap="round"
              />
            )}
          </svg>

          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <span
              style={{
                fontSize: 46,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "-0.02em",
                fontFamily: "Georgia,serif"
              }}
            >
              {fmt(displaySeconds)}
            </span>

            <span
              style={{
                fontSize: 12,
                color: t.sub,
                fontFamily: "system-ui",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                marginTop: 4
              }}
            >
              {modeKey === "stopwatch"
                ? "elapsed"
                : phase === "work"
                ? "focus"
                : "break"}
            </span>

            {activeTask && (
              <span
                style={{
                  fontSize: 11.5,
                  color: t.moss,
                  fontFamily: "system-ui",
                  marginTop: 8,
                  maxWidth: 160,
                  textAlign: "center",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
              >
                {activeTask.text}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Timer Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 14,
          marginBottom: 26
        }}
      >
        <button
          onClick={reset}
          style={{
            width: 46,
            height: 46,
            borderRadius: "50%",
            border: `1px solid ${t.line}`,
            background: "transparent",
            color: t.sub,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer"
          }}
        >
          <RotateCcw size={17} />
        </button>

        <button
          onClick={startPause}
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            border: "none",
            background: t.ink,
            color: t.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 6px 18px rgba(0,0,0,0.15)"
          }}
        >
          {running ? (
            <Pause size={22} fill={t.bg} />
          ) : (
            <Play
              size={22}
              fill={t.bg}
              style={{ marginLeft: 2 }}
            />
          )}
        </button>

        <button
          onClick={stopSession}
          disabled={
            modeKey !== "stopwatch" && phase !== "work"
          }
          style={{
            width: 46,
            height: 46,
            borderRadius: "50%",
            border: `1px solid ${t.line}`,
            background: "transparent",
            color: t.sub,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor:
              modeKey !== "stopwatch" && phase !== "work"
                ? "default"
                : "pointer",
            opacity:
              modeKey !== "stopwatch" && phase !== "work"
                ? 0.4
                : 1
          }}
        >
          <Square size={15} />
        </button>
      </div>

      {/* Focus Works & Task List */}
      {phase === "work" && (
        <>
          <div
            style={{
              borderTop: `1px solid ${t.line}`,
              paddingTop: 16,
              textAlign: "center"
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                marginBottom: 12
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: t.sub,
                  textTransform: "uppercase",
                  letterSpacing: "0.15em",
                  fontFamily:
                    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
                  fontWeight: 600
                }}
              >
                WORKING TASKs
              </span>
            </div>

            {/* Big eye-catching "focused today" stat */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                padding: "16px 20px",
                borderRadius: 18,
                marginBottom: 16,
                background: `linear-gradient(135deg, ${t.moss}26, ${t.clay}26)`,
                border: `1px solid ${t.moss}40`,
                boxShadow: `0 4px 20px ${t.moss}22`
              }}
            >
              <Flame size={26} color={t.clay} fill={t.clay + "33"} />
              <span
                style={{
                  fontSize: 40,
                  fontWeight: 800,
                  fontFamily: "Georgia,serif",
                  letterSpacing: "-0.03em",
                  lineHeight: 1,
                  backgroundImage: `linear-gradient(135deg, ${t.moss}, ${t.clay})`,
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  color: t.moss
                }}
              >
                {Math.floor(todayFocusedMinutes / 60)}
                <span style={{ fontSize: 20 }}>h</span>{" "}
                {Math.round(todayFocusedMinutes % 60)}
                <span style={{ fontSize: 20 }}>m</span>
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  color: t.sub,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  fontFamily: "system-ui",
                  lineHeight: 1.3,
                  textAlign: "left"
                }}
              >
                focused
                <br />
                today
              </span>
            </div>

            {/* New Task Input */}
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 12
              }}
            >
              <input
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && addTask()
                }
                placeholder="Add a task"
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: "transparent",
                  border: `1px solid ${t.line}`,
                  borderRadius: 10,
                  padding: "8px 12px",
                  color: t.ink,
                  fontSize: 13.5,
                  outline: "none",
                  fontFamily: "system-ui"
                }}
              />

              <button
                onClick={addTask}
                style={{
                  width: 36,
                  flexShrink: 0,
                  borderRadius: 10,
                  border: `1px solid ${t.line}`,
                  background: "transparent",
                  color: t.sub,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Task Rows */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 6,
                maxHeight: 160,
                overflowY: "auto"
              }}
            >
              {tasks.length === 0 && (
                <div
                  style={{
                    fontSize: 12.5,
                    color: t.sub,
                    fontStyle: "italic"
                  }}
                >
                  No tasks yet — add one to attach to your session.
                </div>
              )}

              {tasks.map((tk, index) => {
                const taskColor = tk.color || t.moss;
                const liveExtra =
                  tk.id === activeTaskId ? inProgressMinutes : 0;
                const minutesSoFar =
                  (todayMinutesByTaskId[tk.id] || 0) + liveExtra;
                const taskProgress = tk.targetHours
                  ? Math.min(
                      100,
                      (minutesSoFar / (tk.targetHours * 60)) * 100
                    )
                  : 0;

                const spentHrs = Math.floor(minutesSoFar / 60);
                const spentMins = Math.round(minutesSoFar % 60);
                const timeLabel = tk.targetHours
                  ? `${
                      spentHrs > 0 ? `${spentHrs}h ` : ""
                    }${spentMins}m / ${tk.targetHours}h`
                  : null;

                const isDragging = dragState && dragState.id === tk.id;

                return (
                  <div
                    key={tk.id}
                    ref={(el) => {
                      rowRefs.current[tk.id] = el;
                    }}
                    onClick={() =>
                      setActiveTaskId(
                        tk.id === activeTaskId ? null : tk.id
                      )
                    }
                    style={{
                      position: "relative",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "7px 10px",
                      borderRadius: 8,
                      background:
                        activeTaskId === tk.id
                          ? t.moss + "15"
                          : "transparent",
                      border: `1px solid ${
                        activeTaskId === tk.id
                          ? t.moss + "44"
                          : "transparent"
                      }`,
                      cursor: "pointer",
                      transform: isDragging
                        ? `translateY(${dragState.deltaY}px) scale(1.02)`
                        : "none",
                      transition: isDragging
                        ? "none"
                        : "transform .15s ease",
                      zIndex: isDragging ? 5 : 1,
                      boxShadow: isDragging
                        ? "0 8px 20px rgba(0,0,0,0.18)"
                        : "none"
                    }}
                  >
                    {/* Drag Handle */}
                    <span
                      onPointerDown={(e) =>
                        handleGripPointerDown(e, tk, index)
                      }
                      onPointerMove={handleGripPointerMove}
                      onPointerUp={handleGripPointerUp}
                      onPointerCancel={handleGripPointerUp}
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: "relative",
                        zIndex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        color: t.sub,
                        opacity: 0.5,
                        cursor: "grab",
                        touchAction: "none"
                      }}
                    >
                      <GripVertical size={14} />
                    </span>
                    {/* Embedded Progress Fill Layer */}
                    {tk.targetHours > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: `${taskProgress}%`,
                          background: `linear-gradient(90deg, ${taskColor}33, ${taskColor}88)`,
                          transition: "width 1s linear",
                          zIndex: 0
                        }}
                      />
                    )}

                    {/* Interactive Row Content (Sits above progress fill) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTask(tk.id);
                      }}
                      style={{
                        position: "relative",
                        zIndex: 1,
                        width: 17,
                        height: 17,
                        borderRadius: 5,
                        border: `1.5px solid ${
                          tk.done ? t.moss : t.sub
                        }`,
                        background: tk.done
                          ? t.moss
                          : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        cursor: "pointer"
                      }}
                    >
                      {tk.done && (
                        <Check size={11} color={t.bg} />
                      )}
                    </button>

                    <span
                      style={{
                        position: "relative",
                        zIndex: 1,
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: taskColor,
                        flexShrink: 0
                      }}
                    />

                    <div
                      style={{
                        position: "relative",
                        zIndex: 1,
                        flex: 1,
                        display: "flex",
                        alignItems: "baseline",
                        gap: 6,
                        minWidth: 0
                      }}
                    >
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          textDecoration: tk.done
                            ? "line-through"
                            : "none",
                          color: tk.done ? t.sub : t.ink,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {tk.text}
                      </span>

                      {timeLabel && (
                        <span
                          style={{
                            fontSize: 10.5,
                            color: t.sub,
                            opacity: 0.6,
                            fontFamily: "system-ui",
                            flexShrink: 0
                          }}
                        >
                          {timeLabel}
                        </span>
                      )}
                    </div>

                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={tk.targetHours ?? ""}
                      onChange={(e) => {
                        e.stopPropagation();
                        const value = e.target.value;
                        setTaskTarget(
                          tk.id,
                          value === "" ? null : Number(value)
                        );
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                      placeholder="h"
                      aria-label={`Target hours for ${tk.text}`}
                      style={{
                        position: "relative",
                        zIndex: 1,
                        width: 38,
                        padding: "3px 4px",
                        borderRadius: 6,
                        border: `1px solid ${t.line}`,
                        background: "transparent",
                        color: t.ink,
                        fontSize: 11,
                        textAlign: "center",
                        outline: "none",
                        fontFamily: "system-ui",
                        flexShrink: 0
                      }}
                    />

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTask(tk.id);
                      }}
                      style={{
                        position: "relative",
                        zIndex: 1,
                        background: "none",
                        border: "none",
                        color: t.sub,
                        cursor: "pointer",
                        opacity: 0.6,
                        display: "flex",
                        alignItems: "center"
                      }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Break Task List Block */}
      {phase === "rest" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              value={newBreakTask}
              onChange={(e) => setNewBreakTask(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addBreakTask()}
              placeholder="Something to do on break..."
              style={{
                flex: 1,
                background: "transparent",
                border: `1px solid ${t.line}`,
                borderRadius: 8,
                padding: "8px 10px",
                color: t.ink,
                fontSize: 13.5,
                outline: "none"
              }}
            />
            <button
              onClick={addBreakTask}
              style={{
                border: `1px solid ${t.line}`,
                borderRadius: 8,
                padding: "0 12px",
                background: "transparent",
                cursor: "pointer"
              }}
            >
              <Plus size={16} color={t.ink} />
            </button>
          </div>
          {breakTasks.map((tk) => (
            <div
              key={tk.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 0",
                borderBottom: `1px solid ${t.line}`
              }}
            >
              <div
                onClick={() => toggleBreakTask(tk.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                  flex: 1
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: `1.5px solid ${t.line}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: tk.done ? t.moss : "transparent"
                  }}
                >
                  {tk.done && <Check size={11} color={t.bg} />}
                </span>
                <span
                  style={{
                    fontSize: 13.5,
                    color: t.ink,
                    textDecoration: tk.done ? "line-through" : "none",
                    opacity: tk.done ? 0.5 : 1
                  }}
                >
                  {tk.text}
                </span>
              </div>
              <X
                size={14}
                color={t.sub}
                style={{ cursor: "pointer" }}
                onClick={() => removeBreakTask(tk.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
