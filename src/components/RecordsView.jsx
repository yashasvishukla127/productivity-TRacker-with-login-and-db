import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { ZoomIn, ZoomOut, RotateCcw, Check, Trash2, Plus, X } from "lucide-react";
import { todayKey, addDays, timeToMin, minToTime, mapMinuteToPercent, uid } from "../utils/dates";
import { SLEEP_COLOR } from "../theme";

const ACTIVE_WIDTH_PCT = 88; // waking hours get 88% of the bar, sleep gets the rest
const MIN_ZOOM = 1;
const MAX_ZOOM = 6;
const ZOOM_STEP = 1.4;

function clampZoom(z) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}

function touchDist(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export default function RecordsView({ t, sessions, setSessions, sleepSettings, tasks = [] }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [daysToShow, setDaysToShow] = useState(14);
  const days = Array.from({ length: daysToShow }, (_, i) => addDays(today, -i));
  const [selected, setSelected] = useState(null);
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [adding, setAdding] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [newNote, setNewNote] = useState("");
  const [zoom, setZoom] = useState(1);
  const [hover, setHover] = useState(null); // { x, y, dateLabel, timeLabel, activityLabel }
  const scrollRef = useRef(null);
  const pinchRef = useRef(null); // { startDist, startZoom }

  const colorByTaskId = Object.fromEntries(tasks.map((tk) => [tk.id, tk.color]));
  const nameByTaskId = Object.fromEntries(tasks.map((tk) => [tk.id, tk.text]));

  function activityLabel(s) {
    if (s.note && s.note.trim()) return s.note.trim();
    if (s.taskId && nameByTaskId[s.taskId]) return nameByTaskId[s.taskId];
    return s.manual ? "Manual entry" : "Focus session";
  }

  // Whenever a *different* block is selected, load its current start/end into the editable fields.
  useEffect(() => {
    if (selected && !selected.isSleep) {
      setEditStart(minToTime(selected.startMinutes));
      setEditEnd(minToTime(selected.startMinutes + selected.minutes));
    }
  }, [selected?.id]);

  const editedStartMin = editStart ? timeToMin(editStart) : null;
  const editedEndMin = editEnd ? timeToMin(editEnd) : null;
  const editedMinutes = useMemo(() => {
    if (editedStartMin == null || editedEndMin == null) return null;
    let diff = editedEndMin - editedStartMin;
    if (diff <= 0) diff += 1440; // crosses midnight
    return diff;
  }, [editedStartMin, editedEndMin]);
  const editDirty =
    !!selected &&
    !selected.isSleep &&
    (editedStartMin !== selected.startMinutes || editedMinutes !== selected.minutes);

  function saveEdit() {
    if (!selected || selected.isSleep || editedStartMin == null || editedMinutes == null || !setSessions) return;
    const id = selected.id;
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, startMinutes: editedStartMin, minutes: editedMinutes } : s)));
    setSelected((sel) => (sel && sel.id === id ? { ...sel, startMinutes: editedStartMin, minutes: editedMinutes } : sel));
  }

  function deleteSelected() {
    if (!selected || selected.isSleep || !setSessions) return;
    if (typeof window !== "undefined" && !window.confirm("Delete this entry? This can't be undone.")) return;
    const id = selected.id;
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setSelected(null);
  }

  // Reverse of mapMinuteToPercent: given an x-position on the bar (0-100%), return the clock minute it represents.
  function pctToMin(clickPct) {
    const clamped = Math.min(100, Math.max(0, clickPct));
    const activeDur = sleepOn ? ((sleepMin - wakeMin + 1440) % 1440) || 1440 : 1440;
    const sleepDur = 1440 - activeDur;
    let sinceWake;
    if (sleepDur === 0 || clamped <= ACTIVE_WIDTH_PCT) {
      sinceWake = (clamped / (sleepDur === 0 ? 100 : ACTIVE_WIDTH_PCT)) * activeDur;
    } else {
      const sinceSleepStart = ((clamped - ACTIVE_WIDTH_PCT) / (100 - ACTIVE_WIDTH_PCT)) * sleepDur;
      sinceWake = activeDur + sinceSleepStart;
    }
    return (((wakeMin + sinceWake) % 1440) + 1440) % 1440;
  }

  function startAddAt(dayKey, startMin) {
    setSelected(null);
    const rounded = Math.round(startMin / 5) * 5;
    setNewDate(dayKey);
    setNewStart(minToTime(rounded));
    setNewEnd(minToTime(rounded + 30));
    setNewNote("");
    setAdding(true);
  }

  const newStartMin = newStart ? timeToMin(newStart) : null;
  const newEndMin = newEnd ? timeToMin(newEnd) : null;
  const newMinutes = useMemo(() => {
    if (newStartMin == null || newEndMin == null) return null;
    let diff = newEndMin - newStartMin;
    if (diff <= 0) diff += 1440;
    return diff;
  }, [newStartMin, newEndMin]);

  function saveNewEntry() {
    if (!setSessions || newStartMin == null || newMinutes == null || !newDate) return;
    const newSession = { id: uid(), date: newDate, startMinutes: newStartMin, minutes: newMinutes, mode: "manual", manual: true, note: newNote.trim() };
    setSessions((prev) => [...prev, newSession]);
    setAdding(false);
    setSelected(newSession);
  }
  function cancelAdd() {
    setAdding(false);
  }

  const sleepOn = !!sleepSettings?.enabled;
  const wakeMin = sleepOn ? timeToMin(sleepSettings.end) : 0;
  const sleepMin = sleepOn ? timeToMin(sleepSettings.start) : 0;
  const pct = (min) => mapMinuteToPercent(min, wakeMin, sleepMin, ACTIVE_WIDTH_PCT);
  const activeEndPct = sleepOn ? pct(sleepMin) : 100;

  const MAJOR_STEP_MIN = 180; // labels shown bold every 3h
  const HOUR_STEP_MIN = 60; // grid line + small label every 1h

  const hourMarks = useMemo(() => {
    const activeDur = sleepOn ? ((sleepMin - wakeMin + 1440) % 1440) || 1440 : 1440;
    const marks = [];
    for (let m = 0; m <= activeDur; m += HOUR_STEP_MIN) {
      marks.push({ min: wakeMin + m, pct: pct(wakeMin + m), major: m % MAJOR_STEP_MIN === 0 });
    }
    return marks;
  }, [wakeMin, sleepMin, sleepOn]);

  function zoomBy(factor) {
    setZoom((z) => clampZoom(z * factor));
  }
  function resetZoom() {
    setZoom(1);
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }

  function handleTouchStart(e) {
    if (e.touches.length === 2) {
      pinchRef.current = { startDist: touchDist(e.touches), startZoom: zoom };
    }
  }
  function handleTouchMove(e) {
    if (e.touches.length === 2 && pinchRef.current) {
      try { e.preventDefault(); } catch (err) {}
      const d = touchDist(e.touches);
      const ratio = d / (pinchRef.current.startDist || d);
      setZoom(clampZoom(pinchRef.current.startZoom * ratio));
    }
  }
  function handleTouchEnd(e) {
    if (e.touches.length < 2) pinchRef.current = null;
  }
  function handleWheel(e) {
    if (e.ctrlKey || e.metaKey) {
      try { e.preventDefault(); } catch (err) {}
      zoomBy(e.deltaY < 0 ? 1.08 : 1 / 1.08);
    }
  }

  const showTooltip = useCallback((e, dateLabel, timeLabel, label) => {
    setHover({ x: e.clientX, y: e.clientY, dateLabel, timeLabel, label });
  }, []);
  const moveTooltip = useCallback((e) => {
    setHover((h) => (h ? { ...h, x: e.clientX, y: e.clientY } : h));
  }, []);
  const hideTooltip = useCallback(() => setHover(null), []);

  const zoomPct = Math.round(zoom * 100);

  return (
    <div>
      <div style={{ background: t.surface, borderRadius: 14, padding: "14px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
          <div style={{ fontSize: 10, color: t.sub }}>
            {zoom > 1 ? "Pinch, drag, or scroll sideways to pan" : "Tap empty space on a bar to add an entry there"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <button
              onClick={() => startAddAt(todayKey(), 540)}
              title="Add entry"
              style={{ display: "flex", alignItems: "center", gap: 3, height: 24, padding: "0 8px", borderRadius: 7, border: `1px solid ${t.moss}`, background: "transparent", color: t.moss, cursor: "pointer", fontSize: 10.5, fontWeight: 700 }}
            >
              <Plus size={11} /> Add
            </button>
            <button
              onClick={() => zoomBy(1 / ZOOM_STEP)}
              disabled={zoom <= MIN_ZOOM}
              style={{ width: 24, height: 24, borderRadius: 7, border: `1px solid ${t.line}`, background: "transparent", color: zoom <= MIN_ZOOM ? t.line : t.sub, cursor: zoom <= MIN_ZOOM ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <ZoomOut size={12} />
            </button>
            <span style={{ fontSize: 10, color: t.sub, minWidth: 32, textAlign: "center" }}>{zoomPct}%</span>
            <button
              onClick={() => zoomBy(ZOOM_STEP)}
              disabled={zoom >= MAX_ZOOM}
              style={{ width: 24, height: 24, borderRadius: 7, border: `1px solid ${t.line}`, background: "transparent", color: zoom >= MAX_ZOOM ? t.line : t.sub, cursor: zoom >= MAX_ZOOM ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <ZoomIn size={12} />
            </button>
            {zoom > 1 && (
              <button
                onClick={resetZoom}
                title="Reset zoom"
                style={{ width: 24, height: 24, borderRadius: 7, border: `1px solid ${t.line}`, background: "transparent", color: t.sub, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <RotateCcw size={12} />
              </button>
            )}
          </div>
        </div>

        <div
          ref={scrollRef}
          className="sf-scroll"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onWheel={handleWheel}
          style={{ overflowX: "auto", overflowY: "auto", maxHeight: 400, WebkitOverflowScrolling: "touch" }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 5, width: `${zoomPct}%`, minWidth: "100%" }}>
            {/* sticky header row: hour labels */}
            <div style={{ display: "flex", position: "sticky", top: 0, zIndex: 3, background: t.surface, paddingBottom: 4 }}>
              <div style={{ width: 54, flexShrink: 0, position: "sticky", left: 0, zIndex: 4, background: t.surface }} />
              <div style={{ position: "relative", height: 14, flex: 1, minWidth: 0 }}>
                {hourMarks.map((mk, idx) => (
                  <span
                    key={mk.min}
                    style={{
                      position: "absolute",
                      left: `${mk.pct}%`,
                      transform: idx === 0 ? "translateX(2px)" : "translateX(-50%)",
                      fontSize: mk.major ? 9.5 : 8,
                      fontWeight: mk.major ? 600 : 400,
                      color: mk.major ? t.sub : `${t.sub}99`,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {minToTime(mk.min)}
                  </span>
                ))}
                {sleepOn && (
                  <span style={{ position: "absolute", left: `${activeEndPct + (100 - activeEndPct) / 2}%`, transform: "translateX(-50%)", color: t.sub, fontStyle: "italic", fontSize: 9.5, whiteSpace: "nowrap" }}>
                    sleep
                  </span>
                )}
              </div>
            </div>

            {/* day rows */}
            {days.map((d) => {
              const key = todayKey(d);
              const daySessions = sessions.filter((s) => s.date === key);
              const sleepId = `sleep-${key}`;
              const dateLabel = key === todayKey() ? "Today" : d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
              return (
                <div key={key} style={{ display: "flex", alignItems: "center" }}>
                  <span style={{ width: 54, flexShrink: 0, position: "sticky", left: 0, zIndex: 2, background: t.surface, fontSize: 10.5, color: t.sub, paddingRight: 4 }}>
                    {dateLabel}
                  </span>
                  <div
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickPct = ((e.clientX - rect.left) / rect.width) * 100;
                      startAddAt(key, pctToMin(clickPct));
                    }}
                    style={{ position: "relative", height: 16, flex: 1, minWidth: 0, background: t.bg, borderRadius: 4, overflow: "hidden", cursor: "copy" }}
                  >
                    {hourMarks.map((mk) => (
                      <div
                        key={`grid-${mk.min}`}
                        style={{
                          position: "absolute",
                          left: `${mk.pct}%`,
                          top: 0,
                          bottom: 0,
                          width: 0,
                          borderLeft: `1px dotted ${t.line}`,
                          opacity: mk.major ? 0.9 : 0.45,
                          pointerEvents: "none",
                          zIndex: 1,
                        }}
                      />
                    ))}
                    {sleepOn && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          setAdding(false);
                          setSelected({
                            id: sleepId,
                            date: key,
                            startMinutes: sleepMin,
                            minutes: (1440 - ((sleepMin - wakeMin + 1440) % 1440)) || 1440,
                            note: "Sleep",
                            isSleep: true,
                          });
                        }}
                        onMouseEnter={(e) => showTooltip(e, dateLabel, `${minToTime(sleepMin)}–${minToTime(sleepMin + ((1440 - ((sleepMin - wakeMin + 1440) % 1440)) || 1440))}`, "Sleep")}
                        onMouseMove={moveTooltip}
                        onMouseLeave={hideTooltip}
                        title="Sleep (compressed)"
                        style={{
                          position: "absolute",
                          left: `${activeEndPct}%`,
                          right: 0,
                          top: 0,
                          bottom: 0,
                          background: `repeating-linear-gradient(135deg, ${SLEEP_COLOR}33, ${SLEEP_COLOR}33 3px, ${SLEEP_COLOR}1a 3px, ${SLEEP_COLOR}1a 6px)`,
                          borderLeft: `1px solid ${t.line}`,
                          cursor: "pointer",
                          outline: selected?.id === sleepId ? `2px solid ${t.ink}` : "none",
                          zIndex: 2,
                        }}
                      />
                    )}
                    {daySessions.map((s) => {
                      const start = s.startMinutes ?? 540;
                      const left = pct(start);
                      const right = pct(start + s.minutes);
                      const width = Math.max(right - left, 1.2);
                      const label = activityLabel(s);
                      return (
                        <div
                          key={s.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setAdding(false);
                            setSelected(s);
                          }}
                          onMouseEnter={(e) => showTooltip(e, dateLabel, `${minToTime(start)}–${minToTime(start + s.minutes)}`, label)}
                          onMouseMove={moveTooltip}
                          onMouseLeave={hideTooltip}
                          title={`${minToTime(start)}–${minToTime(start + s.minutes)} · ${label}`}
                          style={{
                            position: "absolute",
                            left: `${left}%`,
                            width: `${width}%`,
                            top: 2,
                            bottom: 2,
                            background: colorByTaskId[s.taskId] || (s.manual ? t.clay : t.moss),
                            borderRadius: 3,
                            opacity: selected?.id === s.id ? 1 : 0.85,
                            cursor: "pointer",
                            outline: selected?.id === s.id ? `2px solid ${t.ink}` : "none",
                            zIndex: 2,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 10 }}>
          <button onClick={() => setDaysToShow((n) => n + 14)} style={{ fontSize: 11.5, color: t.moss, background: "transparent", border: `1px solid ${t.line}`, borderRadius: 999, padding: "6px 14px", cursor: "pointer", fontWeight: 600 }}>
            Show 14 more days
          </button>
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 10.5, color: t.sub, flexWrap: "wrap" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: t.moss, display: "inline-block" }} />
            Timer session
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: t.clay, display: "inline-block" }} />
            Logged manually
          </span>
          {sleepOn && (
            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: SLEEP_COLOR, opacity: 0.4, display: "inline-block" }} />
              Sleep (compressed)
            </span>
          )}
        </div>
      </div>
      <div style={{ marginTop: 10, minHeight: 40, background: t.surface, borderRadius: 10, padding: "12px 14px", fontSize: 12.5 }}>
        {!selected && !adding && (
          <span style={{ color: t.sub }}>
            {sleepOn
              ? `Tap a block to see, edit or delete it. Tap empty space on a bar — or the Add button above — to log a new entry. The timeline starts at your wake time (${sleepSettings.end}) and sleep is compressed on the right.`
              : "Tap a block to see, edit or delete it. Tap empty space on a bar — or the Add button above — to log a new entry. Set a wake/sleep time in Settings to compress the sleep hours."}
          </span>
        )}

        {selected && selected.isSleep && (
          <div>
            <div style={{ color: t.ink }}>
              <strong>{new Date(selected.date + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "short" })}</strong>
              {" · "}Sleep {minToTime(selected.startMinutes)}–{minToTime(selected.startMinutes + selected.minutes)}
            </div>
            <div style={{ color: t.sub, fontSize: 11, marginTop: 4 }}>
              Sleep hours come from your wake/sleep schedule — edit them in <strong>Settings</strong>.
            </div>
          </div>
        )}

        {selected && !selected.isSleep && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
              <strong style={{ color: t.ink }}>
                {new Date(selected.date + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
              </strong>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ color: t.sub, fontSize: 11.5, textAlign: "right" }}>{activityLabel(selected)}</span>
                <button
                  onClick={deleteSelected}
                  title="Delete entry"
                  style={{ width: 22, height: 22, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: `1px solid ${t.line}`, background: "transparent", color: t.clay, cursor: "pointer" }}
                >
                  <Trash2 size={12} />
                </button>
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 10, color: t.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Start</span>
                <input
                  type="time"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                  style={{ background: t.bg, border: `1px solid ${t.line}`, borderRadius: 8, padding: "6px 8px", color: t.ink, fontSize: 13, outline: "none", colorScheme: t.bg === "#1B1E1A" ? "dark" : "light" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 10, color: t.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>End</span>
                <input
                  type="time"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                  style={{ background: t.bg, border: `1px solid ${t.line}`, borderRadius: 8, padding: "6px 8px", color: t.ink, fontSize: 13, outline: "none", colorScheme: t.bg === "#1B1E1A" ? "dark" : "light" }}
                />
              </label>
              <button
                onClick={saveEdit}
                disabled={!editDirty}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "7px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: editDirty ? t.moss : t.line,
                  color: editDirty ? t.bg : t.sub,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: editDirty ? "pointer" : "default",
                }}
              >
                <Check size={13} /> Save
              </button>
            </div>

            <div style={{ fontSize: 10.5, color: t.sub, marginTop: 8 }}>
              {editedMinutes != null ? `Duration: ${Math.floor(editedMinutes / 60)}h ${editedMinutes % 60}m` : ""}
              {editDirty ? " · unsaved change" : ""}
            </div>
          </div>
        )}

        {adding && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, gap: 8 }}>
              <strong style={{ color: t.ink }}>
                New entry · {new Date(newDate + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
              </strong>
              <button
                onClick={cancelAdd}
                title="Cancel"
                style={{ width: 22, height: 22, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: `1px solid ${t.line}`, background: "transparent", color: t.sub, cursor: "pointer" }}
              >
                <X size={13} />
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 10, color: t.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Start</span>
                <input
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  style={{ background: t.bg, border: `1px solid ${t.line}`, borderRadius: 8, padding: "6px 8px", color: t.ink, fontSize: 13, outline: "none", colorScheme: t.bg === "#1B1E1A" ? "dark" : "light" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <span style={{ fontSize: 10, color: t.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>End</span>
                <input
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  style={{ background: t.bg, border: `1px solid ${t.line}`, borderRadius: 8, padding: "6px 8px", color: t.ink, fontSize: 13, outline: "none", colorScheme: t.bg === "#1B1E1A" ? "dark" : "light" }}
                />
              </label>
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: 3, marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: t.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>Note (optional)</span>
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="What did you work on?"
                style={{ background: t.bg, border: `1px solid ${t.line}`, borderRadius: 8, padding: "7px 10px", color: t.ink, fontSize: 13, outline: "none" }}
              />
            </label>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10.5, color: t.sub }}>
                {newMinutes != null ? `Duration: ${Math.floor(newMinutes / 60)}h ${newMinutes % 60}m` : ""}
              </span>
              <button
                onClick={saveNewEntry}
                disabled={newMinutes == null}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "7px 14px",
                  borderRadius: 8,
                  border: "none",
                  background: newMinutes != null ? t.moss : t.line,
                  color: newMinutes != null ? t.bg : t.sub,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: newMinutes != null ? "pointer" : "default",
                }}
              >
                <Plus size={13} /> Save entry
              </button>
            </div>
          </div>
        )}
      </div>


      {hover && (
        <div
          style={{
            position: "fixed",
            left: Math.min(hover.x + 14, (typeof window !== "undefined" ? window.innerWidth : 9999) - 190),
            top: Math.max(hover.y - 46, 8),
            zIndex: 9999,
            pointerEvents: "none",
            background: t.ink,
            color: t.bg,
            borderRadius: 8,
            padding: "7px 10px",
            fontSize: 11.5,
            lineHeight: 1.45,
            maxWidth: 180,
            boxShadow: "0 8px 20px -6px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 1 }}>{hover.dateLabel} · {hover.timeLabel}</div>
          <div style={{ opacity: 0.85 }}>{hover.label}</div>
        </div>
      )}
    </div>
  );
}
