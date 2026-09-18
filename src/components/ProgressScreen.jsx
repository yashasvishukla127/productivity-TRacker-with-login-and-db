import React, { useState } from "react";
import { Flame, Plus } from "lucide-react";
import StatCard from "./StatCard";
import RecordsView from "./RecordsView";
import GoalCalendar from "./GoalCalendar";
import CompareView from "./CompareView";

export default function ProgressScreen({
  t,
  sessions,
  setSessions,
  totalToday,
  totalAll,
  streak,
  sessionCountToday,
  dailyGoalMinutes,
  setDailyGoalMinutes,
  onLogTime,
  compareDates,
  setCompareDates,
  sleepSettings,
  tasks = []
}) {
  const [tab, setTab] = useState("records");

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <StatCard t={t} label="Today" value={`${totalToday}m`} />
        <StatCard t={t} label="Sessions" value={sessionCountToday} />
        <StatCard t={t} label="Streak" value={streak} icon={<Flame size={13} />} accent={t.clay} />
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: t.surface, borderRadius: 10, padding: 3, flexWrap: "wrap" }}>
        {[{ k: "records", label: "Records" }, { k: "goal", label: "Goal" }, { k: "compare", label: "Compare" }].map(({ k, label }) => (
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

      {tab === "records" && (
        <RecordsView
          t={t}
          sessions={sessions}
          setSessions={setSessions}
          sleepSettings={sleepSettings}
          tasks={tasks}
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
