import React, { useState } from "react";
import { todayKey } from "../utils/dates";

// Buckets a 0..1 completion value into one of 4 opacity steps (plus empty),
// the same idea as GitHub's contribution graph — deliberately coarse so the
// grid reads as a quiet texture rather than a precise chart.
function alphaForValue(v) {
  if (v <= 0) return null; // empty cell
  if (v >= 0.99) return "FF";
  if (v >= 0.66) return "B3";
  if (v >= 0.33) return "73";
  return "38";
}

// Resolves the actual CSS background for a cell. Fully-completed days get a
// subtle two-tone moss→clay gradient instead of a flat fill — a small bit of
// polish that makes a "perfect" day visually pop against partial ones.
function cellBackground(value, t) {
  if (value <= 0) return null;
  if (value >= 0.99) return `linear-gradient(135deg, ${t.moss}, ${t.clay})`;
  return t.moss + alphaForValue(value);
}

// Groups a chronological list of Dates into Monday-start week columns,
// left-padding/right-padding the first/last week with nulls so every
// column has exactly 7 slots (Mon..Sun) and columns line up as real weeks.
function buildWeeks(days) {
  const weeks = [];
  let current = new Array(7).fill(null);
  days.forEach((d) => {
    const dow = (d.getDay() + 6) % 7; // Mon=0 .. Sun=6
    current[dow] = d;
    if (dow === 6) {
      weeks.push(current);
      current = new Array(7).fill(null);
    }
  });
  if (current.some(Boolean)) weeks.push(current);
  return weeks;
}

// Short weekday labels for the left-hand gutter, Mon..Sun. Only a few are
// shown (GitHub-style) so the column doesn't get noisy — enough to orient
// which row is which day without labeling every single one.
const WEEKDAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", ""];

/**
 * Small "Less ▢▢▢▢ More" key explaining the fill scale. Drop it under any
 * heatmap instance — sized to match cellSize so the swatches read as the
 * same squares used in the grid above them.
 */
export function HeatmapLegend({ t, cellSize = 11 }) {
  const steps = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, color: t.sub }}>
      <span>Less</span>
      {steps.map((v, i) => (
        <div
          key={i}
          style={{
            width: cellSize,
            height: cellSize,
            borderRadius: 3,
            background: cellBackground(v, t) || "transparent",
            border: v <= 0 ? `1px solid ${t.line}` : "none",
            boxSizing: "border-box",
          }}
        />
      ))}
      <span>More</span>
    </div>
  );
}

/**
 * Minimalist week-column heatmap for consistency tracking.
 *
 * days:        chronological (oldest first) array of Date objects to plot.
 * getValue:    (dateKey) => 0..1 (or boolean) completion for that day.
 * onCellClick: optional (dateKey) => void — omit for a read-only/aggregate view.
 * cellSize/gap: pixel sizes, so the same component can be full-size (overview)
 *               or shrunk down (per-task rows).
 * showWeekdayLabels: show a Mon/Wed/Fri gutter on the left so rows are easy
 *               to read at a glance (defaults on for the larger overview grid,
 *               off for the compact per-task rows where there's less space).
 */
