'use client';

import { SectionTitle } from './ui';

export default function Calendario({ calendar, races }) {
  const raceIds = new Set(races.map(r => r.calendarIndex));

  return (
    <div>
      <SectionTitle>Calendario 2026</SectionTitle>
      <div style={{ position: "relative", paddingLeft: 20 }}>
        <div style={{
          position: "absolute", left: 8, top: 0, bottom: 0,
          width: 2, background: "#222",
        }}/>
        {calendar.map((ev, i) => {
          const done = raceIds.has(i);
          const isRace = ev.type === "race";
          return (
            <div key={i} style={{
              display: "flex", alignItems: "flex-start",
              gap: 14, marginBottom: 12, position: "relative",
            }}>
              <div style={{
                position: "absolute", left: -16, top: 4,
                width: 12, height: 12, borderRadius: "50%",
                background: done ? "#e10600" : isRace ? "#333" : "#FFD700",
                border: `2px solid ${done ? "#e10600" : isRace ? "#555" : "#FFD700"}`,
                zIndex: 1,
              }}/>
              <div style={{
                flex: 1, background: "#161616", borderRadius: 10, padding: "10px 14px",
                opacity: done ? 0.5 : 1,
                borderLeft: isRace ? "3px solid #e10600" : "3px solid #FFD700",
              }}>
                <div style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>
                    {isRace ? `🏁 ${ev.location}` : `💰 ${ev.location}`}
                  </span>
                  <span style={{ fontSize: 12, opacity: 0.5 }}>{ev.date}</span>
                </div>
                {done && (
                  <span style={{ fontSize: 11, color: "#e10600" }}>✓ Completata</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
