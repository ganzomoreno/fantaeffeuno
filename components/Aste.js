'use client';

import { useState, useMemo, useEffect } from 'react';
import { fetchAuctionLots } from '@/lib/db';
import { F1_TEAM_COLORS } from '@/lib/data';
import { Icon } from './ui';

const C = {
    surface: '#14151C',
    surface2: '#1A1B24',
    border: '#2A2D3A',
    textPri: '#EDEEF3',
    textSec: '#A9ABBA',
    red: '#E10600',
    amber: '#FFB700',
};

export default function Aste({ calendar }) {
    const [lots, setLots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeAuctionNum, setActiveAuctionNum] = useState(null);

    useEffect(() => {
        fetchAuctionLots().then(data => {
            setLots(data);
            if (data.length > 0) {
                // Find most recent auction number
                const latest = Math.max(...data.map(l => l.auctionNumber));
                setActiveAuctionNum(latest);
            }
            setLoading(false);
        }).catch(err => {
            console.error("Error fetching auction lots:", err);
            setLoading(false);
        });
    }, []);

    // Raggruppa per Numero Asta e calcola la progressione dei budget
    const groupedAuctions = useMemo(() => {
        // 1. Ordiniamo TUTTI i lotti per numero d'asta e ordine di battuta
        const sortedLots = [...lots].sort((a, b) => {
            if (a.auctionNumber !== b.auctionNumber) return a.auctionNumber - b.auctionNumber;
            return a.lotOrder - b.lotOrder;
        });

        // 2. Troviamo tutte le sessioni d'asta uniche
        const auctionNums = [...new Set(sortedLots.map(l => l.auctionNumber))].sort((a, b) => a - b);

        const sessions = [];
        const rollingBudgets = {}; // { teamId: balance }

        auctionNums.forEach(num => {
            const sessionLots = sortedLots.filter(l => l.auctionNumber === num);
            const budgetAdded = sessionLots[0]?.budgetAdded || 0;

            // Trova data dal calendario
            let dateStr = "Sconosciuta";
            let auctionCount = 0;
            for (let ev of calendar) {
                if (ev.type === 'auction') {
                    auctionCount++;
                    if (auctionCount === num) {
                        dateStr = ev.date;
                        break;
                    }
                }
            }

            const teamStats = {};

            sessionLots.forEach(lot => {
                const tId = lot.team.id;
                if (!teamStats[tId]) {
                    const prevBalance = rollingBudgets[tId] || 0;
                    teamStats[tId] = {
                        team: lot.team,
                        start: prevBalance + budgetAdded,
                        spent: 0,
                        end: prevBalance + budgetAdded,
                        pilotsWon: []
                    };
                }
                teamStats[tId].spent += lot.finalPrice;
                teamStats[tId].end -= lot.finalPrice;
                teamStats[tId].pilotsWon.push({ ...lot.pilot, price: lot.finalPrice });
            });

            // Assicuriamoci che tutti i team siano presenti nel recap
            const allInvolvedTeams = [...new Set(lots.map(l => JSON.stringify(l.team)))].map(s => JSON.parse(s));
            allInvolvedTeams.forEach(t => {
                if (!teamStats[t.id]) {
                    const prevBalance = rollingBudgets[t.id] || 0;
                    teamStats[t.id] = {
                        team: t,
                        start: prevBalance + budgetAdded,
                        spent: 0,
                        end: prevBalance + budgetAdded,
                        pilotsWon: []
                    };
                }
                // Aggiorniamo il rolling budget per la prossima asta
                rollingBudgets[t.id] = teamStats[t.id].end;
            });

            sessions.push({
                number: num,
                date: dateStr,
                lots: sessionLots,
                budgetRecap: Object.values(teamStats).sort((a, b) => b.spent - a.spent)
            });
        });

        return sessions.sort((a, b) => b.number - a.number);
    }, [lots, calendar]);

    if (loading) {
        return <div style={{ textAlign: 'center', padding: 40, color: C.textSec, fontSize: 13, fontFamily: "'Orbitron', monospace", letterSpacing: 2 }}>CARICAMENTO ASTE...</div>;
    }

    if (groupedAuctions.length === 0) {
        return (
            <div style={{ textAlign: 'center', padding: 60, color: C.textSec, fontSize: 13 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔨</div>
                Nessuna asta disputata finora.
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* ── HEADER ────────────────────────────────────────── */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 2, color: C.amber, fontWeight: 900, marginBottom: 4 }}>STORICO ACQUISTI</div>
                    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 20, fontWeight: 900, color: C.textPri, lineHeight: 1.1 }}>CRONOLOGIA ASTE</div>
                </div>
                <div style={{ background: C.surface2, borderRadius: 50, padding: 8, border: `1px solid ${C.amber}44`, color: C.amber, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon type="hammer" size={20} />
                </div>
            </div>

            {/* ── TABS NAV ────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none' }}>
                {groupedAuctions.map(a => (
                    <button
                        key={a.number}
                        onClick={() => setActiveAuctionNum(a.number)}
                        style={{
                            background: activeAuctionNum === a.number ? C.surface : 'transparent',
                            border: `1px solid ${activeAuctionNum === a.number ? C.amber : C.border}`,
                            color: activeAuctionNum === a.number ? C.textPri : C.textSec,
                            padding: '12px 20px', borderRadius: 12, cursor: 'pointer',
                            fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
                            whiteSpace: 'nowrap', transition: 'all 0.2s',
                            boxShadow: activeAuctionNum === a.number ? `0 4px 12px ${C.amber}22` : 'none'
                        }}
                    >
                        Sessione {a.number} <span style={{ opacity: 0.5, marginLeft: 8, fontSize: 10 }}>{a.date}</span>
                    </button>
                ))}
            </div>

            {/* ── ACTIVE AUCTION CONTENT ────────────────────────────────────────── */}
            {groupedAuctions.map(auction => {
                if (auction.number !== activeAuctionNum) return null;

                return (
                    <div key={auction.number} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                        {/* BUDGET RECAP CARD */}
                        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: C.textSec, marginBottom: 16 }}>
                                RIEPILOGO FINANZIARIO E COMPOSIZIONE SQUADRE
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {auction.budgetRecap.map((t, idx) => (
                                    <div key={t.team.id} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                                            <div>
                                                <div style={{ fontSize: 13, fontWeight: 800, color: C.textPri, marginBottom: 4 }}>{idx + 1}. {t.team.name}</div>
                                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                                    <div style={{ fontSize: 10, color: C.textSec }}>START: <span style={{ color: C.textPri, fontWeight: 700 }}>{t.start} FM</span></div>
                                                    <div style={{ fontSize: 10, color: C.red }}>SPESI: <span style={{ fontWeight: 700 }}>{t.spent} FM</span></div>
                                                    <div style={{ fontSize: 10, color: C.amber }}>END: <span style={{ fontWeight: 700 }}>{t.end} FM</span></div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: 11, fontWeight: 900, color: C.textPri, fontFamily: "'Orbitron', monospace" }}>{t.end} <span style={{ fontSize: 8, color: C.textSec }}>FM</span></div>
                                                <div style={{ fontSize: 9, color: C.textSec, textTransform: 'uppercase' }}>Residuo</div>
                                            </div>
                                        </div>

                                        {/* Pilots recap for this team */}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {t.pilotsWon.length > 0 ? t.pilotsWon.map(p => (
                                                <div key={p.id} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: F1_TEAM_COLORS[p.team] || '#555', fontSize: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#fff' }}>
                                                        {p.abbreviation}
                                                    </div>
                                                    <div style={{ fontSize: 10, fontWeight: 600, color: C.textSec }}>{p.name}</div>
                                                    <div style={{ fontSize: 10, fontWeight: 900, color: C.amber, marginLeft: 4, paddingLeft: 8, borderLeft: `1px solid ${C.border}` }}>{p.price} <span style={{ fontSize: 7, opacity: 0.7 }}>FM</span></div>
                                                </div>
                                            )) : (
                                                <div style={{ fontSize: 10, fontStyle: 'italic', color: C.border }}>Nessun acquisto in questa sessione</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* LOTS TABLE */}
                        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 80px', padding: '10px 16px', background: C.surface2, borderBottom: `1px solid ${C.border}`, fontSize: 10, fontWeight: 800, color: C.textSec, letterSpacing: 1 }}>
                                <div style={{ textAlign: 'center' }}>LOTTO</div>
                                <div>PILOTA ACQUISTATO</div>
                                <div>SQUADRA ACQUIRENTE</div>
                                <div style={{ textAlign: 'right' }}>PREZZO</div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {auction.lots.map((lot, i) => (
                                    <div key={lot.id} style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 80px', padding: '12px 16px', borderBottom: i < auction.lots.length - 1 ? `1px solid ${C.border}` : 'none', alignItems: 'center' }}>
                                        {/* Lot Num */}
                                        <div style={{ textAlign: 'center', fontSize: 11, color: C.textSec, fontWeight: 600 }}>#{lot.lotOrder}</div>
                                        {/* Pilot */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 20, height: 20, borderRadius: '50%', background: F1_TEAM_COLORS[lot.pilot.team] || '#555', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 7, fontWeight: 900, color: '#fff', border: `1px solid ${C.border}` }}>
                                                {lot.pilot.abbreviation}
                                            </div>
                                            <div style={{ fontSize: 13, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lot.pilot.name}</div>
                                        </div>
                                        {/* Buyer Team */}
                                        <div style={{ fontSize: 13, fontWeight: 600, color: C.textSec, display: 'flex', alignItems: 'center', gap: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            <div style={{ width: 16, height: 16, borderRadius: '50%', background: C.red, display: 'flex', flexShrink: 0, alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: '#fff' }}>
                                                {lot.team.name.charAt(0)}
                                            </div>
                                            {lot.team.name}
                                        </div>
                                        {/* Price */}
                                        <div style={{ textAlign: 'right', fontFamily: "'Orbitron', monospace", fontSize: 14, fontWeight: 900, color: C.amber }}>
                                            {lot.finalPrice} <span style={{ fontSize: 9, color: C.textSec }}>FM</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                );
            })}
        </div>
    );
}
