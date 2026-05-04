'use client';

import { useState, useMemo } from 'react';
import { calculatePilotPoints, calculateRaceTeamScore, getRaceBreakdown } from '@/lib/scoring';
import { F1_TEAM_COLORS, POINTS_TABLE } from '@/lib/data';

const C = {
  surface: '#14151C',
  surface2: '#1A1B24',
  border: '#2A2D3A',
  textPri: '#EDEEF3',
  textSec: '#C8CCDA',
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

  // Pilot leaderboard for selected race (TUTTI i piloti, ordinati per punti
  // e a parità per posizione di arrivo). Include DNF in coda.
  const pilotLeaderboard = useMemo(() => {
    if (!selectedRace) return [];
    return getRaceBreakdown(selectedRace, pilots)
      .sort((a, b) => {
        if (a.dnf !== b.dnf) return a.dnf ? 1 : -1;
        if (b.points !== a.points) return b.points - a.points;
        return (a.position || 99) - (b.position || 99);
      });
  }, [selectedRace, pilots]);

  // Mappa pilot_id → fanta team owner per la gara selezionata.
  // Storico fedele: usa le lineups effettive di quella race (titolari + riserva).
  const pilotToFantaTeam = useMemo(() => {
    if (!selectedRace) return {};
    const raceKey = `race_${selectedRace.calendarIndex}`;
    const raceLineups = lineups[raceKey] || {};
    const raceReserves = reserves[raceKey] || {};
    const map = {};
    teams.forEach(t => {
      const starters = raceLineups[t.id] || [];
      starters.forEach(s => {
        const pid = s?.id || s;
        if (pid) map[pid] = t;
      });
      const res = raceReserves[t.id];
      const resId = res?.id || res;
      if (resId) map[resId] = t;
    });
    return map;
  }, [selectedRace, lineups, reserves, teams]);

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
      <div style={{ textAlign: 'center', padding: 60, color: C.textSec, fontSize: 17 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🏁</div>
        Nessuna gara ancora disputata.
        <br />
        <span style={{ fontSize: 15 }}>Inserisci i risultati dal pannello Admin.</span>
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
            color: C.textPri, padding: '9px 12px', fontSize: 17,
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
                padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 700,
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
            <div style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, color: C.textSec }}>
              {selectedEvent.type === 'sprint' ? 'SPRINT RACE SELEZIONATA' : 'GARA SELEZIONATA'}
            </div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontWeight: 900, fontSize: 19, color: C.textPri }}>
              {selectedEvent.location} {selectedEvent.type === 'sprint' && <span style={{color: C.amber}}>*</span>}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 15, color: C.textSec }}>{selectedEvent.date}</div>
          <span style={{ padding: '4px 10px', borderRadius: 20, fontSize: 14, fontWeight: 700, background: C.green + '22', color: C.green, border: `1px solid ${C.green}44` }}>
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

              // La riserva entra in classifica SOLO con switch manuale (no auto-sub su DNF).
              const subbedIn = !!teamReserveObj.subbedInManually;

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
                    fontFamily: "'Orbitron', monospace", fontWeight: 900, fontSize: 16,
                    color: i < 3 ? '#000' : C.textSec,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 17, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.name}
                      {isMe && <span style={{ fontSize: 14, color: C.red, marginLeft: 6 }}>← TU</span>}
                    </div>
                    <div style={{ fontSize: 14, color: C.textSec }}>{t.owner}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 22, fontWeight: 900, color: i === 0 ? C.red : C.textPri }}>
                        {score.toFixed(1)}
                      </div>
                      <div style={{ fontSize: 14, color: C.textSec }}>Tot: {(totalScores[t.id] || 0).toFixed(1)}</div>
                    </div>
                    <span style={{ fontSize: 19, color: C.textSec, transition: '0.2s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                  </div>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 14px' }}>
                    {pilotDetails.length === 0 ? (
                      <div style={{ color: C.textSec, fontSize: 16 }}>Nessuna formazione impostata per questa gara.</div>
                    ) : (
                      <>
                        <div style={{ marginBottom: 12 }}>
                          {/* Header */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 45px 30px 40px 30px 40px', gap: 4, marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${C.border}` }}>
                            {['PILOTA', 'ST>FIN', 'PT', 'OVR', 'DD', 'TOT'].map(h => (
                              <div key={h} style={{ fontSize: 14, textTransform: 'uppercase', color: C.textSec, textAlign: h !== 'PILOTA' && h !== 'TOT' ? 'center' : h === 'TOT' ? 'right' : 'left', alignSelf: 'end', fontWeight: 800 }}>{h}</div>
                            ))}
                          </div>

                          {pilotDetails.map(({ pilot, result, pts, isReserve, subbedIn, isSwappedOut, rawId }, j) => {
                            // Switch manuale permesso anche su titolari DNF: lascia che il manager
                            // decida liberamente di sostituirli con la riserva. Blocchi solo:
                            // - non e' il proprio team
                            // - il pilota e' la riserva (non si sostituisce a se stessa)
                            // - il pilota e' gia' stato swappato fuori
                            // - il team non ha riserva (rosa = 3)
                            // - switch esauriti (5/5)
                            // - la riserva e' gia' entrata (un solo switch per gara)
                            const canManualSwitch = isMe && !isReserve && !isSwappedOut && teamReserveObj && (5 - (t.switchesUsed || 0) > 0) && !pilotDetails.find(p => p.isReserve)?.subbedIn;

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
                                      <div style={{ fontSize: 16, fontWeight: 700, color: result?.dnf ? '#555' : C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {pilot?.abbreviation || pilot?.name?.substring(0, 3).toUpperCase() || '?'}
                                      </div>
                                      {canManualSwitch && (
                                        <button
                                          onClick={() => handleManualSwitch(selectedRace.calendarIndex, t.id, rawId, teamReserveObj.id || teamReserveObj)}
                                          style={{ background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 4, color: C.textPri, cursor: 'pointer', padding: '1px 3px', fontSize: 14, display: 'flex', alignItems: 'center' }}
                                          title="Usa Switch"
                                        >
                                          🔁
                                        </button>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 2 }}>
                                      {result?.dnf && <span style={{ fontSize: 14, color: C.red, fontWeight: 800 }}>DNF</span>}
                                      {subbedIn && <span style={{ fontSize: 14, color: C.amber, fontWeight: 800 }}>SUB ⇡</span>}
                                      {isSwappedOut && <span style={{ fontSize: 14, color: C.textSec, fontWeight: 800 }}>SWAP</span>}
                                    </div>
                                  </div>
                                </div>

                                {/* COL 2: START > END */}
                                <div style={{ textAlign: 'center', fontSize: 14, color: result?.dnf ? '#555' : C.textSec, lineHeight: 1.1 }}>
                                  <div>{result?.gridPosition ? `P${result.gridPosition}` : '—'}</div>
                                  <div style={{ fontSize: 14 }}>↓</div>
                                  <div style={{ color: result?.dnf ? '#555' : C.textPri, fontWeight: 800 }}>{result?.dnf ? 'DNF' : result?.position ? `P${result.position}` : '—'}</div>
                                </div>

                                {/* COL 3: BASE PT */}
                                <div style={{ textAlign: 'center', fontSize: 16, color: result?.dnf ? '#555' : C.textPri, fontWeight: 700 }}>
                                  {pts.base > 0 ? `+${pts.base}` : '—'}
                                </div>

                                {/* COL 4: OVT */}
                                <div style={{ textAlign: 'center', color: result?.dnf ? '#555' : (pts.overtakes > 0 ? C.green : C.textSec), lineHeight: 1.1 }}>
                                  <div style={{ fontSize: 15, fontWeight: 700 }}>{pts.overtakes > 0 ? `+${pts.overtakes}` : '—'}</div>
                                  {result?.overtakes > 0 && <div style={{ fontSize: 14, color: C.textSec }}>({result.overtakes})</div>}
                                </div>

                                {/* COL 5: DOTD */}
                                <div style={{ textAlign: 'center', color: result?.dnf ? '#555' : (pts.dotd > 0 ? '#FFD700' : C.textSec), lineHeight: 1.1 }}>
                                  <div style={{ fontSize: 15, fontWeight: 700 }}>{pts.dotd > 0 ? `+${pts.dotd}` : '—'}</div>
                                  {result?.dotdRank && <div style={{ fontSize: 14 }}>#{result.dotdRank}</div>}
                                </div>

                                {/* COL 6: TOTAL */}
                                <div style={{ textAlign: 'right', fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 900, color: ((isReserve && !subbedIn) || isSwappedOut) ? C.textSec : C.green }}>
                                  {((isReserve && !subbedIn) || isSwappedOut) ? `(${pts.total.toFixed(1)})` : pts.total.toFixed(1)}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.border}` }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <span style={{ fontSize: 14, padding: '3px 8px', borderRadius: 10, background: C.surface2, color: C.textSec, border: `1px solid ${C.border}` }}>
                              Switches: {t.switchesUsed || 0}/5
                            </span>
                            {teamReserveObj?.subbedInManually && (
                              <span style={{ fontSize: 14, padding: '3px 8px', borderRadius: 10, background: C.amber + '22', color: C.amber, border: `1px solid ${C.amber}44` }}>
                                {selectedEvent?.type === 'sprint' ? 'Sub Sprint' : 'Switch Manuale Usato'}
                              </span>
                            )}
                          </div>
                          <div>
                            <span style={{ fontSize: 15, color: C.textSec, marginRight: 12 }}>TOTALE GARA</span>
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

      {/* ── VISTA PILOTI (tabella trasparente con breakdown punti) ───────────── */}
      {view === 'piloti' && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
          {/* Header — colonne: # | Pilota | Team | Grid | Arr | Δ | Sorp | Base | DOTD | Totale */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '28px minmax(110px, 1fr) minmax(96px, 1.2fr) 48px 48px 36px 56px 48px 56px 60px',
            gap: 6, padding: '10px 10px', alignItems: 'center',
            background: C.surface2, borderBottom: `1px solid ${C.border}`,
            fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.6, color: C.textSec,
          }}>
            <div style={{ textAlign: 'center' }}>#</div>
            <div>Pilota</div>
            <div title="Fanta team che aveva questo pilota in formazione in questa gara">Team</div>
            <div style={{ textAlign: 'center' }} title="Posizione di partenza in griglia">Grid</div>
            <div style={{ textAlign: 'center' }} title="Posizione di arrivo">Arr.</div>
            <div style={{ textAlign: 'center' }} title="Variazione tra grid e arrivo">Δ</div>
            <div style={{ textAlign: 'right' }} title="Bonus sorpassi: +0,5 per sorpasso, max +3 pt (cap 6 sorpassi)">Sorp.</div>
            <div style={{ textAlign: 'right' }} title="Punti base da posizione di arrivo (P1=25 ... P20=1)">Base</div>
            <div style={{ textAlign: 'right' }} title="Driver of the Day: 1°=+3, 2°=+2, 3°=+1">DOTD</div>
            <div style={{ textAlign: 'right' }}>Totale</div>
          </div>

          {pilotLeaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: C.textSec, fontSize: 17 }}>
              Nessun risultato disponibile.
            </div>
          ) : pilotLeaderboard.map((entry, i) => {
            const teamColor = F1_TEAM_COLORS[entry.f1Team] || '#555';
            const fantaTeam = pilotToFantaTeam[entry.pilotId] || null;
            const isMyPilot = fantaTeam?.id === currentUser?.id;
            const bk = entry.breakdown || {};
            const ovtRaw = entry.overtakes || 0;
            const ovtCapped = Math.min(ovtRaw, 6);
            const dotdLabel = entry.dotdRank === 1 ? '1°' : entry.dotdRank === 2 ? '2°' : entry.dotdRank === 3 ? '3°' : '';
            const dotdColor = entry.dotdRank === 1 ? '#FFD700' : entry.dotdRank === 2 ? '#C0C0C0' : entry.dotdRank === 3 ? '#CD7F32' : C.textSec;

            // Δ grid → arrivo
            let deltaEmoji = '—';
            let deltaColor = C.textSec;
            let deltaText = '';
            if (entry.dnf) { deltaEmoji = '✕'; deltaColor = C.red; }
            else if (entry.gridPosition && entry.position > 0) {
              const d = entry.gridPosition - entry.position; // positivo = ha guadagnato posizioni
              if (d > 0)      { deltaEmoji = '▲'; deltaColor = C.green;  deltaText = `+${d}`; }
              else if (d < 0) { deltaEmoji = '▼'; deltaColor = C.red;    deltaText = `${d}`;  }
              else            { deltaEmoji = '='; deltaColor = C.textSec; deltaText = '0';     }
            }

            return (
              <div key={entry.pilotId} style={{
                display: 'grid',
                gridTemplateColumns: '28px minmax(110px, 1fr) minmax(96px, 1.2fr) 48px 48px 36px 56px 48px 56px 60px',
                gap: 6, padding: '10px 10px', alignItems: 'center',
                background: isMyPilot ? C.green + '0E' : 'transparent',
                borderBottom: `1px solid ${C.border}55`,
                borderLeft: isMyPilot ? `3px solid ${C.green}` : '3px solid transparent',
              }}>
                {/* Rank */}
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: i < 3 ? MEDALS[i] : C.surface2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 900, color: i < 3 ? '#000' : C.textSec,
                }}>{i + 1}</div>

                {/* Pilota */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                  <div style={{ width: 4, height: 28, borderRadius: 2, background: teamColor, flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 16, color: C.textPri, whiteSpace: 'nowrap' }}>
                      {pilots.find(p => p.id === entry.pilotId)?.abbreviation || entry.pilotName?.substring(0, 3).toUpperCase() || '?'}
                      {isMyPilot && <span style={{ fontSize: 12, color: C.green, marginLeft: 6, fontWeight: 700 }}>★</span>}
                    </div>
                    <div style={{ fontSize: 12, color: C.textSec, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {entry.f1Team}
                    </div>
                  </div>
                </div>

                {/* Fanta Team (storico per gara) */}
                <div style={{ minWidth: 0, fontSize: 13, fontWeight: 700, color: fantaTeam ? (isMyPilot ? C.green : C.textPri) : C.textSec, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={fantaTeam?.name || 'Non schierato'}>
                  {fantaTeam ? fantaTeam.name : <span style={{ opacity: 0.5 }}>—</span>}
                </div>

                {/* Grid */}
                <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: C.textSec, fontFamily: "'Orbitron', monospace" }}>
                  {entry.gridPosition ? `P${entry.gridPosition}` : '—'}
                </div>

                {/* Arrivo */}
                <div style={{ textAlign: 'center', fontSize: 14, fontWeight: 800, color: entry.dnf ? C.red : C.textPri, fontFamily: "'Orbitron', monospace" }}>
                  {entry.dnf ? 'DNF' : (entry.position > 0 ? `P${entry.position}` : '—')}
                </div>

                {/* Δ Emoji */}
                <div style={{ textAlign: 'center', fontSize: 16, fontWeight: 900, color: deltaColor, lineHeight: 1 }} title={`Variazione grid → arrivo: ${deltaText || '—'}`}>
                  {deltaEmoji}
                  {deltaText && <div style={{ fontSize: 10, fontWeight: 700, color: deltaColor, fontFamily: "'Titillium Web', sans-serif" }}>{deltaText}</div>}
                </div>

                {/* Sorpassi */}
                <div style={{ textAlign: 'right', fontSize: 14, fontFamily: "'Orbitron', monospace", color: bk.overtakes > 0 ? C.green : C.textSec, fontWeight: 700 }} title={`${ovtRaw} sorpass${ovtRaw === 1 ? 'o' : 'i'}${ovtRaw > 6 ? ' (cap a 6)' : ''}`}>
                  {bk.overtakes > 0 ? `+${bk.overtakes.toFixed(1)}` : '—'}
                  {ovtRaw > 0 && (
                    <div style={{ fontSize: 11, color: C.textSec, fontWeight: 500, fontFamily: "'Titillium Web', sans-serif" }}>
                      ({ovtCapped})
                    </div>
                  )}
                </div>

                {/* Base pts */}
                <div style={{ textAlign: 'right', fontSize: 14, fontFamily: "'Orbitron', monospace", color: bk.base > 0 ? C.textPri : C.textSec, fontWeight: 700 }}>
                  {(bk.base ?? 0).toFixed(0)}
                </div>

                {/* DOTD */}
                <div style={{ textAlign: 'right', fontSize: 14, fontFamily: "'Orbitron', monospace", color: bk.dotd > 0 ? dotdColor : C.textSec, fontWeight: 800 }}>
                  {bk.dotd > 0 ? `+${bk.dotd}` : '—'}
                  {dotdLabel && <div style={{ fontSize: 11, color: dotdColor, fontWeight: 700, fontFamily: "'Titillium Web', sans-serif" }}>{dotdLabel}</div>}
                </div>

                {/* Totale */}
                <div style={{ textAlign: 'right', fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 900, color: entry.dnf ? C.textSec : C.red }}>
                  {entry.points.toFixed(1)}
                </div>
              </div>
            );
          })}

          {/* Footer legenda */}
          <div style={{ padding: '10px 12px', background: C.surface2, fontSize: 12, color: C.textSec, borderTop: `1px solid ${C.border}`, lineHeight: 1.6 }}>
            <strong style={{ color: C.textPri }}>Come si calcola</strong> · <b>Base</b>: P1=25, P2=22, P3=20, P4=18, … P10=11, … P20=1, P21+=0.
            {' '}<b>Sorp.</b>: +0,5 per sorpasso (cap 6 → max +3 pt).
            {' '}<b>DOTD</b>: 1°=+3, 2°=+2, 3°=+1.
            {' '}<b>DNF</b>: 0 pt (nessun bonus). <b>Sprint</b>: solo Base 8→1, niente bonus.
          </div>
        </div>
      )}

    </div>
  );
}
