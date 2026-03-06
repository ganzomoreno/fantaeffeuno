'use client';

import { useMemo, useState } from 'react';
import { calculatePilotPoints, calculateRaceTeamScore } from '@/lib/scoring';
import { F1_TEAM_COLORS } from '@/lib/data';

const C = {
    surface: '#14151C',
    surface2: '#1A1B24',
    border: '#2A2D3A',
    textPri: '#EDEEF3',
    textSec: '#A9ABBA',
    red: '#E10600',
    green: '#00FF41',
    amber: '#FFB700',
    blue: '#318CE7'
};

const MEDALS = ['#FFD700', '#C0C0C0', '#CD7F32'];

export default function Risultati({ races, pilots, teams, scores, lineups, reserves }) {
    const [activeTab, setActiveTab] = useState('team'); // Default 'team'

    const [selectedTeamId, setSelectedTeamId] = useState(null);
    const [hoveredTeamId, setHoveredTeamId] = useState(null);

    // ─── AGGREGATE PILOT STATS ──────────────────────────────────────────
    const pilotStats = useMemo(() => {
        const stats = {};
        pilots.forEach(p => {
            stats[p.id] = {
                pilot: p, races: 0, totalPts: 0, overtakes: 0,
                dnfs: 0, dotds: 0, bestFinish: 99,
                history: [] // [pt, pt, ...]
            };
        });

        races.forEach(r => {
            (r.results || []).forEach(res => {
                const pStat = stats[res.pilotId];
                if (!pStat) return;

                const pts = calculatePilotPoints(res);
                pStat.races += 1;
                pStat.totalPts += pts.total;
                pStat.overtakes += (res.overtakes || 0);
                if (res.dnf) pStat.dnfs += 1;
                if (res.dotdRank === 1) pStat.dotds += 1;
                if (!res.dnf && res.position > 0 && res.position < pStat.bestFinish) pStat.bestFinish = res.position;

                pStat.history.push(pts.total);
            });
        });

        return Object.values(stats).filter(s => s.races > 0);
    }, [races, pilots]);

    // ─── AGGREGATE TEAM PROGRESSION ─────────────────────────────────────
    const teamProgression = useMemo(() => {
        const history = {};
        teams.forEach(t => { history[t.id] = { team: t, progression: [], singleBest: 0 }; });

        let runningTotals = {};
        teams.forEach(t => runningTotals[t.id] = 0);

        races.forEach((r, idx) => {
            teams.forEach(t => {
                const raceScore = calculateRaceTeamScore(r, lineups, reserves, pilots, t.id);
                runningTotals[t.id] += raceScore;
                history[t.id].progression.push(runningTotals[t.id]);
                if (raceScore > history[t.id].singleBest) history[t.id].singleBest = raceScore;
            });
        });
        return Object.values(history).sort((a, b) => b.progression[b.progression.length - 1] - a.progression[a.progression.length - 1]);
    }, [races, teams, lineups, reserves, pilots]);

    // Insights
    const bestOvertaker = [...pilotStats].sort((a, b) => b.overtakes - a.overtakes)[0] || null;
    const mostDnfs = [...pilotStats].sort((a, b) => b.dnfs - a.dnfs)[0] || null;
    const highestAvg = [...pilotStats].sort((a, b) => (b.totalPts / b.races) - (a.totalPts / a.races))[0] || null;
    const mostDotds = [...pilotStats].sort((a, b) => b.dotds - a.dotds)[0] || null;
    const bestValue = [...pilotStats].filter(p => p.pilot.purchase_price > 0).sort((a, b) => (b.totalPts / b.pilot.purchase_price) - (a.totalPts / a.pilot.purchase_price))[0] || null;

    if (races.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: 60, color: C.textSec, fontSize: 13 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🏁</div>
                Nessuna gara disponibile per le statistiche.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── HEADER ────────────────────────────────────────── */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: C.textSec, fontWeight: 900, marginBottom: 4 }}>ANALISI DATI</div>
                    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 20, fontWeight: 900, color: C.textPri, lineHeight: 1.1 }}>RISULTATI E STATISTICHE</div>
                </div>
                <div style={{ display: 'flex', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' }}>
                    {['piloti', 'team'].map(v => (
                        <button
                            key={v} onClick={() => setActiveTab(v)}
                            style={{
                                padding: '8px 14px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                                textTransform: 'uppercase', letterSpacing: 1,
                                background: activeTab === v ? C.red : 'transparent',
                                color: activeTab === v ? '#fff' : C.textSec,
                            }}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </div>

            {activeTab === 'piloti' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* NERD CARDS */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
                        <StatCard title="MOST OVERTAKES" icon="⚔️" pilotStat={bestOvertaker} value={`${bestOvertaker?.overtakes} sorpassi`} color={C.green} />
                        <StatCard title="HIGHEST AVG" icon="🔥" pilotStat={highestAvg} value={`${(highestAvg?.totalPts / highestAvg?.races || 0).toFixed(1)} pt/gara`} color={C.amber} />
                        <StatCard title="DNFs LEADER" icon="💥" pilotStat={mostDnfs} value={`${mostDnfs?.dnfs} ritiri`} color={C.red} />
                        <StatCard title="FAN FAVORITE" icon="👑" pilotStat={mostDotds} value={`${mostDotds?.dotds} DOTD`} color={'#FFD700'} />
                        <StatCard title="BEST VALUE" icon="💸" pilotStat={bestValue} value={`${(bestValue?.totalPts / bestValue?.pilot.purchase_price || 0).toFixed(1)} pt/FM`} color={C.blue} />
                    </div>

                    {/* TOTAL PILOT LEADERBOARD BAR CHART */}
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.textSec, marginBottom: 16 }}>PUNTEGGI CUMULATI PILOTI</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {[...pilotStats].sort((a, b) => b.totalPts - a.totalPts).map((s, i) => {
                                const maxPts = pilotStats.reduce((m, x) => Math.max(m, x.totalPts), 1);
                                const widthPct = Math.max(5, (s.totalPts / maxPts) * 100);
                                return (
                                    <div key={s.pilot.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div style={{ width: 14, fontSize: 10, color: C.textSec, textAlign: 'right' }}>{i + 1}</div>
                                        <div style={{ width: 40, fontSize: 11, fontWeight: 700, color: C.textPri }}>{s.pilot.abbreviation}</div>
                                        <div style={{ flex: 1, height: 20, background: C.surface2, borderRadius: 4, overflow: 'hidden' }}>
                                            <div style={{ width: `${widthPct}%`, height: '100%', background: F1_TEAM_COLORS[s.pilot.team] || C.textSec, transition: 'width 0.5s ease-out' }} />
                                        </div>
                                        <div style={{ width: 40, fontFamily: "'Orbitron', monospace", fontSize: 12, color: C.textPri, textAlign: 'right' }}>{s.totalPts.toFixed(1)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'team' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* PROGRESSIVE LINE SVG CHART */}
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.textSec, marginBottom: 16 }}>PROGRESSIONE CAMPIONATO</div>
                        <div style={{ width: '100%', height: 260, position: 'relative' }}>
                            {/* CSS SVG Chart */}
                            <svg width="100%" height="100%" viewBox={`0 0 ${races.length * 100} 200`} preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                                {/* Grid lines */}
                                {[0, 50, 100, 150, 200].map(y => (
                                    <line key={y} x1="0" y1={y} x2={races.length * 100} y2={y} stroke={C.border} strokeWidth="1" strokeDasharray="4 4" />
                                ))}
                                {/* Lines */}
                                {teamProgression.map((tp, i) => {
                                    const maxScore = Math.max(1, ...teamProgression.map(t => Math.max(...t.progression)));
                                    const points = tp.progression.map((score, rIdx) => {
                                        const x = rIdx * (races.length > 1 ? 100 / (races.length - 1) * races.length : 100);
                                        const y = 200 - ((score / maxScore) * 200);
                                        return `${x},${y}`;
                                    }).join(' ');

                                    const isHighlighted = (selectedTeamId === tp.team.id) || (hoveredTeamId === tp.team.id);
                                    let isMuted = false;
                                    if (selectedTeamId && selectedTeamId !== tp.team.id) isMuted = true;
                                    if (!selectedTeamId && hoveredTeamId && hoveredTeamId !== tp.team.id) isMuted = true;

                                    return (
                                        <polyline
                                            key={tp.team.id}
                                            points={points}
                                            fill="none"
                                            stroke={MEDALS[i] || C.textSec}
                                            strokeWidth={isHighlighted ? "6" : (i === 0 ? "4" : "2")}
                                            strokeLinejoin="round"
                                            style={{
                                                filter: isHighlighted ? `drop-shadow(0 0 8px ${MEDALS[i] || C.textPri})` : (i === 0 && !isMuted ? `drop-shadow(0 0 4px ${MEDALS[i]})` : 'none'),
                                                opacity: isMuted ? 0.15 : 1,
                                                transition: 'all 0.3s ease-out',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => setSelectedTeamId(selectedTeamId === tp.team.id ? null : tp.team.id)}
                                            onMouseEnter={() => setHoveredTeamId(tp.team.id)}
                                            onMouseLeave={() => setHoveredTeamId(null)}
                                        />
                                    );
                                })}
                            </svg>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                                {races.map((r, i) => {
                                    const loc = r.location || "Gara";
                                    const synthetic = `(${loc.slice(0, 5).toLowerCase()})`;
                                    return <div key={i} style={{ fontSize: 9, color: C.textSec, textTransform: 'uppercase', fontWeight: 700 }}>{synthetic}</div>
                                })}
                            </div>
                        </div>
                    </div>

                    {/* TOTALS BAR CHART */}
                    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.textSec, marginBottom: 16 }}>PUNTEGGI CUMULATI SCUDERIE</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {teamProgression.map((tp, i) => {
                                const finalScore = tp.progression[tp.progression.length - 1];
                                const maxPts = teamProgression[0].progression[teamProgression[0].progression.length - 1] || 1;
                                const widthPct = Math.max(5, (finalScore / maxPts) * 100);
                                return (
                                    <div
                                        key={tp.team.id}
                                        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '6px 0', borderRadius: 8, background: (selectedTeamId === tp.team.id || hoveredTeamId === tp.team.id) ? `${C.surface2}` : 'transparent', transition: 'background 0.2s', paddingLeft: 8, paddingRight: 8 }}
                                        onClick={() => setSelectedTeamId(selectedTeamId === tp.team.id ? null : tp.team.id)}
                                        onMouseEnter={() => setHoveredTeamId(tp.team.id)}
                                        onMouseLeave={() => setHoveredTeamId(null)}
                                    >
                                        <div style={{ width: 14, fontSize: 10, fontWeight: 900, color: i < 3 ? MEDALS[i] : C.textSec, textAlign: 'right' }}>{i + 1}</div>
                                        <div style={{ width: 120, fontSize: 11, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tp.team.name}</div>
                                        <div style={{ flex: 1, height: 26, background: C.surface2, borderRadius: 6, overflow: 'hidden', border: `1px solid ${i === 0 ? C.red + '44' : C.border}` }}>
                                            <div style={{ width: `${widthPct}%`, height: '100%', background: i === 0 ? C.red : C.textSec, opacity: 0.8, transition: 'width 0.5s ease-out' }} />
                                        </div>
                                        <div style={{ width: 45, fontFamily: "'Orbitron', monospace", fontSize: 14, color: i === 0 ? C.red : C.textPri, textAlign: 'right', fontWeight: 900 }}>{finalScore.toFixed(1)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}

function StatCard({ title, icon, pilotStat, value, color }) {
    if (!pilotStat) return null;
    return (
        <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', color: C.textSec, letterSpacing: 1 }}>{title}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 24 }}>{icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{pilotStat.pilot.abbreviation}</div>
                    <div style={{ fontSize: 10, color }}>{value}</div>
                </div>
            </div>
        </div>
    );
}