export default function ConsistencyHeatmap({
  t,
  days,
  getValue,
  onCellClick,
  getAriaLabel,
  cellSize = 11,
  gap = 3,
  showMonthLabels = true,
  showWeekdayLabels = showMonthLabels,
}) {
  const weeks = buildWeeks(days);
  const todayStr = todayKey();
  let lastMonth = null;

  // Which cell is currently hovered/tapped, so we can show a small floating
  // tooltip with the actual date — the native `title` attribute works on
  // desktop hover but is invisible on touch, which was the original problem.
  const [activeCell, setActiveCell] = useState(null); // { key, label, x, y }

  const rowHeight = cellSize + gap;

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 3, position: "relative" }}>
      <style>{`
        .sf-heat-cell { transition: transform 110ms ease, box-shadow 110ms ease, filter 110ms ease; }
        .sf-heat-cell:hover { transform: scale(1.22); box-shadow: 0 1px 4px rgba(0,0,0,0.25); z-index: 5; position: relative; }
        .sf-heat-cell:active { transform: scale(1.05); }
      `}</style>
      {showMonthLabels && (
        <div style={{ display: "flex", gap }}>
          {showWeekdayLabels && <div style={{ width: 26, flexShrink: 0 }} />}
          {weeks.map((week, wi) => {
            const firstDay = week.find(Boolean);
            const month = firstDay ? firstDay.getMonth() : null;
            const label = firstDay && month !== lastMonth ? firstDay.toLocaleDateString(undefined, { month: "short" }) : "";
            if (firstDay) lastMonth = month;
            return (
              <div key={wi} style={{ width: cellSize, fontSize: 8.5, color: t.sub, textAlign: "left", whiteSpace: "nowrap", overflow: "visible", fontWeight: 600, letterSpacing: "0.02em" }}>
                {label}
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: "flex", gap }}>
        {showWeekdayLabels && (
          <div style={{ display: "flex", flexDirection: "column", gap, width: 26, flexShrink: 0 }}>
            {WEEKDAY_LABELS.map((lbl, i) => (
              <div key={i} style={{ height: cellSize, fontSize: 8.5, lineHeight: `${cellSize}px`, color: t.sub, textAlign: "right", paddingRight: 4, whiteSpace: "nowrap" }}>
                {lbl}
              </div>
            ))}
          </div>
        )}
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap }}>
            {week.map((d, di) => {
              if (!d) return <div key={di} style={{ width: cellSize, height: cellSize }} />;
              const key = todayKey(d);
              const raw = getValue(key);
              const value = raw === true ? 1 : (raw || 0);
              const bg = cellBackground(value, t);
              const isToday = key === todayStr;
              const dateLabel = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
              const label = getAriaLabel ? getAriaLabel(key, value > 0) : `${dateLabel}${value > 0 ? " completed" : ""}`;
              const Tag = onCellClick ? "button" : "div";
              const showTooltip = () => setActiveCell({ key, label: `${dateLabel}${value > 0 ? " · done" : ""}`, x: wi * (cellSize + gap), y: di * rowHeight });
              const hideTooltip = () => setActiveCell((c) => (c && c.key === key ? null : c));
              return (
                <Tag
                  key={di}
                  className="sf-heat-cell"
                  onClick={onCellClick ? () => onCellClick(key) : undefined}
                  onMouseEnter={showTooltip}
                  onMouseLeave={hideTooltip}
                  onTouchStart={showTooltip}
                  onTouchEnd={hideTooltip}
                  onFocus={showTooltip}
                  onBlur={hideTooltip}
                  title={value > 0 ? `${dateLabel} · done` : dateLabel}
                  aria-label={label}
                  aria-pressed={onCellClick ? value > 0 : undefined}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: 4,
                    border: bg ? "none" : `1px solid ${isToday ? t.moss : t.line}`,
                    background: bg || "transparent",
                    padding: 0,
                    cursor: onCellClick ? "pointer" : "default",
                    boxSizing: "border-box",
                    outline: isToday ? `1.5px solid ${t.moss}` : "none",
                    outlineOffset: isToday ? 1 : 0,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      {activeCell && (
        <div
          style={{
            position: "absolute",
            left: (showWeekdayLabels ? 26 + gap : 0) + activeCell.x,
            top: (showMonthLabels ? 14 : 0) + activeCell.y - 28,
            transform: "translateX(-30%)",
            background: t.ink,
            color: t.bg,
            fontSize: 10.5,
            fontWeight: 600,
            padding: "4px 8px",
            borderRadius: 6,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 20,
            boxShadow: "0 3px 10px rgba(0,0,0,0.25)",
          }}
        >
          {activeCell.label}
        </div>
      )}
    </div>
  );
}
