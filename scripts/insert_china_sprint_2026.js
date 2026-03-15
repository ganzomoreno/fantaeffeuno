/**
 * insert_china_sprint_2026.js
 * Inserisce i risultati ufficiali della Sprint Race — Cina 2026 (14 marzo)
 * Fonte: formula1.com / the-race.com
 * sort_order = 1 nel calendario
 *
 * Esegui con:  node --env-file=.env.local scripts/insert_china_sprint_2026.js
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Griglia sprint: RUS P1, ANT P2, LEC P3, HAM P4, NOR P5, PIA P6, VER P7...
// Posizioni finali (top-8 punti: 8-7-6-5-4-3-2-1)
const SPRINT_RESULTS = [
  { abbr: "RUS", grid: 1,  end: 1,    dnf: false },
  { abbr: "LEC", grid: 3,  end: 2,    dnf: false },
  { abbr: "HAM", grid: 4,  end: 3,    dnf: false },
  { abbr: "NOR", grid: 5,  end: 4,    dnf: false },
  { abbr: "ANT", grid: 2,  end: 5,    dnf: false }, // 10s time penalty → P5
  { abbr: "PIA", grid: 6,  end: 6,    dnf: false },
  { abbr: "LAW", grid: 12, end: 7,    dnf: false },
  { abbr: "BEA", grid: 9,  end: 8,    dnf: false },
  { abbr: "VER", grid: 7,  end: 9,    dnf: false },
  { abbr: "OCO", grid: 13, end: 10,   dnf: false },
  { abbr: "GAS", grid: 8,  end: 11,   dnf: false },
  { abbr: "SAI", grid: 14, end: 12,   dnf: false },
  { abbr: "BOR", grid: 15, end: 13,   dnf: false },
  { abbr: "COL", grid: 11, end: 14,   dnf: false },
  { abbr: "HAD", grid: 10, end: 15,   dnf: false },
  { abbr: "ALB", grid: 16, end: 16,   dnf: false },
  { abbr: "ALO", grid: 17, end: 17,   dnf: false },
  { abbr: "STR", grid: 18, end: 18,   dnf: false },
  { abbr: "PER", grid: 20, end: 19,   dnf: false },
  { abbr: "HUL", grid: 19, end: null, dnf: true  }, // DNF
  { abbr: "BOT", grid: 21, end: null, dnf: true  }, // DNF
  { abbr: "LIN", grid: 22, end: null, dnf: true  }, // DNF
];

const SORT_ORDER = 1; // "sprint" Cina nel calendario

async function run() {
  console.log('🏎️  Inserimento risultati Sprint Cina 2026...');

  const { data: pilots, error: ePilots } = await supabase
    .from('pilots')
    .select('id, abbreviation');
  if (ePilots) { console.error(ePilots); process.exit(1); }

  const pilotMap = {};
  pilots.forEach(p => (pilotMap[p.abbreviation] = p.id));

  // Trova il calendar_event
  const { data: calEv, error: eCal } = await supabase
    .from('calendar_events')
    .select('id')
    .eq('sort_order', SORT_ORDER)
    .single();
  if (eCal) { console.error('calendar_event non trovato:', eCal); process.exit(1); }

  // Ottieni/crea la race
  const { data: existingRace } = await supabase
    .from('races')
    .select('id')
    .eq('calendar_event_id', calEv.id)
    .maybeSingle();

  let raceId;
  if (existingRace) {
    raceId = existingRace.id;
    await supabase.from('races').update({ is_sprint: true }).eq('id', raceId);
  } else {
    const { data: newRace, error: eRace } = await supabase
      .from('races')
      .insert({ calendar_event_id: calEv.id, is_sprint: true })
      .select('id')
      .single();
    if (eRace) { console.error(eRace); process.exit(1); }
    raceId = newRace.id;
  }

  // Cancella risultati precedenti e reinserisci
  await supabase.from('race_results').delete().eq('race_id', raceId);

  const rows = SPRINT_RESULTS
    .filter(r => {
      if (!pilotMap[r.abbr]) { console.warn(`⚠️  Pilota non trovato: ${r.abbr}`); return false; }
      return true;
    })
    .map(r => ({
      race_id: raceId,
      pilot_id: pilotMap[r.abbr],
      grid_position: r.grid || null,
      position: r.end || null,
      overtakes: 0,
      dotd_rank: null,
      dnf: r.dnf,
    }));

  const { error: eInsert } = await supabase.from('race_results').insert(rows);
  if (eInsert) {
    console.error('❌ Errore:', eInsert);
  } else {
    console.log(`✅ Inseriti ${rows.length} risultati Sprint Cina 2026 (race_id: ${raceId})`);
  }
}

run();
