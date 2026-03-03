'use client';

import { useState } from 'react';
import { MAX_SWITCHES, F1_TEAM_COLORS } from '@/lib/data';
import { SectionTitle, Chip } from './ui';

export default function Squadre({ teams, pilots, scores }) {
  const [expanded, setExpanded] = useState(null);

  return (
    <div>
      <SectionTitle>Squadre</SectionTitle>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {teams.map(t => {
          const teamPilots = pilots.filter(p => p.owner === t.id);
          const open = expanded === t.id;

          return (
            <div key={t.id} style={{
              background: "#161616", borderRadius: 12,
              border: "1px solid #222", overflow: "hidden",
            }}>
              <div
                onClick={() => setExpanded(open ? null : t.id)}
                style={{
                  padding: "14px 16px", cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 12,
                }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 10,
                  background: "linear-gradient(135deg, #e10600, #900)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Orbitron', monospace", fontWeight: 900, fontSize: 16,
                }}>
                  {t.name.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.5 }}>
                    {t.owner} · {teamPilots.length} piloti · Budget: {t.budget}M
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "'Orbitron'", fontWeight: 700, color: "#e10600" }}>
                    {(scores[t.id] || 0).toFixed(1)}
                  </span>
                  <span style={{
                    fontSize: 18,
                    transform: open ? "rotate(180deg)" : "none",
                    transition: "0.2s",
                  }}>
                    ▾
                  </span>
                </div>
              </div>

              {open && (
                <div style={{ padding: "0 16px 14px", borderTop: "1px solid #222" }}>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "12px 0 8px" }}>
                    <Chip label={`Switch usati: ${t.switchesUsed}/${MAX_SWITCHES}`} color="#555"/>
                    <Chip label={`Budget: ${t.budget}M`} color="#e10600"/>
                  </div>
                  {teamPilots.length === 0 ? (
                    <p style={{ opacity: 0.4, fontSize: 13, margin: "8px 0" }}>Nessun pilota assegnato</p>
                  ) : teamPilots.map(p => (
                    <div key={p.id} style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 0", borderBottom: "1px solid #1a1a1a",
                    }}>
                      <div style={{
                        width: 6, height: 28, borderRadius: 3,
                        background: F1_TEAM_COLORS[p.team] || "#555",
                      }}/>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                        <div style={{ fontSize: 11, opacity: 0.5 }}>{p.team} · {p.price}M</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
