'use client';

import { useState, useMemo } from 'react';
import { calculatePilotPoints, calculateRaceTeamScore, getRaceBreakdown } from '@/lib/scoring';
import { F1_TEAM_COLORS, POINTS_TABLE } from '@/lib/data';

const C = {
  surface: '#14151C',
  surface2: '#1A1B24',
  border: '#2A2D3A',
  textPri: '#EDEEF3',
  textSec: '#A9ABBA',
  red: '#E10600',
  green: '#00FF41',
  amber: '#FFB700',
};

const MEDALS = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function GaraManager({ races, pilots, teams, lineups, reserves, calendar, currentUser }) {
  const [selectedRaceIdx, setSelectedRaceIdx] = useState(() => races.length > 0 ? races.length - 1 : 0);
  const [view, setView] = useState('squadre'); // 'squadre' | 'piloti'
  const [expandedTeam, setExpandedTeam] = useState(null);

  const selectedRace = races[selectedRaceIdx] ?? null;
  const selectedEvent = selectedRace ? calendar[selectedRace.calendarIndex] : null;

  // Per-race team leaderboard
  const raceLeaderboard = useMemo(() => {
    if (!selectedRace) return [];
    return teams
      .map(t => ({ team: t, score: calculateRaceTeamScore(selectedRace, lineups, reserves, pilots, t.id) }))
      .sort((a, b) => b.score - a.score);
  }, [selectedRace, teams, lineups, reserves, pilots]);

  // Total scores for delta column
  const totalScores = useMemo(() => {
    const s = {};
    teams.forEach(t => { s[t.id] = 0; });
    races.forEach(r => { teams.forEach(t => { s[t.id] += calculateRaceTeamScore(r, lineups, reserves, pilots, t.id); }); });
    return s;
  }, [races, teams, lineups, reserves, pilots]);

  // Pilot leaderboard for selected race
  const pilotLeaderboard = useMemo(() => {
    if (!selectedRace) return [];
    return getRaceBreakdown(selectedRace, pilots).filter(p => p.points > 0 || p.dnf);
  }, [selectedRace, pilots]);

  if (races.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: C.textSec, fontSize: 13 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🏁</div>
        Nessuna gara ancora disputata.
        <br />
        <span style={{ fontSize: 11 }}>Inserisci i risultati dal pannello Admin.</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── TOP CONTROLS ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Race selector */}
        <select
          value={selectedRaceIdx}
          onChange={e => { setSelectedRaceIdx(Number(e.target.value)); setExpandedTeam(null); }}
          style={{
            flex: 1, minWidth: 160,
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
            color: C.textPri, padding: '9px 12px', fontSize: 13,
          }}
        >
          {races.map((r, i) => {
            const ev = calendar[r.calendarIndex];
            return (
              <option key={i} value={i}>
                🏁 {ev?.location || `Gara ${r.calendarIndex}`} — {ev?.date || ''}
              </option>
            );
          })}
        </select>

        {/* View toggle */}
        <div style={{ display: 'flex', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden', flexShrink: 0 }}>
          {['squadre', 'piloti'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: 1,
                background: view === v ? C.red : 'transparent',
                color: view === v ? '#fff' : C.textSec,
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Race info banner */}
      {selectedEvent && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `4px solid ${C.red}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: C.textSec }}>GARA SELEZIONATA</div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontWeight: 900, fontSize: 16, color: C.textPri }}>
              {selectedEvent.location}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 11, color: C.textSec }}>{selectedEvent.date}</div>
          <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: C.green + '22', color: C.green, border: `1px solid ${C.green}44` }}>
            UFFICIALE
          </span>
        </div>
      )}

      {/* ── VISTA SQUADRE ─────────────────────────────────────────────────────── */}
      {view === 'squadre' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {raceLeaderboard.map(({ team: t, score }, i) => {
            const isMe = t.id === currentUser?.id;
            const isOpen = expandedTeam === t.id;
            // Build team pilot breakdown for selected race
            const raceKey = selectedRace ? `race_${selectedRace.calendarIndex}` : null;
            const teamLineup = raceKey ? (lineups[raceKey] || {})[t.id] || [] : [];
            const teamReserve = raceKey ? (reserves[raceKey] || {})[t.id] : null;

            let dnfCount = 0;
            const pilotDetails = teamLineup.map(pid => {
              const pilot = pilots.find(p => p.id === pid);
              const result = selectedRace?.results?.find(r => r.pilotId === pid);
              if (result?.dnf) dnfCount++;
              const pts = result ? calculatePilotPoints(result) : { total: 0, base: 0, overtakes: 0, fastestLap: 0, dotd: 0 };
              return { pilot, result, pts, isReserve: false, subbedIn: false };
            });

            if (teamReserve) {
              const pilot = pilots.find(p => p.id === teamReserve);
              const result = selectedRace?.results?.find(r => r.pilotId === teamReserve);
              const pts = result ? calculatePilotPoints(result) : { total: 0, base: 0, overtakes: 0, fastestLap: 0, dotd: 0 };
              const subbedIn = dnfCount > 0 && !(result?.dnf);
              pilotDetails.push({ pilot, result, pts, isReserve: true, subbedIn });
            }

            return (
              <div key={t.id} style={{
                background: isMe ? `linear-gradient(135deg, rgba(225,6,0,0.15), rgba(225,6,0,0.05))` : C.surface,
                border: `1px solid ${isMe ? C.red + '66' : i < 3 ? MEDALS[i] + '44' : C.border}`,
                borderRadius: 10, overflow: 'hidden',
              }}>
                {/* Row */}
                <div
                  onClick={() => setExpandedTeam(isOpen ? null : t.id)}
                  style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    background: i < 3 ? MEDALS[i] : C.surface2,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Orbitron', monospace", fontWeight: 900, fontSize: 12,
                    color: i < 3 ? '#000' : C.textSec,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.name}
                      {isMe && <span style={{ fontSize: 9, color: C.red, marginLeft: 6 }}>← TU</span>}
                    </div>
                    <div style={{ fontSize: 10, color: C.textSec }}>{t.owner}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 900, color: i === 0 ? C.red : C.textPri }}>
                        {score.toFixed(1)}
                      </div>
                      <div style={{ fontSize: 9, color: C.textSec }}>Tot: {(totalScores[t.id] || 0).toFixed(1)}</div>
                    </div>
                    <span style={{ fontSize: 16, color: C.textSec, transition: '0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 14px' }}>
                    {pilotDetails.length === 0 ? (
                      <div style={{ color: C.textSec, fontSize: 12 }}>Nessuna formazione impostata per questa gara.</div>
                    ) : (
                      <div>
                        {/* Header */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px 40px 55px 35px 55px 40px 60px 50px', gap: 6, marginBottom: 6 }}>
                          {['PILOTA', 'START', 'END', 'PT POS', 'OVT', 'PT OVT', 'DOTD', 'PT DOTD', 'TOT'].map(h => (
                            <div key={h} style={{ fontSize: 9, textTransform: 'uppercase', color: C.textSec, textAlign: h !== 'PILOTA' ? 'center' : 'left', alignSelf: 'end' }}>{h}</div>
                          ))}
                        </div>
                        {pilotDetails.map(({ pilot, result, pts, isReserve, subbedIn }, j) => (
                          <div key={j} style={{
                            display: 'grid', gridTemplateColumns: '1fr 40px 40px 55px 35px 55px 40px 60px 50px',
                            gap: 6, padding: '6px 0', borderTop: `1px solid ${C.surface2}`, alignItems: 'center',
                            opacity: (isReserve && !subbedIn) ? 0.35 : 1,
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 3, height: 20, borderRadius: 1, background: F1_TEAM_COLORS[pilot?.team] || '#555', flexShrink: 0 }} />
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pilot?.name || '?'}</div>
                                {result?.dnf && <span style={{ fontSize: 9, color: C.red }}>DNF</span>}
                              </div>
                            </div>

                            {/* START POS */}
                            <div style={{ textAlign: 'center', fontSize: 13, color: C.textSec }}>
                              {result?.gridPosition ? `P${result.gridPosition}` : '—'}
                            </div>

                            {/* FINISH POS */}
                            <div style={{ textAlign: 'center', fontSize: 13, color: result?.dnf ? C.red : C.textPri, fontWeight: 700 }}>
                              {result?.dnf ? '—' : result?.position ? `P${result.position}` : '—'}
                            </div>

                            {/* PT POS */}
                            <div style={{ textAlign: 'center', fontSize: 13, color: C.textPri }}>
                              {pts.base > 0 ? `+${pts.base}` : '—'}
                            </div>

                            {/* OVT COUNT */}
                            <div style={{ textAlign: 'center', fontSize: 13, color: result?.overtakes > 0 ? C.textSec : C.textSec }}>
                              {result?.overtakes || '—'}
                            </div>

                            {/* PT OVT */}
                            <div style={{ textAlign: 'center', fontSize: 13, color: pts.overtakes > 0 ? C.green : C.textSec }}>
                              {pts.overtakes > 0 ? `+${pts.overtakes}` : '—'}
                            </div>

                            {/* DOTD ROW */}
                            <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: result?.dotdRank ? '#FFD700' : C.textSec }}>
                              {result?.dotdRank ? `#${result.dotdRank}` : '—'}
                            </div>

                            {/* PT DOTD */}
                            <div style={{ textAlign: 'center', fontSize: 13, color: pts.dotd > 0 ? '#FFD700' : C.textSec }}>
                              {pts.dotd > 0 ? `+${pts.dotd}` : '—'}
                            </div>

                            {/* TOT */}
                            <div style={{ textAlign: 'center', fontFamily: "'Orbitron', monospace", fontSize: 14, fontWeight: 700, color: (isReserve && !subbedIn) ? C.textSec : C.green }}>
                              {(isReserve && !subbedIn) ? `(${pts.total.toFixed(1)})` : pts.total.toFixed(1)}
                            </div>
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                          <span style={{ fontSize: 11, color: C.textSec, marginRight: 12 }}>TOTALE GARA</span>
                          <span style={{ fontFamily: "'Orbitron', monospace", fontWeight: 900, color: C.red }}>{score.toFixed(1)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── VISTA PILOTI ──────────────────────────────────────────────────────── */}
      {view === 'piloti' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {pilotLeaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: C.textSec, fontSize: 13 }}>
              Nessun risultato disponibile.
            </div>
          ) : pilotLeaderboard.map((entry, i) => {
            const teamColor = F1_TEAM_COLORS[entry.f1Team] || '#555';
            const isMyPilot = pilots.find(p => p.id === entry.pilotId)?.owner === currentUser?.id;
            return (
              <div key={entry.pilotId} style={{
                background: isMyPilot ? C.green + '10' : C.surface,
                border: `1px solid ${isMyPilot ? C.green + '44' : i < 3 ? MEDALS[i] + '44' : C.border}`,
                borderRadius: 10, padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: i < 3 ? MEDALS[i] : C.surface2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 900, color: i < 3 ? '#000' : C.textSec,
                }}>
                  {i + 1}
                </div>
                <div style={{ width: 4, height: 30, borderRadius: 2, background: teamColor, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.textPri }}>
                    {entry.pilotName}
                    {isMyPilot && <span style={{ fontSize: 9, color: C.green, marginLeft: 6 }}>★ MIO</span>}
                  </div>
                  <div style={{ fontSize: 10, color: C.textSec }}>
                    {entry.f1Team}
                    {entry.position > 0 && ` · P${entry.position}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  {entry.gridPosition && <span style={{ fontSize: 10, color: C.textSec }}>Start <b style={{ color: C.textPri }}>P{entry.gridPosition}</b></span>}
                  {entry.dotdRank && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 12, background: '#FFD70022', color: '#FFD700', border: '1px solid #FFD70044', fontWeight: 800 }}>DOTD</span>}
                  {entry.dnf && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 12, background: C.red + '22', color: C.red, border: `1px solid ${C.red}44`, fontWeight: 800 }}>DNF</span>}
                  <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 900, color: entry.dnf ? C.textSec : C.red, marginLeft: 8 }}>
                    {entry.points.toFixed(1)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
