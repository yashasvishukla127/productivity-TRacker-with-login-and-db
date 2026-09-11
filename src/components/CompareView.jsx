import React, { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceLine } from "recharts";
import { todayKey, addDays } from "../utils/dates";
import StatCard from "./StatCard";

export default function CompareView({ t, sessions, compareDates, setCompareDates }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const year = cursor.getFullYear(); const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const selectedSet = new Set(compareDates);

  function toggleDate(dateStr) {
    setCompareDates((prev) => prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr]);
  }
  function addPreset(dayOfWeek) { // 0=Sun..6=Sat, look back 90 days
    const found = [];
    let d = new Date();
    for (let i = 0; i < 90; i++) { if (d.getDay() === dayOfWeek) found.push(todayKey(d)); d = addDays(d, -1); }
    setCompareDates((prev) => Array.from(new Set([...prev, ...found])));
  }

  const totalsByDay = {};
  sessions.forEach((s) => { totalsByDay[s.date] = (totalsByDay[s.date] || 0) + s.minutes; });
  const daysWithData = Object.keys(totalsByDay);
  const groupA = compareDates.filter((d) => totalsByDay[d]);
  const groupB = daysWithData.filter((d) => !selectedSet.has(d));
  const avg = (arr) => arr.length ? Math.round(arr.reduce((a, d) => a + totalsByDay[d], 0) / arr.length) : 0;
  const avgA = avg(groupA); const avgB = avg(groupB);
  const perDayData = [...compareDates].sort().map((d) => ({
    label: new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
    minutes: totalsByDay[d] || 0,
    weekday: new Date(d + "T00:00:00").toLocaleDateString(undefined, { weekday: "short" }),
  }));
  const compareChartWidth = Math.max(320, perDayData.length * 46);

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div style={{ fontSize: 12, color: t.sub, marginBottom: 10, lineHeight: 1.5 }}>
        Select any days — weekends, holidays, or specific dates — and see how they compare to the rest of your logged days.
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <button onClick={() => addPreset(6)} style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${t.line}`, background: "transparent", color: t.sub, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ Saturdays</button>
        <button onClick={() => addPreset(0)} style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${t.line}`, background: "transparent", color: t.sub, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ Sundays</button>
        <button onClick={() => { addPreset(6); addPreset(0); }} style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${t.line}`, background: "transparent", color: t.sub, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>+ Weekends</button>
        {compareDates.length > 0 && <button onClick={() => setCompareDates([])} style={{ padding: "6px 10px", borderRadius: 999, border: `1px solid ${t.line}`, background: "transparent", color: t.clay, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Clear</button>}
      </div>

      <div style={{ background: t.surface, borderRadius: 14, padding: "14px 12px", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} style={{ background: "none", border: "none", color: t.sub, cursor: "pointer" }}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: 12.5, fontWeight: 600 }}>{cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</span>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} style={{ background: "none", border: "none", color: t.sub, cursor: "pointer" }}><ChevronRight size={16} /></button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, fontSize: 10, color: t.sub, marginBottom: 6, textAlign: "center" }}>{["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => <span key={d}>{d}</span>)}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const dateStr = `${year}-${(month + 1).toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
            const has = !!totalsByDay[dateStr];
            const selected = selectedSet.has(dateStr);
            return (
              <button key={i} onClick={() => toggleDate(dateStr)} style={{ aspectRatio: "1", borderRadius: 8, border: `1px solid ${selected ? t.moss : t.line}`, background: selected ? t.moss : "transparent", color: selected ? t.bg : has ? t.ink : t.sub, fontSize: 11, cursor: "pointer", fontWeight: has ? 700 : 400, position: "relative" }}>
                {d}
                {has && !selected && <span style={{ position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)", width: 3, height: 3, borderRadius: "50%", background: t.clay }} />}
              </button>
            );
          })}
        </div>
      </div>

      {compareDates.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 14 }}>
          {compareDates.sort().map((d) => (
            <span key={d} onClick={() => toggleDate(d)} style={{ fontSize: 10.5, background: t.moss + "22", color: t.moss, padding: "3px 8px", borderRadius: 999, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
              {new Date(d + "T00:00:00").toLocaleDateString(undefined, { day: "2-digit", month: "short" })} <X size={10} />
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <StatCard t={t} label={`Selected avg (${groupA.length})`} value={`${avgA}m`} accent={t.clay} />
        <StatCard t={t} label={`Other days avg (${groupB.length})`} value={`${avgB}m`} accent={t.moss} />
      </div>

      {perDayData.length > 0 ? (
        <div className="sf-scroll" style={{ height: 190, background: t.surface, borderRadius: 14, padding: "12px 4px 0", overflowX: "auto" }}>
          <div style={{ width: compareChartWidth, height: "100%" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perDayData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGradClay" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={t.clay} stopOpacity={1} />
                    <stop offset="100%" stopColor={t.clay} stopOpacity={0.55} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke={t.line} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: t.sub }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: t.sub }} axisLine={false} tickLine={false} width={30} />
                <Tooltip cursor={{ fill: t.line, opacity: 0.4 }} contentStyle={{ background: t.surface, border: `1px solid ${t.line}`, borderRadius: 8, fontSize: 12 }} formatter={(v, n, p) => [`${v} min`, p.payload.weekday]} />
                {avgB > 0 && <ReferenceLine y={avgB} stroke={t.moss} strokeDasharray="4 3" label={{ value: `Other days avg (${avgB}m)`, position: "insideTopRight", fill: t.moss, fontSize: 10 }} />}
                <Bar dataKey="minutes" fill="url(#barGradClay)" radius={[3, 3, 0, 0]} maxBarSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div style={{ background: t.surface, borderRadius: 14, padding: 20, textAlign: "center", fontSize: 12.5, color: t.sub }}>Select days above to see each one plotted here.</div>
      )}
      {perDayData.length > 6 && <div style={{ fontSize: 10.5, color: t.sub, marginTop: 8 }}>Scroll to see all {perDayData.length} selected days.</div>}
      <div style={{ fontSize: 10.5, color: t.sub, marginTop: 8 }}>Dot under a date means you logged focus time that day. Tap dates to add or remove them from your selection.</div>
    </div>
  );
}
