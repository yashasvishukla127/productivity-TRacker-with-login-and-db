import React, { useState, useMemo, useRef, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { todayKey, addDays, timeToMin, minToTime, mapMinuteToPercent } from "../utils/dates";
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

export default function RecordsView({ t, sessions, sleepSettings, tasks = [] }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [daysToShow, setDaysToShow] = useState(14);
  const days = Array.from({ length: daysToShow }, (_, i) => addDays(today, -i));
  const [selected, setSelected] = useState(null);
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
            {zoom > 1 ? "Pinch, drag, or scroll sideways to pan" : "Pinch or use +/- to zoom into an hourly view"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
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
                  <div style={{ position: "relative", height: 16, flex: 1, minWidth: 0, background: t.bg, borderRadius: 4, overflow: "hidden" }}>
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
                        onClick={() =>
                          setSelected({
                            id: sleepId,
                            date: key,
                            startMinutes: sleepMin,
                            minutes: (1440 - ((sleepMin - wakeMin + 1440) % 1440)) || 1440,
                            note: "Sleep",
                            isSleep: true,
                          })
                        }
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
                          onClick={() => setSelected(s)}
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
      <div style={{ marginTop: 10, minHeight: 40, background: t.surface, borderRadius: 10, padding: "10px 12px", fontSize: 12.5, color: selected ? t.ink : t.sub }}>
        {selected ? (
          (() => {
            const startH = Math.floor(selected.startMinutes / 60).toString().padStart(2, "0");
            const startM = (selected.startMinutes % 60).toString().padStart(2, "0");
            const endTotal = selected.startMinutes + selected.minutes;
            const endH = Math.floor((endTotal % 1440) / 60).toString().padStart(2, "0");
            const endM = (endTotal % 60).toString().padStart(2, "0");
            return (
              <span>
                <strong>{new Date(selected.date + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "short" })}</strong>
                {" · "}
                {startH}:{startM}–{endH}:{endM} · {selected.minutes}m{selected.note ? ` · ${selected.note}` : ""}
              </span>
            );
          })()
        ) : sleepOn ? (
          `Tap a block above to see its date, time and duration. The timeline starts at your wake time (${sleepSettings.end}) and sleep is compressed on the right.`
        ) : (
          "Tap a block above to see its date, time and duration. Set a wake/sleep time in Settings to compress the sleep hours."
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
