import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { todayKey, mondayOf, addDays, resolveRow, slotLabel, isSleepText } from "../utils/dates";
import { SLEEP_COLOR, taskColor } from "../theme";
import PlannerCellEditor from "./PlannerCellEditor";
import ConsistencySection from "./ConsistencySection";

/* ── constants ── */
const NORMAL_H = 22;
const COMPRESSED_H = 7;
const COMPRESS_MIN = 4; // minimum consecutive slots to trigger compression
const IS_TOUCH = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

/* ── helpers ── */
function colIndex(dayIdx, type) { return 2 + dayIdx * 2 + (type === "doing" ? 1 : 0); }

function getSlotValues(anchorDate, type, planner, dayStartHour) {
  const vals = [];
  for (let row = 0; row < 48; row++) {
    const { slotIdx, date } = resolveRow(anchorDate, row, dayStartHour);
    vals.push(planner[`${todayKey(date)}|${slotLabel(slotIdx)}|${type}`] || "");
  }
  return vals;
}

function buildRunsFromValues(vals) {
  const runs = [];
  let i = 0;
  while (i < 48) {
    const val = vals[i] || "";
    if (!val) { runs.push({ start: i, end: i, text: "" }); i++; continue; }
    let j = i;
    while (j + 1 < 48 && (vals[j + 1] || "") === val) j++;
    runs.push({ start: i, end: j, text: val });
    i = j + 1;
  }
  return runs;
}

