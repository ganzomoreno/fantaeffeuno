'use client';

import { useMemo } from 'react';
import { calculatePilotPoints, calculateRaceTeamScore } from '@/lib/scoring';
import { MAX_SWITCHES } from '@/lib/data';

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
  const completedSet = useMemo(() => new Set(races.map(r => r.calendarIndex)), [races]);
  const nextRaceIdx = useMemo(
    () => calendar.findIndex((ev, i) => ev.type === 'race' && !completedSet.has(i)),
    [calendar, completedSet]
  );
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── SECTION A: Hero KPI ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>

        {/* Posizione */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 10px' }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: C.textSec, marginBottom: 6 }}>POSIZIONE</div>
          <div style={{ fontFamily: "'Orbitron', monospace", fontWeight: 900, lineHeight: 1, color: C.textPri }}>
            <span style={{ fontSize: 24 }}>#{myRank}</span>
            <span style={{ fontSize: 12, color: C.textSec }}>/{teams.length}</span>
          </div>
          {rankDelta !== null && (
            <div style={{ fontSize: 10, marginTop: 5, color: rankDelta > 0 ? C.green : rankDelta < 0 ? C.red : C.textSec }}>
              {rankDelta > 0 ? `▲ +${rankDelta}` : rankDelta < 0 ? `▼ ${rankDelta}` : '— stabile'}
            </div>
          )}
        </div>

        {/* Punti */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 10px' }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: C.textSec, marginBottom: 6 }}>PUNTI TOT</div>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 24, fontWeight: 900, color: C.red, lineHeight: 1 }}>
            {myScore.toFixed(1)}
          </div>
          {lastRaceScore > 0 && (
            <div style={{ fontSize: 10, marginTop: 5, color: C.green }}>+{lastRaceScore.toFixed(1)} ultima</div>
          )}
        </div>

        {/* Prossima gara */}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 10px' }}>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: C.textSec, marginBottom: 6 }}>PROSSIMA</div>
          {nextRaceEvent ? (
            <>
              <div style={{ fontWeight: 700, fontSize: 12, color: C.textPri, lineHeight: 1.3 }}>{nextRaceEvent.location}</div>
              <div style={{ fontSize: 10, marginTop: 5, color: daysUntil != null && daysUntil <= 3 ? C.amber : C.textSec }}>
                {daysUntil == null ? '' : daysUntil === 0 ? 'OGGI' : daysUntil < 0 ? 'IN CORSO' : `tra ${daysUntil}g`}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: C.textSec }}>Fine stagione</div>
          )}
        </div>
      </div>

      {/* ── SECTION B: Race Readiness ────────────────────────────────────────── */}
      {nextRaceEvent && (
        <div style={{
          background: C.surface,
          border: `1px solid ${lineupConfirmed ? C.green + '44' : C.amber + '55'}`,
          borderRadius: 12, padding: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.textSec }}>
                FORMAZIONE — {nextRaceEvent.location}
              </div>
              <div style={{ fontSize: 11, color: C.textSec, marginTop: 2 }}>{nextRaceEvent.date}</div>
            </div>
            <span style={{
              padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
              background: lineupConfirmed ? C.green + '22' : C.amber + '22',
              color: lineupConfirmed ? C.green : C.amber,
              border: `1px solid ${lineupConfirmed ? C.green + '55' : C.amber + '55'}`,
              flexShrink: 0,
            }}>
              {lineupConfirmed ? '✓ CONFERMATA' : '⚠ DA IMPOSTARE'}
            </span>
          </div>

          {/* Mini preview */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {/* Titolari */}
            {[0, 1, 2].map(i => {
              const p = lineupPilots[i];
              return (
                <div key={i} style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
                  background: p ? C.green + '18' : C.surface2,
                  color: p ? C.green : C.textSec,
                  border: `1px solid ${p ? C.green + '44' : C.border}`,
                  borderStyle: p ? 'solid' : 'dashed',
                }}>
                  {p ? p.name : 'SLOT VUOTO'}
                </div>
              );
            })}
            {/* Panchina: solo se 4 piloti E lineup già confermata */}
            {myPilots.length === 4 && lineupConfirmed && benchPilots[0] && (
              <div style={{
                padding: '5px 10px', borderRadius: 8, fontSize: 11,
                background: C.surface2, color: C.textSec, border: `1px solid ${C.border}`,
              }}>
                🪑 {benchPilots[0].name}
              </div>
            )}
          </div>

          {myPilots.length === 0 ? (
            <div style={{ fontSize: 12, color: C.textSec }}>Nessun pilota — attendi l&apos;asta!</div>
          ) : (
            <button
              onClick={() => onNavigate?.('squadre')}
              style={{
                background: lineupConfirmed ? 'transparent' : C.red,
                border: `1px solid ${lineupConfirmed ? C.border : C.red}`,
                borderRadius: 8, color: lineupConfirmed ? C.textSec : '#fff',
                padding: '8px 16px', cursor: 'pointer', fontSize: 11,
                fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
              }}
            >
              {lineupConfirmed ? 'Modifica formazione' : 'SCHIERA ORA →'}
            </button>
          )}
        </div>
      )}

      {/* ── SECTION C: Trend ultime gare ─────────────────────────────────────── */}
      {trendData.length > 0 && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.textSec, marginBottom: 14 }}>
            TREND ULTIME {trendData.length} GARE
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 68 }}>
            {trendData.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 9, color: C.textSec }}>{d.pts.toFixed(0)}</div>
                <div style={{
                  width: '100%', borderRadius: 4,
                  background: i === trendData.length - 1 ? C.red : C.surface2,
                  border: `1px solid ${i === trendData.length - 1 ? C.red : C.border}`,
                  height: `${Math.max((d.pts / maxTrend) * 46, 4)}px`,
                  transition: 'height 0.3s ease',
                }} />
                <div style={{ fontSize: 9, color: C.textSec, textTransform: 'uppercase', textAlign: 'center' }}>{d.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECTION D: Ultima gara recap ──────────────────────────────────────── */}
      {lastRace && lastRaceEvent && (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: 2, color: C.textSec, marginBottom: 4 }}>ULTIMA GARA</div>
              <div style={{ fontWeight: 700, fontSize: 15, color: C.textPri }}>🏁 {lastRaceEvent.location}</div>
              <div style={{ fontSize: 11, color: C.textSec, marginTop: 2 }}>{lastRaceEvent.date}</div>
            </div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 28, fontWeight: 900, color: C.red }}>
              {lastRaceScore.toFixed(1)}
              <span style={{ fontSize: 11, fontWeight: 400, color: C.textSec, display: 'block', textAlign: 'right' }}>punti</span>
            </div>
          </div>

          {lastTopDriver && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', background: C.surface2, borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: C.textSec }}>TOP DRIVER</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: C.textPri }}>{lastTopDriver.pilot?.name}</div>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, alignItems: 'center' }}>
                {lastTopDriver.fastestLap && (
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: '#9B59B622', color: '#B87AF7', border: '1px solid #9B59B644' }}>FL</span>
                )}
                {lastTopDriver.dotdRank === 1 && (
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: '#FFD70022', color: '#FFD700', border: '1px solid #FFD70044' }}>DOTD</span>
                )}
                {lastTopDriver.dnf && (
                  <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 10, background: C.red + '22', color: C.red, border: `1px solid ${C.red}44` }}>DNF</span>
                )}
                <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>{lastTopDriver.pts.toFixed(1)} pts</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CLASSIFICA GENERALE ───────────────────────────────────────────────── */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, color: C.textSec, marginBottom: 10 }}>
          CLASSIFICA GENERALE
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {teams.map((t, i) => {
            const isMe = t.id === currentUser?.id;
            return (
              <div key={t.id} style={{
                background: isMe
                  ? `linear-gradient(135deg, rgba(225,6,0,0.18), rgba(225,6,0,0.06))`
                  : C.surface,
                border: `1px solid ${isMe ? C.red + '66' : i < 3 ? MEDALS[i] + '44' : C.border}`,
                borderRadius: 10, padding: '11px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: i < 3 ? MEDALS[i] : C.surface2,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Orbitron', monospace", fontWeight: 900, fontSize: 13,
                  color: i < 3 ? '#000' : C.textSec,
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {t.name}
                    {isMe && <span style={{ fontSize: 9, color: C.red, marginLeft: 6 }}>← TU</span>}
                  </div>
                  <div style={{ fontSize: 11, color: C.textSec }}>{t.owner}</div>
                </div>
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 19, fontWeight: 900, color: i === 0 ? C.red : C.textPri, flexShrink: 0 }}>
                  {(scores[t.id] || 0).toFixed(1)}
                </div>
              </div>
            );
          })}
        </div>
        {races.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: C.textSec, fontSize: 13 }}>
            Nessuna gara disputata. Inserisci i risultati dal pannello Admin.
          </div>
        )}
      </div>

    </div>
  );
}
