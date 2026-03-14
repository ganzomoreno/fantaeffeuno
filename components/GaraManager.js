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
    return getRaceBreakdown(selectedRace, pilots)
      .filter(p => p.points > 0 || p.dnf)
      .sort((a, b) => b.points - a.points);
  }, [selectedRace, pilots]);

  const handleManualSwitch = async (calendarIndex, teamId, starterId, reserveId) => {
    if (!confirm('Vuoi usare 1 dei tuoi Switch per sostituire questo pilota con la riserva? Questa azione è IRREVERSIBILE.')) return;
    try {
      // Lazy load to prevent large imports at top level if component strictly UI
      const db = await import('@/lib/db');
      await db.applyManualSwitch(calendarIndex, teamId, starterId, reserveId);
      alert('Sostituzione applicata! Ricarica la pagina per vedere i nuovi punteggi.');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Errore durante lo switch: ' + err.message);
    }
  };

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
            const isSprint = ev?.type === 'sprint';
            return (
              <option key={i} value={i}>
                {isSprint ? '🏎️ SPRINT' : '🏁 Gara'} — {ev?.location || `Idx ${r.calendarIndex}`} ({ev?.date || ''})
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
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderLeft: `4px solid ${selectedEvent.type === 'sprint' ? C.amber : C.red}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: C.textSec }}>
              {selectedEvent.type === 'sprint' ? 'SPRINT RACE SELEZIONATA' : 'GARA SELEZIONATA'}
            </div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontWeight: 900, fontSize: 16, color: C.textPri }}>
              {selectedEvent.location} {selectedEvent.type === 'sprint' && <span style={{color: C.amber}}>*</span>}
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
            const teamLineupObjs = raceKey ? (lineups[raceKey] || {})[t.id] || [] : [];
            const teamReserveObj = raceKey ? (reserves[raceKey] || {})[t.id] : null;

            let dnfCount = 0;
            const pilotDetails = teamLineupObjs.map(entry => {
              const pid = entry.id || entry;
              const pilot = pilots.find(p => p.id === pid);
              const result = selectedRace?.results?.find(r => r.pilotId === pid);
              if (result?.dnf) dnfCount++;
              
              // Correctly pass isSprint flag to calculation
              const pts = result 
                ? calculatePilotPoints(result, selectedRace?.isSprint) 
                : { total: 0, base: 0, overtakes: 0, fastestLap: 0, dotd: 0 };
              
              // check if manually swapped out
              const isSwappedOut = teamReserveObj && entry.subbedOutFor === (teamReserveObj.id || teamReserveObj);

              return { pilot, result, pts, isReserve: false, subbedIn: false, isSwappedOut, rawId: pid };
            });

            if (teamReserveObj) {
              const resId = teamReserveObj.id || teamReserveObj;
              const pilot = pilots.find(p => p.id === resId);
              const result = selectedRace?.results?.find(r => r.pilotId === resId);
              
              // Correctly pass isSprint flag to calculation
              const pts = result 
                ? calculatePilotPoints(result, selectedRace?.isSprint) 
                : { total: 0, base: 0, overtakes: 0, fastestLap: 0, dotd: 0 };

              // explicitly check if manually subbed in 
              const subbedIn = teamReserveObj.subbedInManually || (dnfCount > 0 && !(result?.dnf));

              pilotDetails.push({ pilot, result, pts, isReserve: true, subbedIn, rawId: resId });
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
                      <>
                        <div style={{ marginBottom: 12 }}>
                          {/* Header */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 45px 30px 40px 30px 40px', gap: 4, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${C.border}` }}>
                            {['PILOTA', 'ST>FIN', 'PT', 'OVR', 'DD', 'TOT'].map(h => (
                              <div key={h} style={{ fontSize: 9, textTransform: 'uppercase', color: C.textSec, textAlign: h !== 'PILOTA' && h !== 'TOT' ? 'center' : h === 'TOT' ? 'right' : 'left', alignSelf: 'end', fontWeight: 800 }}>{h}</div>
                            ))}
                          </div>

                          {pilotDetails.map(({ pilot, result, pts, isReserve, subbedIn, isSwappedOut, rawId }, j) => {
                            const canManualSwitch = isMe && !isReserve && !isSwappedOut && !result?.dnf && teamReserveObj && (5 - (t.switchesUsed || 0) > 0) && !pilotDetails.find(p => p.isReserve)?.subbedIn;

                            return (
                              <div key={j} style={{
                                display: 'grid', gridTemplateColumns: '1fr 45px 30px 40px 30px 40px',
                                gap: 4, padding: '8px 0', borderTop: j > 0 ? `1px solid ${C.surface2}` : 'none', alignItems: 'center',
                                opacity: ((isReserve && !subbedIn) || isSwappedOut) ? 0.35 : 1,
                              }}>
                                {/* COL 1: PILOTA */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                                  <div style={{ width: 3, height: 20, borderRadius: 1, background: F1_TEAM_COLORS[pilot?.team] || '#555', flexShrink: 0 }} />
                                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <div style={{ fontSize: 12, fontWeight: 700, color: result?.dnf ? '#555' : C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {pilot?.abbreviation || pilot?.name?.substring(0, 3).toUpperCase() || '?'}
                                      </div>
                                      {canManualSwitch && (
                                        <button
                                          onClick={() => handleManualSwitch(selectedRace.calendarIndex, t.id, rawId, teamReserveObj.id || teamReserveObj)}
                                          style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, color: C.textPri, cursor: 'pointer', padding: '1px 3px', fontSize: 10, display: 'flex', alignItems: 'center' }}
                                          title="Usa Switch"
                                        >
                                          🔁
                                        </button>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 2 }}>
                                      {result?.dnf && <span style={{ fontSize: 8, color: C.red, fontWeight: 800 }}>DNF</span>}
                                      {subbedIn && <span style={{ fontSize: 8, color: C.amber, fontWeight: 800 }}>SUB ⇡</span>}
                                      {isSwappedOut && <span style={{ fontSize: 8, color: C.textSec, fontWeight: 800 }}>SWAP</span>}
                                    </div>
                                  </div>
                                </div>

                                {/* COL 2: START > END */}
                                <div style={{ textAlign: 'center', fontSize: 10, color: result?.dnf ? '#555' : C.textSec, lineHeight: 1.1 }}>
                                  <div>{result?.gridPosition ? `P${result.gridPosition}` : '—'}</div>
                                  <div style={{ fontSize: 8 }}>↓</div>
                                  <div style={{ color: result?.dnf ? '#555' : C.textPri, fontWeight: 800 }}>{result?.dnf ? 'DNF' : result?.position ? `P${result.position}` : '—'}</div>
                                </div>

                                {/* COL 3: BASE PT */}
                                <div style={{ textAlign: 'center', fontSize: 12, color: result?.dnf ? '#555' : C.textPri, fontWeight: 700 }}>
                                  {pts.base > 0 ? `+${pts.base}` : '—'}
                                </div>

                                {/* COL 4: OVT */}
                                <div style={{ textAlign: 'center', color: result?.dnf ? '#555' : (pts.overtakes > 0 ? C.green : C.textSec), lineHeight: 1.1 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700 }}>{pts.overtakes > 0 ? `+${pts.overtakes}` : '—'}</div>
                                  {result?.overtakes > 0 && <div style={{ fontSize: 8, color: C.textSec }}>({result.overtakes})</div>}
                                </div>

                                {/* COL 5: DOTD */}
                                <div style={{ textAlign: 'center', color: result?.dnf ? '#555' : (pts.dotd > 0 ? '#FFD700' : C.textSec), lineHeight: 1.1 }}>
                                  <div style={{ fontSize: 11, fontWeight: 700 }}>{pts.dotd > 0 ? `+${pts.dotd}` : '—'}</div>
                                  {result?.dotdRank && <div style={{ fontSize: 8 }}>#{result.dotdRank}</div>}
                                </div>

                                {/* COL 6: TOTAL */}
                                <div style={{ textAlign: 'right', fontFamily: "'Orbitron', monospace", fontSize: 14, fontWeight: 900, color: ((isReserve && !subbedIn) || isSwappedOut) ? C.textSec : C.green }}>
                                  {((isReserve && !subbedIn) || isSwappedOut) ? `(${pts.total.toFixed(1)})` : pts.total.toFixed(1)}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: C.surface2, color: C.textSec, border: `1px solid ${C.border}` }}>
                              Switches: {t.switchesUsed || 0}/5
                            </span>
                            {teamReserveObj && (pilotDetails.find(p => p.isReserve)?.subbedIn) && (
                              <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 10, background: C.amber + '22', color: C.amber, border: `1px solid ${C.amber}44` }}>
                                {teamReserveObj.subbedInManually ? (selectedEvent?.type === 'sprint' ? 'Sub Sprint' : 'Switch Manuale Usato') : (dnfCount > 0 ? '1 Switch Usato per DNF' : 'Switch Applicato')}
                              </span>
                            )}
                          </div>
                          <div>
                            <span style={{ fontSize: 11, color: C.textSec, marginRight: 12 }}>TOTALE GARA</span>
                            <span style={{ fontFamily: "'Orbitron', monospace", fontWeight: 900, color: C.red }}>{score.toFixed(1)}</span>
                          </div>
                        </div>
                      </>
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
                    {pilots.find(p => p.id === entry.pilotId)?.abbreviation || entry.pilotName?.substring(0, 3).toUpperCase() || '?'}
                    {isMyPilot && <span style={{ fontSize: 9, color: C.green, marginLeft: 6 }}>★ MIO</span>}
                  </div>
                  <div style={{ fontSize: 10, color: C.textSec }}>
                    {entry.f1Team}
                    {entry.position > 0 && ` · P${entry.position}`}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  {entry.gridPosition && <span style={{ fontSize: 10, color: C.textSec }}>Start <b style={{ color: C.textPri }}>P{entry.gridPosition}</b></span>}
                  {entry.dotdRank === 1 && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 12, background: '#FFD70033', color: '#FFD700', border: '1px solid #FFD70066', fontWeight: 800 }}>🥇 1° DOTD</span>}
                  {entry.dotdRank === 2 && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 12, background: '#C0C0C033', color: '#C0C0C0', border: '1px solid #C0C0C066', fontWeight: 800 }}>🥈 2° DOTD</span>}
                  {entry.dotdRank === 3 && <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 12, background: '#CD7F3233', color: '#CD7F32', border: '1px solid #CD7F3266', fontWeight: 800 }}>🥉 3° DOTD</span>}
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