/* ── component ── */
export default function PlannerScreen({ t, planner, setPlanner, eisenhower, dayStartHour, consistencyTasks, setConsistencyTasks }) {
  const [plannerView, setPlannerView] = useState("weekly");
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [editing, setEditing] = useState(null);
  const [hoveredRunKey, setHoveredRunKey] = useState(null);
  const [dragPreview, setDragPreview] = useState(null);

  const scrollRef = useRef(null);
  const gridRef = useRef(null);
  const dayRefs = useRef({});
  const dragRef = useRef(null);
  const rowOffsetsRef = useRef([]);
  const dragCleanupRef = useRef(null);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const rows = Array.from({ length: 48 }, (_, i) => i);
  const todayStr = todayKey();

  /* ── build all column runs & compressed-row set ── */
  const allColumnRuns = [];
  days.forEach((d, dayIdx) => {
    const plannedVals = getSlotValues(d, "planned", planner, dayStartHour);
    const doingVals = getSlotValues(d, "doing", planner, dayStartHour);
    // a "doing" slot is achieved when it was logged with the same text as what was planned for that slot
    const achieved = doingVals.map((v, i) => !!v && v === plannedVals[i]);
    allColumnRuns.push({ dayIdx, type: "planned", date: d, runs: buildRunsFromValues(plannedVals) });
    allColumnRuns.push({ dayIdx, type: "doing", date: d, runs: buildRunsFromValues(doingVals), achieved });
  });

  const compressedRows = new Set();
  allColumnRuns.forEach(({ runs }) => {
    runs.forEach((run) => {
      if (run.text && run.end - run.start + 1 >= COMPRESS_MIN) {
        for (let r = run.start; r <= run.end; r++) compressedRows.add(r);
      }
    });
  });

  const rowHeights = Array.from({ length: 48 }, (_, i) => compressedRows.has(i) ? COMPRESSED_H : NORMAL_H);
  const gridTemplateRows = `auto auto ${rowHeights.map((h) => h + "px").join(" ")}`;

  /* ── scrollToDay (horizontal only, e.g. from the day-pill row) ── */
  function scrollToDay(idx, behavior = "smooth") { const el = dayRefs.current[idx]; if (el && scrollRef.current) scrollRef.current.scrollTo({ left: el.offsetLeft - 54, behavior }); }

  /* ── scroll to a given day AND a given row (used to land on "today, right now" on open) ── */
  function scrollToDayAndRow(dayIdx, rowIdx, behavior = "smooth") {
    if (!gridRef.current || !scrollRef.current) return;
    const dayEl = dayRefs.current[dayIdx];
    const marker = gridRef.current.querySelector("[data-rowmarker='0']");
    if (!dayEl || !marker) return;
    const gridRect = gridRef.current.getBoundingClientRect();
    const headerH = marker.getBoundingClientRect().top - gridRect.top;
    let top = headerH;
    for (let i = 0; i < rowIdx; i++) top += rowHeights[i];
    top = Math.max(0, top - 60); // leave a little context above the current-time row
    scrollRef.current.scrollTo({ left: dayEl.offsetLeft - 54, top, behavior });
  }

  /* ── jump straight to today's column & current time whenever the weekly grid appears ── */
  useEffect(() => {
    if (plannerView !== "weekly") return;
    const idx = days.findIndex((d) => todayKey(d) === todayStr);
    if (idx < 0) return;
    const now = new Date();
    const nowRow = Math.floor((((now.getHours() * 60 + now.getMinutes()) - dayStartHour * 60 + 1440) % 1440) / 30);
    const id = requestAnimationFrame(() => scrollToDayAndRow(idx, nowRow, "auto"));
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plannerView]);

  /* ── applyRange (unchanged) ── */
  function applyRange(anchorDate, type, run, startIdx, endIdx, text) {
    setPlanner((prev) => {
      const next = { ...prev };
      for (let k = run.start; k <= run.end; k++) { const { slotIdx, date } = resolveRow(anchorDate, k, dayStartHour); delete next[`${todayKey(date)}|${slotLabel(slotIdx)}|${type}`]; }
      if (text) { for (let k = startIdx; k <= endIdx; k++) { const { slotIdx, date } = resolveRow(anchorDate, k, dayStartHour); next[`${todayKey(date)}|${slotLabel(slotIdx)}|${type}`] = text; } }
      return next;
    });
    setEditing(null);
  }

  /* ── drag-to-fill ── */
  function startDrag(e, dayIdx, type, anchorDate, run) {
    e.preventDefault();
    e.stopPropagation();

    if (!gridRef.current) return;

    // measure header height from the first time-axis marker
    const gridRect = gridRef.current.getBoundingClientRect();
    const marker = gridRef.current.querySelector("[data-rowmarker='0']");
    if (!marker) return;
    const headerH = marker.getBoundingClientRect().top - gridRect.top;

    // build cumulative Y offsets from grid top for each data row
    const offsets = [headerH];
    for (let i = 0; i < 48; i++) offsets.push(offsets[i] + rowHeights[i]);
    rowOffsetsRef.current = offsets;

    const newDrag = { dayIdx, type, anchorDate, run, currentEndRow: run.end };
    dragRef.current = newDrag;
    setDragPreview(newDrag);

    function handleMove(evt) {
      const d = dragRef.current;
      if (!d || !gridRef.current) return;
      evt.preventDefault();

      const clientY = evt.clientY ?? evt.touches?.[0]?.clientY;
      if (clientY == null) return;

      // auto-scroll near edges of the scroll container
      if (scrollRef.current) {
        const sr = scrollRef.current.getBoundingClientRect();
        if (clientY > sr.bottom - 30) scrollRef.current.scrollTop += 4;
        else if (clientY < sr.top + 30) scrollRef.current.scrollTop -= 4;
      }

      const gr = gridRef.current.getBoundingClientRect();
      const relY = clientY - gr.top;
      const offs = rowOffsetsRef.current;

      let row = d.run.end;
      for (let i = 0; i < 48; i++) {
        if (relY >= offs[i] && relY < offs[i + 1]) { row = i; break; }
      }
      if (relY >= offs[48]) row = 47;

      // only extend downward from original run end
      row = Math.max(d.run.end, Math.min(47, row));

      if (row !== d.currentEndRow) {
        const updated = { ...d, currentEndRow: row };
        dragRef.current = updated;
        setDragPreview(updated);
      }
    }

    function handleEnd() {
      const d = dragRef.current;
      if (d && d.currentEndRow > d.run.end) {
        setPlanner((prev) => {
          const next = { ...prev };
          for (let k = d.run.start; k <= d.run.end; k++) {
            const { slotIdx, date } = resolveRow(d.anchorDate, k, dayStartHour);
            delete next[`${todayKey(date)}|${slotLabel(slotIdx)}|${d.type}`];
          }
          for (let k = d.run.start; k <= d.currentEndRow; k++) {
            const { slotIdx, date } = resolveRow(d.anchorDate, k, dayStartHour);
            next[`${todayKey(date)}|${slotLabel(slotIdx)}|${d.type}`] = d.run.text;
          }
          return next;
        });
      }
      dragRef.current = null;
      setDragPreview(null);
      cleanup();
    }

    function cleanup() {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("touchend", handleEnd);
      dragCleanupRef.current = null;
    }

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    dragCleanupRef.current = cleanup;
  }

  // cleanup window listeners on unmount
  useEffect(() => {
    return () => { if (dragCleanupRef.current) dragCleanupRef.current(); };
  }, []);

  /* ── render ── */
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: t.surface, borderRadius: 10, padding: 3 }}>
        {[{ k: "weekly", label: "Weekly Plan" }, { k: "consistency", label: "Consistency" }].map(({ k, label }) => (
          <button key={k} onClick={() => setPlannerView(k)} style={{ flex: 1, minWidth: 56, padding: "7px 0", borderRadius: 8, border: "none", background: plannerView === k ? t.bg : "transparent", color: plannerView === k ? t.ink : t.sub, fontSize: 11.5, fontWeight: 600, cursor: "pointer", boxShadow: plannerView === k ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>{label}</button>
        ))}
      </div>

      {plannerView === "consistency" && (
        <ConsistencySection t={t} consistencyTasks={consistencyTasks} setConsistencyTasks={setConsistencyTasks} />
      )}

      {plannerView === "weekly" && (
      <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <button onClick={() => setWeekStart(addDays(weekStart, -7))} style={{ background: "none", border: "none", color: t.sub, cursor: "pointer" }}><ChevronLeft size={17} /></button>
        <span style={{ fontSize: 13, fontWeight: 600 }}>{weekStart.toLocaleDateString(undefined, { day: "2-digit", month: "short" })} – {addDays(weekStart, 6).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}</span>
        <button onClick={() => setWeekStart(addDays(weekStart, 7))} style={{ background: "none", border: "none", color: t.sub, cursor: "pointer" }}><ChevronRight size={17} /></button>
      </div>

      <div className="sf-scroll" style={{ display: "flex", gap: 4, marginBottom: 10, overflowX: "auto", paddingBottom: 4 }}>
        {days.map((d, i) => (
          <button key={i} onClick={() => scrollToDay(i)} style={{ flexShrink: 0, padding: "6px 10px", borderRadius: 999, border: `1px solid ${todayKey(d) === todayStr ? t.moss : t.line}`, background: todayKey(d) === todayStr ? t.moss : "transparent", color: todayKey(d) === todayStr ? t.bg : t.sub, fontSize: 11, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>{d.toLocaleDateString(undefined, { weekday: "short" })} {d.getDate()}</button>
        ))}
      </div>
      {dayStartHour !== 0 && <div style={{ fontSize: 10.5, color: t.sub, marginBottom: 8 }}>Each day column runs {slotLabel(dayStartHour * 2)} → {slotLabel(dayStartHour * 2)} next day. Change this in Settings.</div>}

      <div ref={scrollRef} className="sf-scroll" style={{ overflow: "auto", maxHeight: 440, border: `1px solid ${t.line}`, borderRadius: 12 }}>
        <div ref={gridRef} style={{ display: "grid", gridTemplateColumns: `54px repeat(${7 * 2}, 84px)`, gridTemplateRows, minWidth: 54 + 7 * 2 * 84, userSelect: dragPreview ? "none" : undefined }}>

          {/* ── header row 1: day names ── */}
          <div style={{ gridColumn: 1, gridRow: 1, position: "sticky", top: 0, left: 0, zIndex: 6, background: t.surface2, borderBottom: `1px solid ${t.line}`, borderRight: `1px solid ${t.line}` }} />
          {days.map((d, i) => (
            <div key={`h1-${i}`} ref={(el) => (dayRefs.current[i] = el)} style={{ gridColumn: `${colIndex(i, "planned")} / span 2`, gridRow: 1, position: "sticky", top: 0, zIndex: 4, background: todayKey(d) === todayStr ? t.moss : t.surface2, color: todayKey(d) === todayStr ? t.bg : t.ink, textAlign: "center", padding: "6px 0 4px", fontSize: 11.5, fontWeight: 700, borderBottom: `1px solid ${t.line}` }}>
              {d.toLocaleDateString(undefined, { weekday: "short" })} <span style={{ fontWeight: 400, opacity: 0.85 }}>{d.getDate()}</span>
            </div>
          ))}

          {/* ── header row 2: Planned / Doing ── */}
          <div style={{ gridColumn: 1, gridRow: 2, position: "sticky", top: 28, left: 0, zIndex: 6, background: t.surface2, borderBottom: `1px solid ${t.line}`, borderRight: `1px solid ${t.line}`, fontSize: 9.5, color: t.sub, display: "flex", alignItems: "center", justifyContent: "center" }}>Time</div>
          {days.map((_, i) => (
            <React.Fragment key={`h2-${i}`}>
              <div style={{ gridColumn: colIndex(i, "planned"), gridRow: 2, position: "sticky", top: 28, zIndex: 3, background: t.surface2, textAlign: "center", fontSize: 9.5, color: t.sub, padding: "3px 0", borderBottom: `1px solid ${t.line}` }}>Planned</div>
              <div style={{ gridColumn: colIndex(i, "doing"), gridRow: 2, position: "sticky", top: 28, zIndex: 3, background: t.surface2, textAlign: "center", fontSize: 9.5, color: t.sub, padding: "3px 0", borderBottom: `1px solid ${t.line}` }}>Doing</div>
            </React.Fragment>
          ))}

          {/* ── time-axis column ── */}
          {rows.map((row) => {
            const slotIdx = (dayStartHour * 2 + row) % 48;
            const isHour = slotIdx % 2 === 0;
            const isCompressed = compressedRows.has(row);
            const isSpanStart = isCompressed && (row === 0 || !compressedRows.has(row - 1));

            let label = "";
            let labelSize = isHour ? 10 : 9;
            let labelWeight = isHour ? 600 : 400;
            let labelColor = isHour ? t.ink : t.sub;

            if (isCompressed) {
              if (isSpanStart) { label = slotLabel(slotIdx); labelSize = 7; labelWeight = 600; labelColor = t.sub; }
            } else {
              label = isHour ? slotLabel(slotIdx) : ":30";
            }

            return (
              <div key={`tm-${row}`} data-rowmarker={row} style={{ gridColumn: 1, gridRow: row + 3, position: "sticky", left: 0, zIndex: 2, background: t.surface2, fontSize: labelSize, color: labelColor, fontWeight: labelWeight, display: "flex", alignItems: "center", justifyContent: "center", borderRight: `1px solid ${t.line}`, borderBottom: `1px solid ${t.line}`, overflow: "hidden" }}>{label}</div>
            );
          })}

          {/* ── data cells (run blocks) ── */}
          {allColumnRuns.flatMap(({ dayIdx, type, date: d, runs, achieved }) =>
            runs.map((run) => {
              const sleep = isSleepText(run.text);
              const runKey = `${todayKey(d)}-${type}-${run.start}`;
              const isLong = run.text && run.end - run.start + 1 >= COMPRESS_MIN;
              const isDragSource = dragPreview && dragPreview.dayIdx === dayIdx && dragPreview.type === type && dragPreview.run.start === run.start;

              // "achieved": every slot in this Doing run was logged with exactly what was planned for it
              const isAchieved = type === "doing" && !!run.text && !!achieved &&
                achieved.slice(run.start, run.end + 1).every(Boolean);

              // each distinct task gets its own consistent colour, shared between Planned and Doing
              const baseColor = taskColor(run.text) || (type === "planned" ? t.clay : t.moss);

              return (
                <div key={runKey}
                  onClick={() => { if (dragRef.current) return; setEditing({ date: todayKey(d), type, start: run.start, end: run.end, current: run.text, dayStartHour }); }}
                  onMouseEnter={!IS_TOUCH ? () => setHoveredRunKey(runKey) : undefined}
                  onMouseLeave={!IS_TOUCH ? () => setHoveredRunKey(null) : undefined}
                  style={{
                    gridColumn: colIndex(dayIdx, type), gridRow: `${run.start + 3} / ${run.end + 4}`,
                    borderRight: `1px solid ${t.line}`, borderBottom: `1px solid ${t.line}`,
                    padding: isLong ? "0 4px" : "2px 5px",
                    fontSize: sleep ? (isLong ? 10.5 : 9.5) : isLong ? 11 : 10,
                    fontWeight: (sleep || isLong) ? 700 : 400,
                    cursor: "pointer",
                    background: isDragSource
                      ? (sleep ? SLEEP_COLOR : baseColor + "40")
                      : (sleep ? SLEEP_COLOR : run.text ? (baseColor + (isAchieved ? "45" : "26")) : "transparent"),
                    color: sleep ? "#4a3a08" : run.text ? t.ink : t.sub,
                    display: "flex", alignItems: "center", justifyContent: sleep ? "center" : "flex-start",
                    overflow: "hidden", whiteSpace: run.end > run.start ? "normal" : "nowrap", textOverflow: "ellipsis", textAlign: sleep ? "center" : "left", lineHeight: 1.2,
                    position: "relative",
                    outline: isDragSource ? `2px solid ${baseColor}` : isAchieved ? `1.5px solid #2e9e5b` : "none",
                    outlineOffset: -2,
                  }}>
                  {sleep ? "💤 Sleep" : run.text}

                  {/* achievement mark: logged in Doing exactly as planned */}
                  {isAchieved && (
                    <div style={{
                      position: "absolute", top: 1, right: 1,
                      width: 12, height: 12, borderRadius: "50%",
                      background: "#2e9e5b", display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 0 0 1.5px rgba(255,255,255,0.7)", zIndex: 3,
                    }}>
                      <Check size={8} color="#fff" strokeWidth={3} />
                    </div>
                  )}

                  {/* drag handle */}
                  {run.text && (
                    <div
                      onMouseDown={(e) => startDrag(e, dayIdx, type, d, run)}
                      onTouchStart={(e) => startDrag(e, dayIdx, type, d, run)}
                      style={{
                        position: "absolute", bottom: 1, right: 1,
                        width: 7, height: 7, borderRadius: 1,
                        background: sleep ? "#4a3a08" : baseColor,
                        opacity: IS_TOUCH ? 0.35 : (hoveredRunKey === runKey ? 0.85 : 0),
                        cursor: "ns-resize", touchAction: "none", zIndex: 5,
                        transition: "opacity 0.15s",
                      }}
                    />
                  )}
                </div>
              );
            })
          )}

          {/* ── drag preview overlay ── */}
          {dragPreview && dragPreview.currentEndRow > dragPreview.run.end && (() => {
            const previewColor = taskColor(dragPreview.run.text) || (dragPreview.type === "planned" ? t.clay : t.moss);
            return (
              <div style={{
                gridColumn: colIndex(dragPreview.dayIdx, dragPreview.type),
                gridRow: `${dragPreview.run.end + 4} / ${dragPreview.currentEndRow + 4}`,
                background: previewColor + "20",
                border: `2px dashed ${previewColor}`,
                borderRadius: 3, pointerEvents: "none", zIndex: 4,
              }} />
            );
          })()}

        </div>
      </div>

      <div style={{ fontSize: 11, color: t.sub, marginTop: 8 }}>Half-hour slots · tap to edit · drag the <span style={{ display: "inline-block", width: 6, height: 6, background: t.moss, borderRadius: 1, verticalAlign: "middle", margin: "0 2px" }} /> handle at a block's corner to fill down instantly. Each task keeps its own colour across Planned and Doing · a <span style={{ display: "inline-flex", width: 10, height: 10, background: "#2e9e5b", borderRadius: "50%", verticalAlign: "middle", margin: "0 2px", alignItems: "center", justifyContent: "center" }}><Check size={7} color="#fff" strokeWidth={3} /></span> mark means you logged exactly what you planned.</div>

      {editing && (
        <PlannerCellEditor t={t} editing={editing} eisenhower={eisenhower} onClose={() => setEditing(null)}
          onSave={(text, endIdx) => applyRange(new Date(editing.date + "T00:00:00"), editing.type, editing, editing.start, endIdx, text)} />
      )}
      </>
      )}
    </div>
  );
}
