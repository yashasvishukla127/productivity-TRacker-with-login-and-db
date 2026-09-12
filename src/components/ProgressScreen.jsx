
import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { Flame, Plus } from "lucide-react";
import { RANGES } from "../theme";
import { todayKey, dayLabel, addDays } from "../utils/dates";
import StatCard from "./StatCard";
import RecordsView from "./RecordsView";
import GoalCalendar from "./GoalCalendar";
import CompareView from "./CompareView";

const RANGE_DAYS = { "7d": 7, "1m": 30, "3m": 90, "6m": 180 };

function buildRangeData(range, sessions) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const n = RANGE_DAYS[range];
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(today, -(n - 1 - i));
    const key = todayKey(d);
    const minutes = sessions.filter((s) => s.date === key).reduce((a, s) => a + s.minutes, 0);
    const label = range === "7d" ? dayLabel(key) : d.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
    return { label, minutes, dateStr: key };
  });
}

function tickIntervalFor(range) {
  if (range === "7d") return 0;
  if (range === "1m") return 3;
  if (range === "3m") return 9;
  return 19; // 6m
}

function formatMinutes(v, unit) {
  if (unit === "min") return `${Math.round(v)}`;
  return (v / 60).toFixed(v % 60 === 0 ? 0 : 1);
}

function computeRangeStats(range, sessions, dailyGoalMinutes) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const n = RANGE_DAYS[range];
  const totalsByDay = {};
  sessions.forEach((s) => { totalsByDay[s.date] = (totalsByDay[s.date] || 0) + s.minutes; });
  let activeDays = 0; let goalHitDays = 0;
  for (let i = 0; i < n; i++) {
    const key = todayKey(addDays(today, -i));
    const minutes = totalsByDay[key] || 0;
    if (minutes > 0) activeDays++;
    if (minutes >= dailyGoalMinutes) goalHitDays++;
  }
  return { totalDays: n, activeDays, gapDays: n - activeDays, goalHitDays };
}

