import React, { useState } from "react";
import ChartSection from "./ChartSection";
import ConsistencySection from "./ConsistencySection";

export default function ChartConsistencyScreen({
  t,
  sessions,
  totalAll,
  dailyGoalMinutes,
  tasks,
  consistencyTasks,
  setConsistencyTasks
}) {
  const [tab, setTab] = useState("chart");

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: t.surface, borderRadius: 10, padding: 3 }}>
        {[{ k: "chart", label: "Chart" }, { k: "consistency", label: "Consistency" }].map(({ k, label }) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, minWidth: 56, padding: "7px 0", borderRadius: 8, border: "none", background: tab === k ? t.bg : "transparent", color: tab === k ? t.ink : t.sub, fontSize: 11.5, fontWeight: 600, cursor: "pointer", boxShadow: tab === k ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>{label}</button>
        ))}
      </div>

      {tab === "chart" && (
        <ChartSection t={t} sessions={sessions} totalAll={totalAll} dailyGoalMinutes={dailyGoalMinutes} tasks={tasks} />
      )}

      {tab === "consistency" && (
        <ConsistencySection t={t} consistencyTasks={consistencyTasks} setConsistencyTasks={setConsistencyTasks} />
      )}
    </div>
  );
}
