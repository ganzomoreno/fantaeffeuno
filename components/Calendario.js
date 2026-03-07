'use client';

import { useState, useMemo } from 'react';

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

function parseDateItalian(str) {
  const [d, m, y] = str.split('/');
  return new Date(`${y}-${m}-${d}`);
}

export default function Calendario({ calendar, races }) {
  const [filter, setFilter] = useState('tutto'); // 'tutto' | 'gare' | 'aste'

  const completedSet = useMemo(() => new Set(races.map(r => r.calendarIndex)), [races]);
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  // Find next upcoming event index
  const nextEventIdx = useMemo(() => {
    return calendar.findIndex((ev, i) => !completedSet.has(i) && parseDateItalian(ev.date) >= today);
  }, [calendar, completedSet, today]);

  const filtered = useMemo(() => {
    return calendar
      .map((ev, i) => ({ ...ev, index: i }))
      .filter(ev => {
        if (filter === 'gare') return ev.type === 'race';
        if (filter === 'aste') return ev.type === 'auction';
        return true;
      });
  }, [calendar, filter]);

  function getStatus(ev) {
    if (completedSet.has(ev.index)) return 'done';
    if (ev.index === nextEventIdx) return 'next';
    return 'future';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── FILTER TOGGLE ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden', alignSelf: 'flex-start' }}>
        {[
          { id: 'tutto', label: 'Tutto' },
          { id: 'gare', label: '🏁 Gare' },
          { id: 'aste', label: '💰 Aste' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            style={{
              padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 11,
              fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1,
              background: filter === f.id ? C.red : 'transparent',
              color: filter === f.id ? '#fff' : C.textSec,
              transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── TIMELINE ──────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', paddingLeft: 22 }}>
        {/* Vertical line */}
        <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: C.border }} />

        {filtered.map(ev => {
          const status = getStatus(ev);
          const isRace = ev.type === 'race';
          const isDone = status === 'done';
          const isNext = status === 'next';

          const dotColor = isDone ? '#555' : isNext ? (isRace ? C.red : C.amber) : isRace ? C.border : '#FFD70066';
          const dotBorder = isDone ? '#555' : isNext ? (isRace ? C.red : C.amber) : isRace ? '#444' : '#FFD70066';
          const cardBorderColor = isDone ? C.border : isNext ? (isRace ? C.red : C.amber) : C.border;
          const cardBorderLeft = isDone ? `1px solid ${C.border}` : isNext ? (isRace ? `3px solid ${C.red}` : `3px solid ${C.amber}`) : `1px solid ${C.border}`;

          const daysUntil = !isDone && ev.date ? (() => {
            const evDate = parseDateItalian(ev.date);
            evDate.setHours(0, 0, 0, 0);
            const diff = Math.ceil((evDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return diff;
          })() : null;

          return (
            <div key={ev.index} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 10, position: 'relative' }}>
              {/* Dot */}
              <div style={{
                position: 'absolute', left: -16, top: 12,
                width: 14, height: 14, borderRadius: '50%',
                background: dotColor, border: `2px solid ${dotBorder}`,
                zIndex: 1, flexShrink: 0,
                boxShadow: isNext ? `0 0 8px ${isRace ? C.red : C.amber}66` : 'none',
              }} />

              {/* Card */}
              <div style={{
                flex: 1, background: isNext ? (isRace ? C.red + '0D' : C.amber + '0D') : C.surface,
                borderRadius: 10, padding: '10px 14px',
                border: `1px solid ${cardBorderColor}`,
                borderLeft: cardBorderLeft,
                opacity: isDone ? 0.45 : 1,
                transition: 'all 0.15s',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: C.textPri }}>
                      {isRace ? `🏁 ${ev.location}` : `💰 ${ev.location}`}
                    </div>
                    <div style={{ fontSize: 11, color: C.textSec, marginTop: 2 }}>{ev.date}</div>
                  </div>

                  {/* Status badge */}
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    {isDone && (
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: '#EDEEF322', color: C.textSec, border: `1px solid ${C.border}`, fontWeight: 700 }}>
                        ✓ COMPLETATO
                      </span>
                    )}
                    {isNext && (
                      <span style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700,
                        background: isRace ? C.red + '33' : C.amber + '33',
                        color: isRace ? C.red : C.amber,
                        border: `1px solid ${isRace ? C.red + '66' : C.amber + '66'}`,
                        animation: 'none',
                      }}>
                        ► PROSSIMO
                      </span>
                    )}
                    {daysUntil != null && isNext && (
                      <span style={{ fontSize: 10, color: daysUntil <= 3 ? C.amber : C.textSec }}>
                        {daysUntil === 0 ? 'OGGI' : daysUntil < 0 ? 'IN CORSO' : `tra ${daysUntil}g`}
                      </span>
                    )}
                  </div>
                </div>

                {/* CTA per evento prossimo */}
                {isNext && !isDone && (
                  <div style={{ marginTop: 8 }}>
                    {isRace ? (
                      <div style={{ fontSize: 11, color: C.textSec }}>
                        ⚡ Imposta la formazione nella sezione <strong style={{ color: C.textPri }}>Squadre</strong>
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: C.textSec }}>
                        💡 L&apos;asta viene gestita dall&apos;admin
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: C.textSec, fontSize: 13 }}>
            Nessun evento trovato.
          </div>
        )}
      </div>

    </div>
  );
}
