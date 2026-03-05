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

    // Raggruppa per Numero Asta
    const groupedAuctions = useMemo(() => {
        const groups = {};

        // Prima passata: organizziamo i lotti e calcoliamo i budget spesi per ASTA
        lots.forEach(lot => {
            if (!groups[lot.auctionNumber]) {
                let dateStr = "Sconosciuta";
                let auctionCount = 0;
                for (let ev of calendar) {
                    if (ev.type === 'auction') {
                        auctionCount++;
                        if (auctionCount === lot.auctionNumber) {
                            dateStr = ev.date;
                            break;
                        }
                    }
                }
                groups[lot.auctionNumber] = {
                    number: lot.auctionNumber,
                    date: dateStr,
                    lots: [],
                    teamSpent: {} // { team_id: spent }
                };
            }
            groups[lot.auctionNumber].lots.push(lot);

            // Traccia i soldi spesi dal team in questa specifica asta
            const tId = lot.team.id;
            if (!groups[lot.auctionNumber].teamSpent[tId]) {
                groups[lot.auctionNumber].teamSpent[tId] = { team: lot.team, spent: 0 };
            }
            groups[lot.auctionNumber].teamSpent[tId].spent += lot.finalPrice;
        });

        // Convertiamo il tracciatore budget in array e lo ordiniamo dal più parsimonioso
        Object.values(groups).forEach(g => {
            g.budgetRecap = Object.values(g.teamSpent).sort((a, b) => a.spent - b.spent);
        });

        return Object.values(groups).sort((a, b) => b.number - a.number); // Dalla più recente
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
                                RIASSUNTO RISORSE
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
                                {auction.budgetRecap.map((t, idx) => {
                                    // Simulated logic: everyone starts with 100 FM for Auction 1, and gets +100 for Auction 2
                                    const startingBudget = auction.number * 100;
                                    const remaining = startingBudget - t.spent;
                                    const pct = Math.max(0, (remaining / startingBudget) * 100);

                                    return (
                                        <div key={t.team.id} style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12 }}>
                                            <div style={{ fontSize: 11, fontWeight: 700, color: C.textPri, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 8 }}>{t.team.name}</div>

                                            <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 8 }}>
                                                <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 900, color: C.amber }}>{remaining}</span>
                                                <span style={{ fontSize: 9, color: C.textSec }}>FM</span>
                                            </div>

                                            <div style={{ width: '100%', height: 4, background: C.border, borderRadius: 2, overflow: 'hidden' }}>
                                                <div style={{ width: `${pct}%`, height: '100%', background: C.textPri }} />
                                            </div>
                                            <div style={{ fontSize: 9, color: C.textSec, marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                                                <span>Spesi: {t.spent}</span>
                                                <span>Su: {startingBudget}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* LOTS TABLE */}
                        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, overflow: 'hidden' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '50px 1fr 1fr 80px', padding: '10px 16px', background: C.surface2, borderBottom: `1px solid ${C.border}`, fontSize: 10, fontWeight: 800, color: C.textSec, letterSpacing: 1 }}>
                                <div style={{ textAlign: 'center' }}>LOTTO</div>
                                <div>PILOTA ACQUISTATO</div>
                                <div>ACQUIRENTE</div>
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
