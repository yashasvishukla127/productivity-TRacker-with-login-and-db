import React from "react";

export default function StatCard({ t, label, value, icon, accent }) {
  return (
    <div style={{ flex: 1, background: t.surface, borderRadius: 14, padding: "14px 10px", textAlign: "center", minWidth: 0, borderTop: `2.5px solid ${accent || t.moss}`, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 19, fontWeight: 700, fontFamily: "Georgia,serif", color: accent || t.ink }}>{icon}{value}</div>
      <div style={{ fontSize: 10, color: t.sub, marginTop: 2, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
    </div>
  );
}
