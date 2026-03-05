'use client';

import { useMemo } from 'react';
import { calculatePilotPoints, calculateRaceTeamScore } from '@/lib/scoring';
import { MAX_SWITCHES, F1_TEAM_COLORS } from '@/lib/data';

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

export default function Classifica({ teams, scores, races, pilots, lineups, reserves, calendar, currentUser, onNavigate }) {
  const myScore = scores[currentUser?.id] || 0;
  const myRank = teams.findIndex(t => t.id === currentUser?.id) + 1;

  // Next upcoming race
  const parseDate = (ddmmyyyy) => {
    const [d, m, y] = ddmmyyyy.split('/');
    return new Date(`${y}-${m}-${d}T15:00:00Z`);
  };
  const SIMULATED_TODAY = new Date('2026-03-10T12:00:00Z');

  const activeRaceInfo = useMemo(() => {
    let activeIdx = -1;
    let timeLocked = false;
    for (let i = 0; i < calendar.length; i++) {
      const ev = calendar[i];
      if (ev.type !== 'race') continue;
      const raceDate = parseDate(ev.date);
      const deadline = new Date(raceDate);
      deadline.setUTCDate(deadline.getUTCDate() - 1);
      deadline.setUTCHours(23, 59, 59, 999);

      if (SIMULATED_TODAY <= deadline) {
        activeIdx = i; timeLocked = false; break;
      } else {
        const reopenDate = new Date(raceDate);
        reopenDate.setUTCDate(reopenDate.getUTCDate() + 1);
        reopenDate.setUTCHours(0, 0, 0, 0);
        if (SIMULATED_TODAY < reopenDate) {
          activeIdx = i; timeLocked = true; break;
        }
      }
    }
    return { activeIdx, timeLocked };
  }, [calendar]);

  const nextRaceIdx = activeRaceInfo.activeIdx;
  const nextRaceEvent = nextRaceIdx >= 0 ? calendar[nextRaceIdx] : null;

  // Days until next race
  const daysUntil = useMemo(() => {
    if (!nextRaceEvent) return null;
    const [d, m, y] = nextRaceEvent.date.split('/');
    const diff = Math.ceil((new Date(`${y}-${m}-${d}`) - new Date().setHours(0, 0, 0, 0)) / 86400000);
    return diff;
  }, [nextRaceEvent]);

  // My lineup for next race
  const myPilots = useMemo(() => pilots.filter(p => p.owner === currentUser?.id), [pilots, currentUser]);
  const myNextLineup = nextRaceIdx >= 0 ? (lineups[`race_${nextRaceIdx}`] || {})[currentUser?.id] || [] : [];
  const lineupPilots = myNextLineup.map(id => pilots.find(p => p.id === id)).filter(Boolean);
  const benchPilots = myPilots.filter(p => !myNextLineup.includes(p.id));
  const lineupConfirmed = myNextLineup.length === 3;

  // Last completed race
  const lastRace = races.length > 0 ? races[races.length - 1] : null;
  const lastRaceEvent = lastRace ? calendar[lastRace.calendarIndex] : null;
  const lastRaceScore = useMemo(
    () => lastRace && currentUser ? calculateRaceTeamScore(lastRace, lineups, reserves, pilots, currentUser.id) : 0,
    [lastRace, lineups, reserves, pilots, currentUser]
  );

  // Top driver of last race for my team
  const lastTopDriver = useMemo(() => {
    if (!lastRace || !currentUser) return null;
    const lineup = (lineups[`race_${lastRace.calendarIndex}`] || {})[currentUser.id] || [];
    let best = null, bestPts = -1;
    (lastRace.results || []).forEach(r => {
      if (!lineup.includes(r.pilotId)) return;
      const pts = calculatePilotPoints(r);
      if (pts > bestPts) { bestPts = pts; best = { ...r, pts, pilot: pilots.find(p => p.id === r.pilotId) }; }
    });
    return best;
  }, [lastRace, currentUser, lineups, pilots]);

  // Trend: last 5 races bar chart data
  const trendData = useMemo(() => {
    return races.slice(-5).map(race => ({
      label: (calendar[race.calendarIndex]?.location || '?').slice(0, 3).toUpperCase(),
      pts: calculateRaceTeamScore(race, lineups, reserves, pilots, currentUser?.id),
    }));
  }, [races, calendar, lineups, reserves, pilots, currentUser]);
  const maxTrend = Math.max(...trendData.map(d => d.pts), 1);

  // Rank delta vs pre-last-race
  const rankDelta = useMemo(() => {
    if (races.length < 2 || !currentUser) return null;
    const prevRaces = races.slice(0, -1);
    const prevScores = {};
    teams.forEach(t => { prevScores[t.id] = prevRaces.reduce((s, r) => s + calculateRaceTeamScore(r, lineups, reserves, pilots, t.id), 0); });
    const prevRank = [...teams].sort((a, b) => (prevScores[b.id] || 0) - (prevScores[a.id] || 0)).findIndex(t => t.id === currentUser.id) + 1;
    return prevRank - myRank;
  }, [races, teams, lineups, pilots, currentUser, myRank]);

  // Next 3 Events (from SIMULATED_TODAY)
  const nextEvents = useMemo(() => {
    return calendar.filter(ev => {
      const d = parseDate(ev.date);
      return d >= SIMULATED_TODAY || (d.getUTCDate() === SIMULATED_TODAY.getUTCDate() && d.getUTCMonth() === SIMULATED_TODAY.getUTCMonth());
    }).slice(0, 3);
  }, [calendar]);

  // Next Auction
  const nextAuction = useMemo(() => {
    return calendar.find(ev => ev.type === 'auction' && parseDate(ev.date) >= SIMULATED_TODAY);
  }, [calendar]);

  // Top 3 Leaderboard
  const top3Teams = useMemo(() => {
    return teams.slice(0, 3).map((t, i) => ({ ...t, rank: i + 1, score: scores[t.id] || 0 }));
  }, [teams, scores]);

  // Points breakdown for last race
  const lastRaceMyBreakdown = useMemo(() => {
    if (!lastRace || !currentUser) return [];
    const lineup = (lineups[`race_${lastRace.calendarIndex}`] || {})[currentUser.id] || [];
    const reserveId = (reserves[`race_${lastRace.calendarIndex}`] || {})[currentUser.id];

    let dnfCount = 0;
    const resData = (lastRace.results || []).filter(r => lineup.includes(r.pilotId));
    resData.forEach(r => { if (r.dnf) dnfCount++; });

    let drivers = resData.map(r => ({
      ...r,
      pilot: pilots.find(p => p.id === r.pilotId),
      pts: calculatePilotPoints(r)
    }));

    if (dnfCount > 0 && reserveId) {
      const resResult = (lastRace.results || []).find(r => r.pilotId === reserveId);
      if (resResult && !resResult.dnf) {
        drivers.push({
          ...resResult,
          pilot: pilots.find(p => p.id === reserveId),
          pts: calculatePilotPoints(resResult),
          subbedIn: true
        });
      }
    }

    return drivers;
  }, [lastRace, currentUser, lineups, reserves, pilots]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* 1) Header “Race Week” */}
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
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: C.red, fontWeight: 900, marginBottom: 4 }}>RACE WEEK</div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 22, fontWeight: 900, color: C.textPri, lineHeight: 1.1 }}>{nextRaceEvent?.location || '?'}</div>
            <div style={{ fontSize: 12, color: C.textSec, marginTop: 4 }}>{nextRaceEvent?.date}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: C.textSec, marginBottom: 4 }}>SCHIERAMENTO</div>
            {daysUntil !== null ? (
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 24, fontWeight: 900, color: daysUntil <= 1 ? C.amber : C.textPri, lineHeight: 1 }}>
                {daysUntil === 0 ? 'OGGI' : daysUntil < 0 ? 'IN CORSO' : `-${daysUntil}g`}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'rgba(0,0,0,0.4)', borderRadius: 10, border: `1px solid ${lineupConfirmed && !activeRaceInfo?.timeLocked ? C.green + '44' : C.border}` }}>
          <span style={{ fontSize: 16 }}>{lineupConfirmed ? '✅' : '⚠️'}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: lineupConfirmed ? C.green : C.amber }}>
            {activeRaceInfo?.timeLocked ? 'Formazione Bloccata (In Gara)' : lineupConfirmed ? 'Formazione inviata e pronta' : 'Formazione da inviare!'}
          </span>
        </div>
      </div>

      {/* 2) Card “La tua formazione” */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.textSec }}>LA TUA FORMAZIONE</div>
          <button onClick={() => onNavigate?.('squadre')} style={{ background: C.red, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer' }}>
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
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: F1_TEAM_COLORS[p.team] || '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: '#fff', boxShadow: 'inset 0 0 10px rgba(0,0,0,0.2)' }}>
                      {p.abbreviation}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textPri, textAlign: 'center', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{p.name.split(' ').slice(-1)[0]}</div>
                  </>
                ) : (
                  <div style={{ color: C.textSec, fontSize: 10, textAlign: 'center', marginTop: 10 }}>SLOT<br />VUOTO</div>
                )}
              </div>
            );
          })}
          {/* Panchinaro */}
          <div style={{ background: C.surface2, border: `1px dashed ${C.border}`, borderRadius: 10, padding: '12px 6px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: 0.7 }}>
            {benchPilots[0] ? (
              <>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: C.surface, border: `2px solid ${F1_TEAM_COLORS[benchPilots[0].team] || '#555'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: C.textSec }}>
                  {benchPilots[0].abbreviation}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.textSec, textAlign: 'center', lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{benchPilots[0].name.split(' ').slice(-1)[0]}</div>
                <div style={{ fontSize: 9, background: C.surface, color: C.textSec, padding: '2px 6px', borderRadius: 4, marginTop: -2 }}>SUB</div>
              </>
            ) : (
              <div style={{ color: C.textSec, fontSize: 10, textAlign: 'center', marginTop: 10 }}>NESSUN<br />SUB</div>
            )}
          </div>
        </div>
      </div>

      {/* 3) Card “Punti” & 4) Leaderboard */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: C.textSec, marginBottom: 2 }}>ULTIMO GP</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>{lastRaceEvent?.location || '—'}</div>
            </div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 22, fontWeight: 900, color: C.red, textAlign: 'right', lineHeight: 1 }}>
              {lastRaceScore.toFixed(1)}
              <span style={{ fontSize: 10, fontWeight: 400, color: C.textSec, display: 'block' }}>PUNTI TEAM</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lastRaceMyBreakdown.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.surface2, padding: '8px 12px', borderRadius: 10 }}>
                <div style={{ width: 3, height: 26, background: F1_TEAM_COLORS[r.pilot?.team] || '#555', borderRadius: 2 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.textPri }}>{r.pilot?.abbreviation} <span style={{ color: C.textSec, fontWeight: 500, fontSize: 11 }}>{r.pilot?.name.split(' ').slice(-1)[0]}</span></div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    {r.subbedIn && <span style={{ fontSize: 9, padding: '2px 6px', background: C.amber + '22', color: C.amber, borderRadius: 10, fontWeight: 700 }}>SUB IN ⇡</span>}
                    {r.dnf && !r.subbedIn && <span style={{ fontSize: 9, padding: '2px 6px', background: C.red + '22', color: C.red, borderRadius: 10, fontWeight: 700 }}>DNF</span>}
                    {!r.dnf && <span style={{ fontSize: 9, padding: '2px 6px', background: C.surface, color: C.textSec, borderRadius: 10 }}>P{r.position}</span>}
                    {r.overtakes > 0 && <span style={{ fontSize: 9, padding: '2px 6px', background: C.surface, color: C.textSec, borderRadius: 10 }}>OVT +{r.overtakes}</span>}
                    {r.dotdRank && <span style={{ fontSize: 9, padding: '2px 6px', background: '#FFD70022', color: '#FFD700', borderRadius: 10, fontWeight: 700 }}>DOTD</span>}
                  </div>
                </div>
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 15, fontWeight: 900, color: C.green }}>
                  +{r.pts.total.toFixed(1)}
                </div>
              </div>
            ))}
            {lastRaceMyBreakdown.length === 0 && (
              <div style={{ fontSize: 11, color: C.textSec, textAlign: 'center', padding: '10px 0' }}>Nessun dato per l'ultima corsa.</div>
            )}
          </div>
        </div>

        {/* CLASSIFICA COMPATTA */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.textSec }}>CLASSIFICA</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {top3Teams.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: t.id === currentUser?.id ? C.surface2 : 'transparent', border: t.id === currentUser?.id ? `1px solid ${C.red}44` : 'none', padding: '6px 8px', borderRadius: 8 }}>
                <div style={{ width: 18, fontSize: 12, fontWeight: 900, color: t.rank === 1 ? MEDALS[0] : t.rank === 2 ? MEDALS[1] : MEDALS[2], textAlign: 'center' }}>{t.rank}</div>
                <div style={{ flex: 1, fontSize: 12, fontWeight: t.id === currentUser?.id ? 700 : 500, color: t.id === currentUser?.id ? C.textPri : C.textSec }}>{t.name}</div>
                <div style={{ fontSize: 12, fontFamily: "'Orbitron', monospace", fontWeight: 700, color: C.textPri }}>{t.score.toFixed(1)}</div>
              </div>
            ))}
            {myRank > 3 && (
              <>
                <div style={{ textAlign: 'center', color: C.textSec, fontSize: 10, margin: '2px 0' }}>•••</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.surface2, border: `1px solid ${C.red}44`, padding: '6px 8px', borderRadius: 8 }}>
                  <div style={{ width: 18, fontSize: 12, fontWeight: 900, color: C.textSec, textAlign: 'center' }}>{myRank}</div>
                  <div style={{ flex: 1, fontSize: 12, fontWeight: 700, color: C.textPri }}>TU ({currentUser?.name})</div>
                  <div style={{ fontSize: 12, fontFamily: "'Orbitron', monospace", fontWeight: 700, color: C.textPri }}>{myScore.toFixed(1)}</div>
                  <div style={{ fontSize: 10, color: C.textSec }}>(-{(top3Teams[0]?.score - myScore).toFixed(1)})</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 5) Wallet + mercato e 6) Timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Wallet */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 14 }}>💰</span>
              <span style={{ fontSize: 10, textTransform: 'uppercase', color: C.textSec, fontWeight: 700 }}>Budget</span>
            </div>
            <div style={{ fontSize: 20, fontFamily: "'Orbitron', monospace", fontWeight: 900, color: '#FFD700' }}>{currentUser?.budget} M</div>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: 14 }}>🔄</span>
              <span style={{ fontSize: 10, textTransform: 'uppercase', color: C.textSec, fontWeight: 700 }}>Switch</span>
            </div>
            <div style={{ fontSize: 20, fontFamily: "'Orbitron', monospace", fontWeight: 900, color: C.textPri }}>
              {MAX_SWITCHES - (currentUser?.switchesUsed || 0)}<span style={{ fontSize: 12, color: C.textSec }}>/5</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '14px 14px 14px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: C.textSec, marginBottom: 14 }}>PROSSIMI EVENTI</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
            <div style={{ position: 'absolute', left: 4, top: 6, bottom: 6, width: 2, background: C.border }} />
            {nextEvents.map((ev, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
                <div style={{ width: 10, height: 10, borderRadius: ev.type === 'auction' ? 2 : '50%', background: ev.type === 'auction' ? C.amber : C.red, border: `2px solid ${C.surface}` }} />
                <div style={{ transform: 'translateY(-2px)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: ev.type === 'auction' ? C.amber : C.textPri, lineHeight: 1.1 }}>{ev.location}</div>
                  <div style={{ fontSize: 10, color: C.textSec, marginTop: 3 }}>{ev.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 7) Notifiche intelligenti */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {daysUntil !== null && daysUntil <= 1 && !activeRaceInfo?.timeLocked && (
          <div style={{ background: C.amber + '15', border: `1px solid ${C.amber}44`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, color: C.amber, fontSize: 12, fontWeight: 600 }}>
            <span style={{ fontSize: 16 }}>⏱️</span>
            <div>Mancano poche ore alla chiusura schieramento!</div>
          </div>
        )}
        {nextAuction && (() => {
          const aucD = parseDate(nextAuction.date);
          const diff = Math.ceil((aucD - SIMULATED_TODAY.getTime()) / 86400000);
          if (diff <= 3 && diff >= 0) {
            return (
              <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, color: C.textPri, fontSize: 12, fontWeight: 600 }}>
                <span style={{ fontSize: 16 }}>💰</span>
                <div>Asta {diff === 0 ? 'OGGI' : `tra ${diff} giorni`}: prepara il budget!</div>
              </div>
            );
          }
          return null;
        })()}
        {(MAX_SWITCHES - (currentUser?.switchesUsed || 0)) <= 1 && (
          <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, color: C.textSec, fontSize: 12, fontWeight: 600 }}>
            <span style={{ fontSize: 16 }}>⚠️</span>
            <div>Attenzione: ti restano pochissimi Switch stagionali.</div>
          </div>
        )}
      </div>

    </div>
  );
}
