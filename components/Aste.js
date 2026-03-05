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

    useEffect(() => {
        fetchAuctionLots().then(data => {
            setLots(data);
            setLoading(false);
        }).catch(err => {
            console.error("Error fetching auction lots:", err);
            setLoading(false);
        });
    }, []);

    // Raggruppa per Numero Asta
    const groupedAuctions = useMemo(() => {
        const groups = {};
        lots.forEach(lot => {
            if (!groups[lot.auctionNumber]) {
                // Cerca l'evento nel calendario per avere la data corretta
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
                    lots: []
                };
            }
            groups[lot.auctionNumber].lots.push(lot);
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

            {groupedAuctions.map(auction => (
                <div key={auction.number} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                    {/* AUCTION HEADER */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: C.amber, boxShadow: `0 0 10px ${C.amber}` }} />
                        <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 14, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase', color: C.textPri }}>
                            Asta Sessione {auction.number}
                        </div>
                        <div style={{ fontSize: 11, color: C.textSec, fontWeight: 600 }}>{auction.date}</div>
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
                                        <div style={{ fontSize: 13, fontWeight: 700, color: C.textPri }}>{lot.pilot.name}</div>
                                    </div>

                                    {/* Buyer Team */}
                                    <div style={{ fontSize: 13, fontWeight: 600, color: C.textSec, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div style={{ width: 16, height: 16, borderRadius: '50%', background: C.red, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: '#fff' }}>
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
            ))}
        </div>
    );
}
