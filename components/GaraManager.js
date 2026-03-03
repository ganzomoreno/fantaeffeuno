'use client';

import { CALENDAR, POINTS_TABLE } from '@/lib/data';
import { SectionTitle } from './ui';

export default function GaraManager({ races, pilots, teams, lineups, setLineups, calendar, currentUser }) {
  const raceEvents = calendar.map((ev, i) => ({ ...ev, index: i })).filter(ev => ev.type === "race");
  const completedIndexes = new Set(races.map(r => r.calendarIndex));
  const nextRace = raceEvents.find(ev => !completedIndexes.has(ev.index));

  if (!nextRace) {
    return (
      <div>
        <SectionTitle>Gara</SectionTitle>
        <div style={{ textAlign: "center", padding: 40, opacity: 0.4 }}>
          {races.length === 0
            ? "Nessuna gara disponibile. Usa il pannello Admin per gestire."
            : "Tutte le gare sono state completate!"}
        </div>
      </div>
    );
  }

  const togglePilot = (teamId, pilotId) => {
    const rKey = `race_${nextRace.index}`;
    const raceLineups = { ...(lineups[rKey] || {}) };
    let tLineup = [...(raceLineups[teamId] || [])];
    if (tLineup.includes(pilotId)) {
      tLineup = tLineup.filter(x => x !== pilotId);
    } else if (tLineup.length < 3) {
      tLineup.push(pilotId);
    }
    raceLineups[teamId] = tLineup;
    setLineups({ ...lineups, [rKey]: raceLineups });
  };

  return (
    <div>
      <SectionTitle>Prossima Gara: {nextRace.location}</SectionTitle>
      <div style={{
        background: "#161616", borderRadius: 12, padding: 16,
        marginBottom: 16, borderLeft: "3px solid #e10600",
      }}>
        <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 4 }}>{nextRace.date}</div>
        <div style={{
          fontWeight: 700, fontSize: 18, fontFamily: "'Orbitron'",
        }}>
          {nextRace.location}
        </div>
      </div>

      <SectionTitle sub>La Tua Formazione</SectionTitle>
      <p style={{ fontSize: 12, opacity: 0.5, marginBottom: 12 }}>
        Seleziona 3 piloti da schierare. Il 4° resta in panchina.
      </p>

      {/* Show only own team unless admin */}
      {(currentUser?.isAdmin ? teams : teams.filter(t => t.id === currentUser?.id)).map(t => {
        const teamPilots = pilots.filter(p => p.owner === t.id);
        const currentLineup = (lineups[`race_${nextRace.index}`] || {})[t.id] || [];
        const isOwnTeam = t.id === currentUser?.id;

        return (
          <div key={t.id} style={{
            background: "#161616", borderRadius: 10, padding: 12, marginBottom: 8,
            border: currentLineup.length === 3 ? "1px solid #2a6e2a" : "1px solid #333",
          }}>
            <div style={{
              fontWeight: 700, fontSize: 13, marginBottom: 8,
              display: "flex", justifyContent: "space-between",
            }}>
              <span>
                {t.name}
                {currentUser?.isAdmin && !isOwnTeam && (
                  <span style={{ fontSize: 10, fontWeight: 400, color: "#555", marginLeft: 8 }}>({t.owner})</span>
                )}
              </span>
              <span style={{
                fontSize: 11,
                color: currentLineup.length === 3 ? "#4ade80" : "#e10600",
              }}>
                {currentLineup.length}/3
              </span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {teamPilots.map(p => {
                const selected = currentLineup.includes(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => isOwnTeam || currentUser?.isAdmin ? togglePilot(t.id, p.id) : null}
                    style={{
                      padding: "6px 12px", borderRadius: 20,
                      border: selected ? "1px solid #4ade80" : "1px solid #333",
                      background: selected ? "rgba(74,222,128,0.15)" : "#222",
                      color: selected ? "#4ade80" : "#aaa",
                      fontSize: 12, fontWeight: 600,
                      cursor: (isOwnTeam || currentUser?.isAdmin) ? "pointer" : "default",
                      transition: "all 0.2s",
                      opacity: (!isOwnTeam && !currentUser?.isAdmin) ? 0.5 : 1,
                    }}
                  >
                    {selected && "✓ "}{p.name}
                  </button>
                );
              })}
              {teamPilots.length === 0 && (
                <span style={{ fontSize: 12, opacity: 0.3 }}>Nessun pilota assegnato</span>
              )}
            </div>
          </div>
        );
      })}

      {/* If non-admin and team has no pilots yet */}
      {!currentUser?.isAdmin && pilots.filter(p => p.owner === currentUser?.id).length === 0 && (
        <div style={{
          background: "rgba(225,6,0,0.05)",
          border: "1px solid rgba(225,6,0,0.15)",
          borderRadius: 10,
          padding: 16,
          fontSize: 12,
          color: "#888",
          textAlign: "center",
        }}>
          Nessun pilota assegnato alla tua squadra. Attendi l&apos;asta!
        </div>
      )}

      {/* Past results */}
      {races.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <SectionTitle sub>Risultati Gare</SectionTitle>
          {races.map((r, i) => {
            const ev = calendar[r.calendarIndex];
            return (
              <div key={i} style={{
                background: "#161616", borderRadius: 10, padding: 12, marginBottom: 8,
              }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>🏁 {ev?.location || "Gara"}</div>
                <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 6 }}>{ev?.date}</div>
                {r.results?.slice(0, 10).map((res, j) => {
                  const pilot = pilots.find(p => p.id === res.pilotId);
                  return (
                    <div key={j} style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "3px 0", fontSize: 12,
                    }}>
                      <span style={{
                        fontFamily: "'Orbitron'", fontWeight: 700,
                        width: 24, color: j < 3 ? "#FFD700" : "#888",
                      }}>
                        P{res.position}
                      </span>
                      <span style={{ flex: 1 }}>{pilot?.name || "?"}</span>
                      <span style={{ opacity: 0.5 }}>{POINTS_TABLE[res.position] || 0} pts</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