export default function ProgressScreen({ t, sessions, totalToday, totalAll, streak, sessionCountToday, dailyGoalMinutes, setDailyGoalMinutes, onLogTime, compareDates, setCompareDates, sleepSettings }) {
  const [tab, setTab] = useState("chart");
  const [range, setRange] = useState("7d");
  const [chartUnit, setChartUnit] = useState("hr"); // "hr" | "min"

  const rangeData = buildRangeData(range, sessions);
  const rangeStats = computeRangeStats(range, sessions, dailyGoalMinutes);
  const tickInterval = tickIntervalFor(range);
  const barPxWidth = range === "7d" ? 40 : range === "1m" ? 14 : range === "3m" ? 6 : 3.4;
  const chartPxWidth = Math.max(320, rangeData.length * barPxWidth);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <StatCard t={t} label="Today" value={`${totalToday}m`} />
        <StatCard t={t} label="Sessions" value={sessionCountToday} />
        <StatCard t={t} label="Streak" value={streak} icon={<Flame size={13} />} accent={t.clay} />
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: t.surface, borderRadius: 10, padding: 3, flexWrap: "wrap" }}>
        {[{ k: "chart", label: "Chart" }, { k: "records", label: "Records" }, { k: "goal", label: "Goal" }, { k: "compare", label: "Compare" }].map(({ k, label }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              flex: 1,
              minWidth: 56,
              padding: "7px 0",
              borderRadius: 8,
              border: "none",
              background: tab === k ? t.bg : "transparent",
              color: tab === k ? t.ink : t.sub,
              fontSize: 11.5,
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: tab === k ? "0 1px 3px rgba(0,0,0,0.08)" : "none"
            }}
          >
            {label}
          </button>
        ))}

        <button
          onClick={onLogTime}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            padding: "7px 10px",
            borderRadius: 8,
            border: "none",
            background: "transparent",
            color: t.moss,
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap"
          }}
        >
          <Plus size={13} /> Log
        </button>
      </div>

      {tab === "chart" && (
        <div>
          {/* Date range selector */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                style={{
                  flex: 1,
                  padding: "6px 4px",
                  borderRadius: 999,
                  border: `1px solid ${range === r.key ? t.moss : t.line}`,
                  background: range === r.key ? t.moss : "transparent",
                  color: range === r.key ? t.bg : t.sub,
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <StatCard
              t={t}
              label="Active days"
              value={`${rangeStats.activeDays} / ${rangeStats.totalDays}`}
              accent={t.moss}
            />
            <StatCard
              t={t}
              label="Days lost to gaps"
              value={rangeStats.gapDays}
              accent={t.clay}
            />
            <StatCard
              t={t}
              label={`Hit ${(dailyGoalMinutes / 60).toFixed(dailyGoalMinutes % 60 ? 1 : 0)}h target`}
              value={`${rangeStats.goalHitDays} / ${rangeStats.totalDays}`}
              accent={t.moss}
            />
          </div>

          <div style={{ fontSize: 10.5, color: t.sub, marginBottom: 14 }}>
            Change your daily target in the <strong>Goal</strong> tab above, or in Settings.
          </div>

          {/* Chart */}
          <div
            className="sf-scroll"
            style={{
              height: 180,
              marginBottom: 10,
              background: t.surface,
              borderRadius: 14,
              padding: "12px 4px 0",
              overflowX: "auto"
            }}
          >
            <div style={{ width: chartPxWidth, height: "100%" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rangeData}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="barGradMoss" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={t.moss} stopOpacity={1} />
                      <stop offset="100%" stopColor={t.moss} stopOpacity={0.55} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    vertical={false}
                    stroke={t.line}
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 9.5, fill: t.sub }}
                    axisLine={false}
                    tickLine={false}
                    interval={tickInterval}
                  />

                  <YAxis
                    tick={{ fontSize: 10, fill: t.sub }}
                    axisLine={false}
                    tickLine={false}
                    width={30}
                    tickFormatter={(v) => formatMinutes(v, chartUnit)}
                  />

                  <Tooltip
                    cursor={{ fill: t.line, opacity: 0.4 }}
                    contentStyle={{
                      background: t.surface,
                      border: `1px solid ${t.line}`,
                      borderRadius: 8,
                      fontSize: 12
                    }}
                    formatter={(v) => [
                      `${formatMinutes(v, chartUnit)}${chartUnit === "hr" ? "h" : " min"}`,
                      "Focused"
                    ]}
                  />

                  <Bar
                    dataKey="minutes"
                    fill="url(#barGradMoss)"
                    radius={[3, 3, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {range !== "7d" && (
            <div
              style={{
                fontSize: 10.5,
                color: t.sub,
                marginTop: 0,
                marginBottom: 10
              }}
            >
              Scroll to see every day in this range.
            </div>
          )}

          {/* Minimal Hours / Minutes toggle */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 12
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: 2,
                border: `1px solid ${t.line}`,
                borderRadius: 7,
                background: t.surface
              }}
            >
              <button
                onClick={() => setChartUnit("hr")}
                style={{
                  border: "none",
                  borderRadius: 5,
                  padding: "4px 8px",
                  background: chartUnit === "hr" ? t.bg : "transparent",
                  color: chartUnit === "hr" ? t.ink : t.sub,
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: "pointer",
                  lineHeight: 1.2
                }}
              >
                Hours
              </button>

              <button
                onClick={() => setChartUnit("min")}
                style={{
                  border: "none",
                  borderRadius: 5,
                  padding: "4px 8px",
                  background: chartUnit === "min" ? t.bg : "transparent",
                  color: chartUnit === "min" ? t.ink : t.sub,
                  fontSize: 10,
                  fontWeight: 600,
                  cursor: "pointer",
                  lineHeight: 1.2
                }}
              >
                Minutes
              </button>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "14px 4px",
              borderTop: `1px solid ${t.line}`
            }}
          >
            <span style={{ fontSize: 13, color: t.sub }}>
              All-time focused
            </span>

            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {Math.floor(totalAll / 60)}h {totalAll % 60}m
            </span>
          </div>
        </div>
      )}

      {tab === "records" && (
        <RecordsView
          t={t}
          sessions={sessions}
          sleepSettings={sleepSettings}
        />
      )}

      {tab === "goal" && (
        <GoalCalendar
          t={t}
          sessions={sessions}
          dailyGoalMinutes={dailyGoalMinutes}
          setDailyGoalMinutes={setDailyGoalMinutes}
        />
      )}

      {tab === "compare" && (
        <CompareView
          t={t}
          sessions={sessions}
          compareDates={compareDates}
          setCompareDates={setCompareDates}
        />
      )}
    </div>
  );
}

