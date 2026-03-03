'use client';

import { useMemo } from 'react';
import { F1_TEAM_COLORS } from '@/lib/data';
import { SectionTitle, Chip } from './ui';

export default function Piloti({ pilots, teams }) {
  const grouped = useMemo(() => {
    const g = {};
    pilots.forEach(p => {
      if (!g[p.team]) g[p.team] = [];
      g[p.team].push(p);
    });
    return g;
  }, [pilots]);

  return (
    <div>
      <SectionTitle>Piloti 2026</SectionTitle>
      {Object.entries(grouped).map(([team, pls]) => (
        <div key={team} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{
              width: 16, height: 16, borderRadius: 4,
              background: F1_TEAM_COLORS[team] || "#555",
            }}/>
            <span style={{
              fontWeight: 700, fontSize: 13,
              textTransform: "uppercase", letterSpacing: 1,
            }}>
              {team}
            </span>
          </div>
          {pls.map(p => {
            const ownerTeam = teams.find(t => t.id === p.owner);
            return (
              <div key={p.id} style={{
                background: "#161616", borderRadius: 10, padding: "10px 14px",
                marginBottom: 6, display: "flex", alignItems: "center", gap: 10,
                borderLeft: `3px solid ${F1_TEAM_COLORS[p.team] || "#555"}`,
              }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
                </div>
                {p.owner ? (
                  <Chip label={ownerTeam?.name || "?"} color="#e10600"/>
                ) : (
                  <Chip label="Free Agent" color="#444"/>
                )}
                {p.price > 0 && (
                  <span style={{ fontFamily: "'Orbitron'", fontSize: 12, opacity: 0.6 }}>
                    {p.price}M
                  </span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
