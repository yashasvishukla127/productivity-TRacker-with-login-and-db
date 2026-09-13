import React from "react";
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

/**
 * Minimalist week-column heatmap for consistency tracking.
 *
 * days:        chronological (oldest first) array of Date objects to plot.
 * getValue:    (dateKey) => 0..1 (or boolean) completion for that day.
 * onCellClick: optional (dateKey) => void — omit for a read-only/aggregate view.
 * cellSize/gap: pixel sizes, so the same component can be full-size (overview)
 *               or shrunk down (per-task rows).
 */
export default function ConsistencyHeatmap({ t, days, getValue, onCellClick, getAriaLabel, cellSize = 11, gap = 3, showMonthLabels = true }) {
  const weeks = buildWeeks(days);
  const todayStr = todayKey();
  let lastMonth = null;

  return (
    <div style={{ display: "inline-flex", flexDirection: "column", gap: 3 }}>
      {showMonthLabels && (
        <div style={{ display: "flex", gap }}>
          {weeks.map((week, wi) => {
            const firstDay = week.find(Boolean);
            const month = firstDay ? firstDay.getMonth() : null;
            const label = firstDay && month !== lastMonth ? firstDay.toLocaleDateString(undefined, { month: "short" }) : "";
            if (firstDay) lastMonth = month;
            return (
              <div key={wi} style={{ width: cellSize, fontSize: 8.5, color: t.sub, textAlign: "left", whiteSpace: "nowrap", overflow: "visible" }}>
                {label}
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: "flex", gap }}>
        {weeks.map((week, wi) => (
          <div key={wi} style={{ display: "flex", flexDirection: "column", gap }}>
            {week.map((d, di) => {
              if (!d) return <div key={di} style={{ width: cellSize, height: cellSize }} />;
              const key = todayKey(d);
              const raw = getValue(key);
              const value = raw === true ? 1 : (raw || 0);
              const alpha = alphaForValue(value);
              const isToday = key === todayStr;
              const dateLabel = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
              const label = getAriaLabel ? getAriaLabel(key, value > 0) : `${dateLabel}${value > 0 ? " completed" : ""}`;
              const Tag = onCellClick ? "button" : "div";
              return (
                <Tag
                  key={di}
                  onClick={onCellClick ? () => onCellClick(key) : undefined}
                  title={value > 0 ? `${dateLabel} · done` : dateLabel}
                  aria-label={label}
                  aria-pressed={onCellClick ? value > 0 : undefined}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: 3,
                    border: alpha ? "none" : `1px solid ${isToday ? t.moss : t.line}`,
                    background: alpha ? t.moss + alpha : "transparent",
                    padding: 0,
                    cursor: onCellClick ? "pointer" : "default",
                    boxSizing: "border-box",
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
