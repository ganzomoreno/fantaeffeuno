'use client';

import { useMemo } from 'react';
import { calculatePilotPoints, calculateRaceTeamScore } from '@/lib/scoring';
import { MAX_SWITCHES, F1_TEAM_COLORS, PENALTIES } from '@/lib/data';

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

export default function Classifica({ teams, scores, races, pilots, lineups, reserves, calendar, currentUser, onNavigate }) {
  const myScore = scores[currentUser?.id] || 0;
  const myRank = teams.findIndex(t => t.id === currentUser?.id) + 1;

  // Robustly parse DD/MM/YYYY or YYYY-MM-DD to a local Date object
  const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    let y, m, d;
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      [d, m, y] = parts;
    } else if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts[0].length === 4) [y, m, d] = parts;
      else [d, m, y] = parts;
    }
    const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), 15, 0, 0);
    return date;
  };

  const SIMULATED_TODAY = new Date();

  // Determine active race based on strict timeline rules.
  // Priority: first event with OPEN lineup window (before midnight of race day).
  // Fallback: the most recent LOCKED event (race is ongoing today).
  const completedSet = useMemo(
    () => new Set((races || []).filter(r => (r.results || []).length > 0).map(r => r.calendarIndex)),
    [races]
  );

  // Active race = first non-cancelled, non-completed race/sprint in calendar.
  // Stays active (locked) past race day until results are entered.
  const activeRaceInfo = useMemo(() => {
    for (let i = 0; i < calendar.length; i++) {
      const ev = calendar[i];
      if (ev.cancelled) continue;
      if (ev.type !== 'race' && ev.type !== 'sprint') continue;
      if (completedSet.has(i)) continue;

      const raceDate = parseDate(ev.date);
      if (isNaN(raceDate.getTime())) continue;

      // Deadline schieramento: 22:00 locale del giorno gara (lights-out Miami)
      const deadline = new Date(raceDate);
      deadline.setHours(22, 0, 0, 0);

      if (SIMULATED_TODAY <= deadline) return { activeIdx: i, timeLocked: false };
      return { activeIdx: i, timeLocked: true };
    }
    return { activeIdx: -1, timeLocked: false };
  }, [calendar, completedSet]);

  const nextRaceIdx = activeRaceInfo.activeIdx;
  const nextRaceEvent = nextRaceIdx >= 0 ? calendar[nextRaceIdx] : null;

  // Races sorted chronologically by calendar position (DB returns them unordered)
  const sortedRaces = useMemo(
    () => [...races].sort((a, b) => (a.calendarIndex ?? 0) - (b.calendarIndex ?? 0)),
    [races]
  );

  // Days until next race
  const daysUntil = useMemo(() => {
    if (!nextRaceEvent) return null;
    const raceDate = parseDate(nextRaceEvent.date);
    raceDate.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.ceil((raceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [nextRaceEvent]);

  // My lineup for next race
  const myPilots = useMemo(() => pilots.filter(p => p.owner === currentUser?.id), [pilots, currentUser]);
  const myNextLineupObjs = nextRaceIdx >= 0 ? (lineups[`race_${nextRaceIdx}`] || {})[currentUser?.id] || [] : [];
  const myNextLineup = myNextLineupObjs.map(l => l?.id || l);
  const lineupPilots = myNextLineup.map(id => pilots.find(p => p.id === id)).filter(Boolean);
  const benchPilots = myPilots.filter(p => !myNextLineup.includes(p.id));
  const lineupConfirmed = myNextLineup.length === 3;

  // Last completed race (chronologically last race actually run, with results)
  const lastRace = sortedRaces.length > 0 ? sortedRaces[sortedRaces.length - 1] : null;
  const lastRaceEvent = lastRace ? calendar[lastRace.calendarIndex] : null;
  const lastRaceScore = useMemo(
    () => lastRace && currentUser ? calculateRaceTeamScore(lastRace, lineups, reserves, pilots, currentUser.id) : 0,
    [lastRace, lineups, reserves, pilots, currentUser]
  );

  // Top driver of last race for my team
  const lastTopDriver = useMemo(() => {
    if (!lastRace || !currentUser) return null;
    const lineupObjs = (lineups[`race_${lastRace.calendarIndex}`] || {})[currentUser.id] || [];
    const lineup = lineupObjs.map(l => l?.id || l);
    let best = null, bestPts = -1;
    (lastRace.results || []).forEach(r => {
      if (!lineup.includes(r.pilotId)) return;
      const ptsObj = calculatePilotPoints(r, lastRace.isSprint);
      const pts = ptsObj.total;
      if (pts > bestPts) { bestPts = pts; best = { ...r, pts: ptsObj, pilot: pilots.find(p => p.id === r.pilotId) }; }
    });
    return best;
  }, [lastRace, currentUser, lineups, pilots]);

  // Trend: last 5 races bar chart data
  const trendData = useMemo(() => {
    return sortedRaces.slice(-5).map(race => ({
      label: (calendar[race.calendarIndex]?.location || '?').slice(0, 3).toUpperCase(),
      pts: calculateRaceTeamScore(race, lineups, reserves, pilots, currentUser?.id),
    }));
  }, [sortedRaces, calendar, lineups, reserves, pilots, currentUser]);
  const maxTrend = Math.max(...trendData.map(d => d.pts), 1);

  // Rank delta vs pre-last-race
  const rankDelta = useMemo(() => {
    if (sortedRaces.length < 2 || !currentUser) return null;
    const prevRaces = sortedRaces.slice(0, -1);
    const prevScores = {};
    teams.forEach(t => { prevScores[t.id] = prevRaces.reduce((s, r) => s + calculateRaceTeamScore(r, lineups, reserves, pilots, t.id), 0); });
    const prevRank = [...teams].sort((a, b) => (prevScores[b.id] || 0) - (prevScores[a.id] || 0)).findIndex(t => t.id === currentUser.id) + 1;
    return prevRank - myRank;
  }, [sortedRaces, teams, lineups, reserves, pilots, currentUser, myRank]);

  // Next 3 Events (today or future, cancelled excluded, chronological)
  const startOfToday = useMemo(() => {
    const d = new Date(SIMULATED_TODAY); d.setHours(0, 0, 0, 0); return d;
  }, [SIMULATED_TODAY]);
  const nextEvents = useMemo(() => {
    return calendar
      .filter(ev => !ev.cancelled)
      .filter(ev => {
        const d = parseDate(ev.date); d.setHours(0, 0, 0, 0);
        return d.getTime() >= startOfToday.getTime();
      })
      .sort((a, b) => parseDate(a.date) - parseDate(b.date))
      .slice(0, 3);
  }, [calendar, startOfToday]);

  // Next Auction
  const nextAuction = useMemo(() => {
    return calendar
      .filter(ev => !ev.cancelled && ev.type === 'auction')
      .map(ev => ({ ev, d: (() => { const d = parseDate(ev.date); d.setHours(0,0,0,0); return d; })() }))
      .filter(x => x.d.getTime() >= startOfToday.getTime())
      .sort((a, b) => a.d - b.d)[0]?.ev || null;
  }, [calendar, startOfToday]);

  // Top 3 Leaderboard
  const top3Teams = useMemo(() => {
    return teams.slice(0, 3).map((t, i) => ({ ...t, rank: i + 1, score: scores[t.id] || 0 }));
  }, [teams, scores]);

  // Points breakdown for last race
  const lastRaceMyBreakdown = useMemo(() => {
    if (!lastRace || !currentUser) return [];
    const lineupObjs = (lineups[`race_${lastRace.calendarIndex}`] || {})[currentUser.id] || [];
    const lineup = lineupObjs.map(l => l?.id || l);
    const reserveObj = (reserves[`race_${lastRace.calendarIndex}`] || {})[currentUser.id];
    const reserveId = reserveObj?.id || reserveObj;

    const resData = (lastRace.results || []).filter(r => lineup.includes(r.pilotId));

    let drivers = resData.map(r => ({
      ...r,
      pilot: pilots.find(p => p.id === r.pilotId),
      pts: calculatePilotPoints(r, lastRace.isSprint)
    }));

    // Riserva nel breakdown SOLO se manualmente subbed in (no auto-sub su DNF)
    const reserveSubbedIn = !!reserveObj?.subbedInManually;
    if (reserveSubbedIn && reserveId) {
      const resResult = (lastRace.results || []).find(r => r.pilotId === reserveId);
      if (resResult && !resResult.dnf) {
        drivers.push({
          ...resResult,
          pilot: pilots.find(p => p.id === reserveId),
          pts: calculatePilotPoints(resResult, lastRace.isSprint),
          subbedIn: true
        });
      }
    }

    return drivers;
  }, [lastRace, currentUser, lineups, reserves, pilots]);

  // Cumulative team scores per race (for trend chart)
  const teamProgression = useMemo(() => {
    const tally = {};
    teams.forEach(t => { tally[t.id] = { running: 0, points: [] }; });
    sortedRaces.forEach(race => {
      teams.forEach(t => {
        const raceScore = calculateRaceTeamScore(race, lineups, reserves, pilots, t.id);
        tally[t.id].running += raceScore;
        tally[t.id].points.push(tally[t.id].running);
      });
    });
    return tally;
  }, [sortedRaces, teams, lineups, reserves, pilots]);

  // Smart actions
  const smartActions = useMemo(() => {
    const out = [];
    if (nextRaceEvent && !lineupConfirmed && !activeRaceInfo?.timeLocked) {
      out.push({
        kind: 'lineup',
        label: `Schiera la formazione per ${nextRaceEvent.location}`,
        cta: 'Schiera →',
        onClick: () => onNavigate?.('squadre'),
        color: C.amber,
      });
    }
    if (lastRaceMyBreakdown.some(r => r.dnf && !r.subbedIn)) {
      const switchesLeft = MAX_SWITCHES - (currentUser?.switchesUsed || 0);
      if (switchesLeft > 0) {
        out.push({
          kind: 'dnf',
          label: `DNF nell'ultima gara — usa uno switch?`,
          cta: 'Vedi gara →',
          onClick: () => onNavigate?.('gara'),
          color: C.red,
        });
      }
    }
    if (nextAuction) {
      const aucD = parseDate(nextAuction.date); aucD.setHours(0,0,0,0);
      const today = new Date(); today.setHours(0,0,0,0);
      const diff = Math.ceil((aucD - today) / 86400000);
      if (diff >= 0 && diff <= 7) {
        out.push({
          kind: 'auction',
          label: `Asta ${diff === 0 ? 'OGGI' : `tra ${diff}g`} — prepara il budget`,
          cta: null,
          color: C.amber,
        });
      }
    }
    return out.slice(0, 2);
  }, [nextRaceEvent, lineupConfirmed, activeRaceInfo, lastRaceMyBreakdown, currentUser, nextAuction]);

  // Render trend chart inline SVG
  const renderTrend = () => {
    if (sortedRaces.length === 0) return null;
    const W = 560, H = 180, padL = 12, padR = 12, padT = 12, padB = 26;
    const innerW = W - padL - padR, innerH = H - padT - padB;
    const maxPts = Math.max(1, ...Object.values(teamProgression).flatMap(t => t.points));
    const xStep = sortedRaces.length > 1 ? innerW / (sortedRaces.length - 1) : 0;
    const xAt = i => padL + i * xStep;
    const yAt = v => padT + innerH - (v / maxPts) * innerH;
    const myColor = C.green;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', display: 'block', borderRadius: 8 }} preserveAspectRatio="none">
        {/* gridlines */}
        {[0.25, 0.5, 0.75].map(g => (
          <line key={g} x1={padL} x2={W - padR} y1={padT + innerH * g} y2={padT + innerH * g} stroke={C.border} strokeDasharray="2 4" strokeWidth="1" />
        ))}
        {/* lines: other teams */}
        {teams.filter(t => t.id !== currentUser?.id).map(t => {
          const pts = teamProgression[t.id]?.points || [];
          const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)},${yAt(p)}`).join(' ');
          return <path key={t.id} d={d} fill="none" stroke={C.textSec} strokeOpacity="0.35" strokeWidth="1.5" />;
        })}
        {/* line: my team */}
        {currentUser && (() => {
          const pts = teamProgression[currentUser.id]?.points || [];
          const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)},${yAt(p)}`).join(' ');
          return (
            <>
              <path d={d} fill="none" stroke={myColor} strokeWidth="3" filter="drop-shadow(0 0 4px rgba(0,255,65,0.6))" />
              {pts.map((p, i) => (
                <circle key={i} cx={xAt(i)} cy={yAt(p)} r="3.5" fill={myColor} />
              ))}
            </>
          );
        })()}
        {/* x labels: race location 3-letter abbr */}
        {sortedRaces.map((r, i) => {
          const loc = (calendar[r.calendarIndex]?.location || '?').slice(0, 3).toUpperCase();
          return (
            <text key={i} x={xAt(i)} y={H - 8} fill={C.textSec} fontSize="11" textAnchor="middle" fontFamily="monospace">{loc}</text>
          );
        })}
      </svg>
    );
  };

  const switchesUsed = currentUser?.switchesUsed || 0;
  const auctionDays = nextAuction ? Math.ceil((parseDate(nextAuction.date).setHours(0,0,0,0) - new Date().setHours(0,0,0,0)) / 86400000) : null;

  // Full leaderboard (6 teams with bars)
  const fullLeaderboard = useMemo(() => {
    const maxScore = Math.max(1, ...teams.map(t => scores[t.id] || 0));
    return teams.map((t, i) => {
      const pens = (PENALTIES || []).filter(p => p.team === t.name);
      return {
        ...t, rank: i + 1, score: scores[t.id] || 0, pct: ((scores[t.id] || 0) / maxScore) * 100,
        penalty: pens.reduce((s, p) => s + (p.points || 0), 0),
        penaltyNote: pens.map(p => `${p.location || ''} — ${p.reason}`).join(' · '),
      };
    });
  }, [teams, scores]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* HERO 1 — KPI giganti */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: C.textSec, textTransform: 'uppercase', marginBottom: 4 }}>Posizione</div>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 32, fontWeight: 900, color: myRank === 1 ? '#FFD700' : myRank === 2 ? '#C0C0C0' : myRank === 3 ? '#CD7F32' : C.textPri, lineHeight: 1 }}>
            #{myRank}
            <span style={{ fontSize: 16, color: C.textSec, fontWeight: 400 }}>/{teams.length}</span>
          </div>
          {rankDelta != null && rankDelta !== 0 && (
            <div style={{ fontSize: 12, color: rankDelta > 0 ? C.green : C.red, marginTop: 2, fontWeight: 700 }}>
              {rankDelta > 0 ? `▲ ${rankDelta}` : `▼ ${Math.abs(rankDelta)}`}
            </div>
          )}
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: C.textSec, textTransform: 'uppercase', marginBottom: 4 }}>Punti totali</div>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 32, fontWeight: 900, color: C.red, lineHeight: 1 }}>{myScore.toFixed(0)}</div>
          <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>stagione</div>
        </div>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: C.textSec, textTransform: 'uppercase', marginBottom: 4 }}>Ultima gara</div>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 32, fontWeight: 900, color: C.green, lineHeight: 1 }}>+{lastRaceScore.toFixed(0)}</div>
          <div style={{ fontSize: 12, color: C.textSec, marginTop: 2 }}>{lastRaceEvent?.location?.slice(0, 12) || '—'}</div>
        </div>
      </div>

      {/* HERO 2 — Trend campionato */}
      {sortedRaces.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, color: C.textPri, textTransform: 'uppercase' }}>📈 Trend campionato</div>
            <div style={{ fontSize: 12, color: C.textSec }}>
              <span style={{ color: C.green, fontWeight: 700 }}>━ Tu</span> · <span style={{ opacity: 0.6 }}>━ Altri team</span>
            </div>
          </div>
          {renderTrend()}
        </div>
      )}

      {/* HERO 3 — Race card */}
      <div style={{
        background: `linear-gradient(135deg, ${C.surface2} 0%, #0B0B0F 100%)`,
        border: `1px solid ${C.border}`,
        borderRadius: 16,
        padding: 20,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.03, background: 'repeating-linear-gradient(45deg, #FFF 25%, transparent 25%, transparent 75%, #FFF 75%, #FFF), repeating-linear-gradient(45deg, #FFF 25%, transparent 25%, transparent 75%, #FFF 75%, #FFF)', backgroundPosition: '0 0, 10px 10px', backgroundSize: '20px 20px', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <div style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 2, color: C.red, fontWeight: 900 }}>
                {daysUntil === 0 ? 'GARA OGGI' : 'PROSSIMA GARA'}
              </div>
              {daysUntil === 0 && (
                <span style={{ fontSize: 14, padding: '2px 7px', borderRadius: 100, background: C.red, color: '#fff', fontWeight: 900, letterSpacing: 1, animation: 'pulse 1.6s ease-in-out infinite' }}>
                  LIVE
                </span>
              )}
            </div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 24, fontWeight: 900, color: C.textPri, lineHeight: 1.1 }}>
              {nextRaceEvent?.type === 'sprint' ? '🏎️ SPRINT — ' : ''}{nextRaceEvent?.location || '?'}
            </div>
            <div style={{ fontSize: 16, color: C.textSec, marginTop: 4 }}>{nextRaceEvent?.date}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, textTransform: 'uppercase', color: C.textSec, marginBottom: 4 }}>
              {daysUntil === 0 ? (activeRaceInfo?.timeLocked ? 'IN CORSO' : 'SCHIERAMENTO') : 'SCHIERAMENTO'}
            </div>
            {daysUntil !== null ? (
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 26, fontWeight: 900, color: daysUntil <= 1 ? C.amber : C.textPri, lineHeight: 1 }}>
                {daysUntil === 0 ? 'OGGI' : daysUntil < 0 ? 'IN CORSO' : `-${daysUntil}g`}
              </div>
            ) : null}
          </div>
        </div>

        <button
          onClick={() => onNavigate?.('squadre')}
          style={{
            position: 'relative', zIndex: 1, marginTop: 16,
            width: '100%', padding: '14px 16px', borderRadius: 12,
            border: `1px solid ${activeRaceInfo?.timeLocked ? C.border : lineupConfirmed ? C.green + '88' : C.amber + '88'}`,
            background: activeRaceInfo?.timeLocked ? 'rgba(0,0,0,0.4)' : lineupConfirmed ? C.green + '15' : C.amber + '15',
            color: activeRaceInfo?.timeLocked ? C.textSec : lineupConfirmed ? C.green : C.amber,
            fontSize: 17, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1,
            cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 22 }}>{activeRaceInfo?.timeLocked ? '🔒' : lineupConfirmed ? '✅' : '⚠️'}</span>
            {activeRaceInfo?.timeLocked ? 'Formazione bloccata' : lineupConfirmed ? 'Formazione confermata' : 'Schiera ora'}
          </span>
          <span style={{ fontSize: 18 }}>→</span>
        </button>
      </div>

      {/* SMART ACTIONS — solo se rilevanti, max 2 */}
      {smartActions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {smartActions.map((a, i) => (
            <div key={i} onClick={a.onClick} style={{
              cursor: a.onClick ? 'pointer' : 'default',
              background: a.color + '12', border: `1px solid ${a.color}55`, borderRadius: 12,
              padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 22 }}>
                {a.kind === 'lineup' ? '⚡' : a.kind === 'dnf' ? '🚨' : '💰'}
              </span>
              <div style={{ flex: 1, fontSize: 15, fontWeight: 700, color: a.color }}>{a.label}</div>
              {a.cta && <div style={{ fontSize: 13, color: a.color, fontWeight: 800 }}>{a.cta}</div>}
            </div>
          ))}
        </div>
      )}

      {/* CLASSIFICA COMPLETA con barre */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, color: C.textPri, textTransform: 'uppercase', marginBottom: 12 }}>🏆 Classifica</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fullLeaderboard.map(t => {
            const isMe = t.id === currentUser?.id;
            return (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: t.rank === 1 ? '#FFD700' : t.rank === 2 ? '#C0C0C0' : t.rank === 3 ? '#CD7F32' : C.surface2,
                  color: t.rank <= 3 ? '#000' : C.textSec,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 900, flexShrink: 0,
                }}>{t.rank}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontSize: 15, fontWeight: isMe ? 800 : 600, color: isMe ? C.textPri : C.textSec, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {isMe ? '★ ' : ''}{t.name}
                    </span>
                    <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 16, fontWeight: 900, color: isMe ? C.green : C.textPri, flexShrink: 0 }}>
                      {t.score.toFixed(1)}
                    </span>
                  </div>
                  {t.penalty > 0 && (
                    <div style={{ fontSize: 11, color: C.amber, fontWeight: 700, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>⚠️ −{t.penalty} pt penalità</span>
                      <span style={{ color: C.textSec, fontWeight: 500 }}>· {t.penaltyNote}</span>
                    </div>
                  )}
                  <div style={{ height: 6, background: C.surface2, borderRadius: 6, marginTop: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${t.pct}%`, background: isMe ? `linear-gradient(90deg, ${C.green}, ${C.green}aa)` : `linear-gradient(90deg, ${C.red}88, ${C.red}44)`, borderRadius: 6 }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* INFO STRIP compatta */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '12px 14px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center', minWidth: 70 }}>
          <div style={{ fontSize: 11, color: C.textSec, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>💰 Budget</div>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 800, color: '#FFD700' }}>{currentUser?.budget || 0}<span style={{ fontSize: 12, color: C.textSec }}>M</span></div>
        </div>
        <div style={{ textAlign: 'center', minWidth: 70 }}>
          <div style={{ fontSize: 11, color: C.textSec, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>🔄 Switch</div>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 800, color: switchesUsed >= MAX_SWITCHES ? C.red : C.textPri }}>{switchesUsed}<span style={{ fontSize: 12, color: C.textSec }}>/{MAX_SWITCHES}</span></div>
        </div>
        <div style={{ textAlign: 'center', minWidth: 70 }}>
          <div style={{ fontSize: 11, color: C.textSec, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>👥 Piloti</div>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 800, color: C.textPri }}>{myPilots.length}</div>
        </div>
        <div style={{ textAlign: 'center', minWidth: 90 }}>
          <div style={{ fontSize: 11, color: C.textSec, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>📅 Asta</div>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 800, color: auctionDays != null && auctionDays <= 7 ? C.amber : C.textPri }}>
            {auctionDays != null ? (auctionDays === 0 ? 'OGGI' : `${auctionDays}g`) : '—'}
          </div>
        </div>
      </div>

      {/* 2) Card "La tua formazione" */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.textSec }}>LA TUA FORMAZIONE</div>
          <button onClick={() => onNavigate?.('squadre')} style={{ background: C.red, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer' }}>
            {activeRaceInfo?.timeLocked ? 'Vedi →' : lineupConfirmed ? 'Modifica →' : 'Schiera →'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {/* Titolari */}
          {[0, 1, 2].map(i => {
            const p = lineupPilots[i];
            return (
              <div key={i} style={{ background: C.surface2, border: `1px solid ${p ? (F1_TEAM_COLORS[p.team] || '#555') + '55' : C.border}`, borderRadius: 10, padding: '12px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                {p ? (
                  <>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: F1_TEAM_COLORS[p.team] || '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: '#fff', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.2)' }}>
                      {p.abbreviation}
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: C.textPri, textAlign: 'center', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{p.name.split(' ').slice(-1)[0]}</div>
                  </>
                ) : (
                  <div style={{ color: C.textSec, fontSize: 14, textAlign: 'center', marginTop: 10 }}>SLOT<br />VUOTO</div>
                )}
              </div>
            );
          })}
          {/* Panchinaro */}
          <div style={{ background: C.surface2, border: `1px dashed ${C.border}`, borderRadius: 10, padding: '12px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0.7 }}>
            {benchPilots[0] ? (
              <>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.surface, border: `2px solid ${F1_TEAM_COLORS[benchPilots[0].team] || '#555'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color: C.textSec }}>
                  {benchPilots[0].abbreviation}
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.textSec, textAlign: 'center', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{benchPilots[0].name.split(' ').slice(-1)[0]}</div>
                <div style={{ fontSize: 14, background: C.surface, color: C.textSec, padding: '2px 6px', borderRadius: 4, marginTop: -2 }}>SUB</div>
              </>
            ) : (
              <div style={{ color: C.textSec, fontSize: 14, textAlign: 'center', marginTop: 10 }}>NESSUN<br />SUB</div>
            )}
          </div>
        </div>
      </div>

      {/* 3) Card “Punti” & 4) Leaderboard */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, color: lastRace?.isSprint ? C.amber : C.textSec, marginBottom: 2 }}>{lastRace?.isSprint ? 'ULTIMA SPRINT' : 'ULTIMO GP'}</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: C.textPri }}>{lastRaceEvent?.location || '—'}</div>
            </div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 24, fontWeight: 900, color: C.red, textAlign: 'right', lineHeight: 1 }}>
              {lastRaceScore.toFixed(1)}
              <span style={{ fontSize: 14, fontWeight: 400, color: C.textSec, display: 'block' }}>PUNTI TEAM</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lastRaceMyBreakdown.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.surface2, padding: '8px 12px', borderRadius: 10 }}>
                <div style={{ width: 3, height: 26, background: F1_TEAM_COLORS[r.pilot?.team] || '#555', borderRadius: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.textPri }}>{r.pilot?.abbreviation} <span style={{ color: C.textSec, fontWeight: 500, fontSize: 15 }}>{r.pilot?.name.split(' ').slice(-1)[0]}</span></div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    {r.subbedIn && <span style={{ fontSize: 14, padding: '2px 6px', background: C.amber + '22', color: C.amber, borderRadius: 10, fontWeight: 700 }}>SUB IN ⇡</span>}
                    {r.dnf && !r.subbedIn && <span style={{ fontSize: 14, padding: '2px 6px', background: C.red + '22', color: C.red, borderRadius: 10, fontWeight: 700 }}>DNF</span>}
                    {!r.dnf && <span style={{ fontSize: 14, padding: '2px 6px', background: C.surface, color: C.textSec, borderRadius: 10 }}>P{r.position}</span>}
                    {r.overtakes > 0 && <span style={{ fontSize: 14, padding: '2px 6px', background: C.surface, color: C.textSec, borderRadius: 10 }}>OVT +{r.overtakes}</span>}
                    {r.dotdRank === 1 && <span style={{ fontSize: 14, padding: '2px 6px', background: '#FFD70033', color: '#FFD700', borderRadius: 10, fontWeight: 800, border: '1px solid #FFD70066' }}>🥇 1° DOTD</span>}
                    {r.dotdRank === 2 && <span style={{ fontSize: 14, padding: '2px 6px', background: '#C0C0C033', color: '#C0C0C0', borderRadius: 10, fontWeight: 800, border: '1px solid #C0C0C066' }}>🥈 2° DOTD</span>}
                    {r.dotdRank === 3 && <span style={{ fontSize: 14, padding: '2px 6px', background: '#CD7F3233', color: '#CD7F32', borderRadius: 10, fontWeight: 800, border: '1px solid #CD7F3266' }}>🥉 3° DOTD</span>}
                  </div>
                </div>
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 900, color: C.green }}>
                  +{r.pts.total.toFixed(1)}
                </div>
              </div>
            ))}
            {lastRaceMyBreakdown.length === 0 && (
              <div style={{ fontSize: 15, color: C.textSec, textAlign: 'center', padding: '10px 0' }}>Nessun dato per l'ultima corsa.</div>
            )}
          </div>
        </div>

      </div>

      {/* TIMELINE prossimi eventi (sezione finale) */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px 14px 14px 20px' }}>
        <div style={{ fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: C.textPri, marginBottom: 12 }}>📅 Prossimi eventi</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
          <div style={{ position: 'absolute', left: 4, top: 6, bottom: 6, width: 2, background: C.border }} />
          {nextEvents.map((ev, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
              <div style={{ width: 10, height: 10, borderRadius: ev.type === 'auction' ? 2 : '50%', background: ev.type === 'auction' ? C.amber : C.red, border: `2px solid ${C.surface}`, flexShrink: 0 }} />
              <div style={{ flex: 1, transform: 'translateY(-2px)' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: ev.type === 'auction' ? C.amber : C.textPri, lineHeight: 1.2 }}>
                  {ev.type === 'sprint' ? '🏎️ ' : ev.type === 'race' ? '🏁 ' : '💰 '}{ev.location}
                </div>
                <div style={{ fontSize: 13, color: C.textSec, marginTop: 2 }}>{ev.date}</div>
              </div>
            </div>
          ))}
          {nextEvents.length === 0 && (
            <div style={{ fontSize: 14, color: C.textSec, textAlign: 'center', padding: 20 }}>Nessun evento futuro</div>
          )}
        </div>
      </div>

    </div>
  );
}
