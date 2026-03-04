'use client';

import { SectionTitle } from './ui';
import DevelopmentPlan from './DevelopmentPlan';

const MEDALS = ["#FFD700", "#C0C0C0", "#CD7F32"];

export default function Classifica({ teams, scores, races }) {
  return (
    <div>
      <DevelopmentPlan />
      <SectionTitle>Classifica Generale</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {teams.map((t, i) => (
          <div key={t.id} style={{
            background: i === 0
              ? "linear-gradient(135deg, rgba(225,6,0,0.2), rgba(255,215,0,0.05))"
              : "#161616",
            border: `1px solid ${i < 3 ? MEDALS[i] + "44" : "#222"}`,
            borderRadius: 12,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            transition: "all 0.3s",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: i < 3 ? MEDALS[i] : "#333",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Orbitron', monospace",
              fontWeight: 900, fontSize: 16,
              color: i < 3 ? "#000" : "#888",
            }}>
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{t.name}</div>
              <div style={{ fontSize: 12, opacity: 0.5 }}>{t.owner}</div>
            </div>
            <div style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: 22, fontWeight: 900,
              color: i === 0 ? "#e10600" : "#fff",
            }}>
              {(scores[t.id] || 0).toFixed(1)}
            </div>
          </div>
        ))}
      </div>
      {races.length === 0 && (
        <div style={{ textAlign: "center", padding: 40, opacity: 0.4 }}>
          <p style={{ fontSize: 14 }}>Nessuna gara ancora disputata.</p>
          <p style={{ fontSize: 12 }}>Vai nella sezione Admin per inserire i risultati.</p>
        </div>
      )}
    </div>
  );
}
