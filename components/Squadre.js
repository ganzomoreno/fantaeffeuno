'use client';

import { useState, useMemo } from 'react';
import { MAX_SWITCHES, F1_TEAM_COLORS } from '@/lib/data';

const C = {
  surface:  '#14151C',
  surface2: '#1A1B24',
  border:   '#2A2D3A',
  textPri:  '#EDEEF3',
  textSec:  '#A9ABBA',
  red:      '#E10600',
  green:    '#00FF41',
  amber:    '#FFB700',
};

export default function Squadre({ teams, pilots, scores, currentUser, lineups, calendar, races, onTogglePilot }) {
  const [expandedTeam, setExpandedTeam] = useState(null);

  // Determine next race
  const completedSet = useMemo(() => new Set(races.map(r => r.calendarIndex)), [races]);
  const nextRaceIdx  = useMemo(
    () => calendar.findIndex((ev, i) => ev.type === 'race' && !completedSet.has(i)),
    [calendar, completedSet]
  );
  const nextRaceEvent = nextRaceIdx >= 0 ? calendar[nextRaceIdx] : null;

  // My team data
  const myTeam   = useMemo(() => teams.find(t => t.id === currentUser?.id), [teams, currentUser]);
  const myPilots = useMemo(() => pilots.filter(p => p.owner === currentUser?.id), [pilots, currentUser]);
  const myLineup = nextRaceIdx >= 0 ? (lineups[`race_${nextRaceIdx}`] || {})[currentUser?.id] || [] : [];
  const lineupConfirmed = myLineup.length === 3;
  const isLocked = nextRaceIdx >= 0 && completedSet.has(nextRaceIdx);

  const handleToggle = (pilotId) => {
    if (isLocked || nextRaceIdx < 0) return;
    onTogglePilot?.(nextRaceIdx, currentUser.id, pilotId);
  };

  // Other teams (for the secondary list)
  const otherTeams = useMemo(() => teams.filter(t => t.id !== currentUser?.id), [teams, currentUser]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── HEADER: My Team ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: C.textSec }}>LA TUA SCUDERIA</div>
          <div style={{ fontFamily: "'Orbitron', monospace", fontWeight: 900, fontSize: 18, color: C.textPri, marginTop: 2 }}>
            {myTeam?.name || '—'}
          </div>
          <div style={{ fontSize: 11, color: C.textSec, marginTop: 2 }}>{myTeam?.owner}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: C.surface2, color: C.textSec, border: `1px solid ${C.border}` }}>
            Switch {myTeam?.switchesUsed || 0}/{MAX_SWITCHES}
          </span>
          <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: C.surface2, color: C.textSec, border: `1px solid ${C.border}` }}>
            {myTeam?.budget || 0}M budget
          </span>
          {nextRaceEvent && (
            <span style={{
              padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
              background: isLocked ? C.red + '22' : lineupConfirmed ? C.green + '22' : C.amber + '22',
              color: isLocked ? C.red : lineupConfirmed ? C.green : C.amber,
              border: `1px solid ${isLocked ? C.red + '55' : lineupConfirmed ? C.green + '55' : C.amber + '55'}`,
            }}>
              {isLocked ? '🔒 LOCKED' : lineupConfirmed ? '✓ CONFERMATA' : '⚠ DA IMPOSTARE'}
            </span>
          )}
        </div>
      </div>

      {/* ── SECTION A: Lineup Builder ─────────────────────────────────────────── */}
      <div style={{ background: C.surface, border: `1px solid ${lineupConfirmed && !isLocked ? C.green + '44' : C.border}`, borderRadius: 12, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.textSec, marginBottom: 4 }}>
          SCHIERAMENTO — {nextRaceEvent ? nextRaceEvent.location : 'Nessuna gara disponibile'}
        </div>
        {nextRaceEvent && (
          <div style={{ fontSize: 11, color: C.textSec, marginBottom: 14 }}>{nextRaceEvent.date}</div>
        )}

        {/* 3 titolare slots */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
          {[0,1,2].map(i => {
            const pilotId = myLineup[i];
            const pilot   = pilotId ? pilots.find(p => p.id === pilotId) : null;
            return (
              <div key={i} style={{
                borderRadius: 10, padding: '10px 8px', textAlign: 'center',
                background: pilot ? C.green + '15' : C.surface2,
                border: `1px solid ${pilot ? C.green + '55' : C.border}`,
                borderStyle: pilot ? 'solid' : 'dashed',
                minHeight: 64,
              }}>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 1, color: C.textSec, marginBottom: 6 }}>
                  TITOLARE {i+1}
                </div>
                {pilot ? (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 12, color: C.textPri, lineHeight: 1.3 }}>{pilot.name}</div>
                    <div style={{ fontSize: 10, color: C.textSec, marginTop: 2 }}>{pilot.team}</div>
                  </>
                ) : (
                  <div style={{ fontSize: 11, color: C.border }}>— vuoto —</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Panchina slot: solo se 4 piloti E 3 titolari già impostati */}
        {myPilots.length === 4 && lineupConfirmed && (() => {
          const benchPilot = myPilots.find(p => !myLineup.includes(p.id));
          if (!benchPilot) return null;
          return (
            <div style={{
              borderRadius: 10, padding: '8px 12px', marginBottom: 12,
              background: C.surface2, border: `1px solid ${C.border}`,
              display: 'flex', alignItems: 'center', gap: 10,
            }}>
              <span style={{ fontSize: 11, color: C.textSec }}>🪑 PANCHINA:</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: C.textPri }}>
                {benchPilot.name}
              </span>
              <span style={{ fontSize: 10, color: C.textSec }}>{benchPilot.team}</span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: C.textSec }}>
                Auto-entra in caso di DNF
              </span>
            </div>
          );
        })()}

        {/* Info regola */}
        <div style={{ fontSize: 10, color: C.textSec, marginBottom: 12, padding: '6px 10px', background: C.surface2, borderRadius: 8, lineHeight: 1.5 }}>
          ⚡ 3 titolari obbligatori · DNF → entra panchina · Mancato schieramento = −5 punti
        </div>

        {isLocked && (
          <div style={{ textAlign: 'center', padding: '10px', background: C.red + '15', borderRadius: 8, border: `1px solid ${C.red}33`, fontSize: 12, color: C.red }}>
            🔒 Formazione bloccata — gara completata
          </div>
        )}
      </div>

      {/* ── SECTION B: Pilot Roster (tap to toggle lineup) ────────────────────── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.textSec, marginBottom: 10 }}>
          ROSA PILOTI ({myPilots.length})
        </div>

        {myPilots.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, color: C.textSec, fontSize: 13 }}>
            Nessun pilota assegnato. Attendi la prossima asta!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {myPilots.map(p => {
              const inLineup = myLineup.includes(p.id);
              const isBench  = myPilots.length === 4 && !inLineup && myLineup.length === 3;
              const canAdd   = !inLineup && myLineup.length < 3 && !isLocked && nextRaceIdx >= 0;
              const canRemove = inLineup && !isLocked && nextRaceIdx >= 0;
              const teamColor = F1_TEAM_COLORS[p.team] || '#555';

              return (
                <div
                  key={p.id}
                  onClick={() => (canAdd || canRemove) && handleToggle(p.id)}
                  style={{
                    background: inLineup ? C.green + '12' : C.surface,
                    border: `1px solid ${inLineup ? C.green + '55' : isBench ? C.border : C.border}`,
                    borderRadius: 10, padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    cursor: (canAdd || canRemove) ? 'pointer' : 'default',
                    opacity: isLocked ? 0.7 : 1,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ width: 4, height: 36, borderRadius: 2, background: teamColor, flexShrink: 0 }}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.textPri }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: C.textSec }}>{p.team} · {p.price}M</div>
                  </div>
                  <div style={{ flexShrink: 0 }}>
                    {inLineup && (
                      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: C.green + '22', color: C.green, border: `1px solid ${C.green}44`, fontWeight: 700 }}>
                        TITOLARE
                      </span>
                    )}
                    {isBench && (
                      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: C.surface2, color: C.textSec, border: `1px solid ${C.border}`, fontWeight: 700 }}>
                        PANCHINA
                      </span>
                    )}
                    {!inLineup && !isBench && nextRaceIdx >= 0 && !isLocked && (
                      <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: C.surface2, color: C.textSec, border: `1px dashed ${C.border}` }}>
                        + AGGIUNGI
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── ALTRE SQUADRE ─────────────────────────────────────────────────────── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.textSec, marginBottom: 10 }}>
          ALTRE SQUADRE
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {otherTeams.map(t => {
            const tPilots = pilots.filter(p => p.owner === t.id);
            const open    = expandedTeam === t.id;
            return (
              <div key={t.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <div
                  onClick={() => setExpandedTeam(open ? null : t.id)}
                  style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                    background: 'linear-gradient(135deg, #e10600, #900)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Orbitron', monospace", fontWeight: 900, fontSize: 14,
                  }}>
                    {t.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.textPri }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: C.textSec }}>{t.owner} · {tPilots.length} piloti</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontFamily: "'Orbitron'", fontWeight: 700, color: C.red, fontSize: 15 }}>
                      {(scores[t.id] || 0).toFixed(1)}
                    </span>
                    <span style={{ fontSize: 16, transition: '0.2s', transform: open ? 'rotate(180deg)' : 'none', color: C.textSec }}>▾</span>
                  </div>
                </div>
                {open && (
                  <div style={{ padding: '0 14px 12px', borderTop: `1px solid ${C.border}` }}>
                    {tPilots.length === 0 ? (
                      <p style={{ color: C.textSec, fontSize: 12, margin: '10px 0' }}>Nessun pilota assegnato</p>
                    ) : tPilots.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${C.surface2}` }}>
                        <div style={{ width: 4, height: 26, borderRadius: 2, background: F1_TEAM_COLORS[p.team] || '#555', flexShrink: 0 }}/>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, color: C.textPri }}>{p.name}</div>
                          <div style={{ fontSize: 10, color: C.textSec }}>{p.team} · {p.price}M</div>
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

    </div>
  );
}
