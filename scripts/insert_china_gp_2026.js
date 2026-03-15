/**
 * insert_china_gp_2026.js
 * Inserisce i risultati del GP Cina 2026 (15 marzo) — PROVVISORI (lap ~47/56)
 * Fonte: crash.net live / autosport.com / racefans.net
 * sort_order = 2 nel calendario
 *
 * DNS: NOR, PIA (guasto PU McLaren), BOR (non partito), ALB (guasto idraulico)
 * DNF: VER (giro 46, guasto tecnico), ALO (giro 35), STR (giro iniziale)
 *
 * NOTA: overtakes e dotdRank da aggiornare con risultati ufficiali.
 *       Eseguire di nuovo lo script per sovrascrivere i dati provvisori.
 *
 * Esegui con:  node --env-file=.env.local scripts/insert_china_gp_2026.js
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Grid qualifiche: ANT 1, RUS 2, HAM 3, LEC 4, NOR 5(pitlane), GAS 6, VER 7,
//                 PIA 8(pitlane), BEA 9, HAD 10, HUL 11, COL 12, OCO 13, LAW 14,
//                 LIN 15, SAI 16, ALO 17, BOT 18, STR 19, PER 20, ALB 21(pitlane), BOR DNS
const GP_RESULTS = [
  // --- CLASSIFICATI ---
  { abbr: "ANT", grid: 1,    end: 1,    dnf: false, dotdRank: null, overtakes: 0 }, // Vince da P1
  { abbr: "RUS", grid: 2,    end: 2,    dnf: false, dotdRank: null, overtakes: 0 }, // Supera HAM al volo
  { abbr: "HAM", grid: 3,    end: 3,    dnf: false, dotdRank: null, overtakes: 0 },
  { abbr: "LEC", grid: 4,    end: 4,    dnf: false, dotdRank: null, overtakes: 0 },
  { abbr: "BEA", grid: 9,    end: 5,    dnf: false, dotdRank: null, overtakes: 0 },
  { abbr: "GAS", grid: 6,    end: 6,    dnf: false, dotdRank: null, overtakes: 0 }, // Risale dopo VER DNF
  { abbr: "LAW", grid: 14,   end: 7,    dnf: false, dotdRank: null, overtakes: 0 },
  { abbr: "HAD", grid: 10,   end: 8,    dnf: false, dotdRank: null, overtakes: 0 },
  { abbr: "SAI", grid: 16,   end: 9,    dnf: false, dotdRank: null, overtakes: 0 },
  { abbr: "COL", grid: 12,   end: 10,   dnf: false, dotdRank: null, overtakes: 0 }, // Alpine P6 in gara iniziale
  { abbr: "HUL", grid: 11,   end: 11,   dnf: false, dotdRank: null, overtakes: 0 },
  { abbr: "OCO", grid: 13,   end: 12,   dnf: false, dotdRank: null, overtakes: 0 }, // +10s penalty
  { abbr: "LIN", grid: 15,   end: 13,   dnf: false, dotdRank: null, overtakes: 0 },
  { abbr: "BOT", grid: 18,   end: 14,   dnf: false, dotdRank: null, overtakes: 0 },
  { abbr: "PER", grid: 20,   end: 15,   dnf: false, dotdRank: null, overtakes: 0 },
  // --- DNF ---
  { abbr: "VER", grid: 7,    end: null, dnf: true,  dotdRank: null, overtakes: 0 }, // Ritiro giro 46 (guasto tecnico)
  { abbr: "ALO", grid: 17,   end: null, dnf: true,  dotdRank: null, overtakes: 0 }, // Ritiro giro 35
  { abbr: "STR", grid: 19,   end: null, dnf: true,  dotdRank: null, overtakes: 0 }, // Ritiro anticipato
  // --- DNS (non partiti) ---
  { abbr: "NOR", grid: 5,    end: null, dnf: true,  dotdRank: null, overtakes: 0 }, // Guasto PU (pit lane start fallito)
  { abbr: "PIA", grid: 8,    end: null, dnf: true,  dotdRank: null, overtakes: 0 }, // Guasto PU (pit lane start fallito)
  { abbr: "ALB", grid: 21,   end: null, dnf: true,  dotdRank: null, overtakes: 0 }, // Guasto idraulico (pitlane)
  { abbr: "BOR", grid: null, end: null, dnf: true,  dotdRank: null, overtakes: 0 }, // DNS
];

const SORT_ORDER = 2; // "race" Cina (domenica) nel calendario

async function run() {
  console.log('🏎️  Inserimento risultati GP Cina 2026 (PROVVISORI — lap ~47/56)...');

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

  // Ottieni/crea la race (is_sprint = false)
  const { data: existingRace } = await supabase
    .from('races')
    .select('id')
    .eq('calendar_event_id', calEv.id)
    .maybeSingle();

  let raceId;
  if (existingRace) {
    raceId = existingRace.id;
    await supabase.from('races').update({ is_sprint: false }).eq('id', raceId);
  } else {
    const { data: newRace, error: eRace } = await supabase
      .from('races')
      .insert({ calendar_event_id: calEv.id, is_sprint: false })
      .select('id')
      .single();
    if (eRace) { console.error(eRace); process.exit(1); }
    raceId = newRace.id;
  }

  // Cancella risultati precedenti e reinserisci
  await supabase.from('race_results').delete().eq('race_id', raceId);

  const rows = GP_RESULTS
    .filter(r => {
      if (!pilotMap[r.abbr]) { console.warn(`⚠️  Pilota non trovato: ${r.abbr}`); return false; }
      return true;
    })
    .map(r => ({
      race_id: raceId,
      pilot_id: pilotMap[r.abbr],
      grid_position: r.grid || null,
      position: r.end || null,
      overtakes: r.overtakes || 0,
      dotd_rank: r.dotdRank || null,
      dnf: r.dnf,
    }));

  const { error: eInsert } = await supabase.from('race_results').insert(rows);
  if (eInsert) {
    console.error('❌ Errore:', eInsert);
  } else {
    console.log(`✅ Inseriti ${rows.length} risultati GP Cina 2026 (race_id: ${raceId})`);
    console.log('');
    console.log('📊 Punteggi provvisori:');
    console.log('  P1 ANT: 25pts | P2 RUS: 22pts | P3 HAM: 20pts | P4 LEC: 18pts');
    console.log('  P5 BEA: 16pts | P6 GAS: 15pts | P7 LAW: 14pts | P8 HAD: 13pts');
    console.log('  P9 SAI: 12pts | P10 COL: 11pts | P11 HUL: 10pts | P12 OCO: 9pts');
    console.log('  P13 LIN: 8pts | P14 BOT: 7pts | P15 PER: 6pts');
    console.log('  DNF: VER, ALO, STR | DNS: NOR, PIA, ALB, BOR → 0pts');
    console.log('');
    console.log('⚠️  PROVVISORIO: aggiornare overtakes e DOTD con risultati ufficiali.');
  }
}

run();
