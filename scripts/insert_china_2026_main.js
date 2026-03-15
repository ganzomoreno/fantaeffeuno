// ============================================================
// GP CINA 2026 — Gara Principale (15/03/2026)
// Fonte: formula1.com, motorsportweek.com, gpfans.com
// ============================================================
// CLASSIFICA FINALE:
//  P1  ANT (Mercedes) | P2  RUS (Mercedes) | P3  HAM (Ferrari)
//  P4  LEC (Ferrari)  | P5  BEA (Haas)     | P6  GAS (Alpine)
//  P7  LAW (RB)       | P8  HAD (Red Bull)  | P9  SAI (Williams)
//  P10 COL (Alpine)   | P11 HUL (Audi)      | P12 LIN (RB)
//  P13 BOT (Cadillac) | P14 PER (Cadillac)  | P15 OCO (Haas)
//  DNF: VER (Red Bull, ~10 giri dalla fine), ALO (Aston Martin), STR (Aston Martin)
//  DNS: NOR (McLaren, electrical), PIA (McLaren, electrical), BOR (Audi), ALB (Williams, pit lane)
//
// DOTD: da aggiornare con valore ufficiale (lasciato NULL)
// Giro veloce: ANT (1:35.275 lap 52) — non in scoring DB (no fast_lap col)
// ============================================================

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAwMDkxNCwiZXhwIjoyMDg3NTc2OTE0fQ.kyBXfpPY0xvbqNDxpvZLfi75m0abEcSNpx3k39qH60I';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  SERVICE_ROLE_KEY
);

// Griglia qualifiche (grid_position per ogni pilota)
// Fonte: formula1.com starting grid ufficiale
const RACE_RESULTS = [
  // pos, abbr, grid, dnf, dotdRank
  { abbr: 'ANT', grid: 1,  pos: 1,    dnf: false, dotdRank: 1 },  // DOTD 1° +3pts
  { abbr: 'RUS', grid: 2,  pos: 2,    dnf: false, dotdRank: null },
  { abbr: 'HAM', grid: 3,  pos: 3,    dnf: false, dotdRank: 2 },  // DOTD 2° +2pts
  { abbr: 'LEC', grid: 4,  pos: 4,    dnf: false, dotdRank: null },
  { abbr: 'BEA', grid: 10, pos: 5,    dnf: false, dotdRank: null },
  { abbr: 'GAS', grid: 7,  pos: 6,    dnf: false, dotdRank: null },
  { abbr: 'LAW', grid: 14, pos: 7,    dnf: false, dotdRank: null },
  { abbr: 'HAD', grid: 9,  pos: 8,    dnf: false, dotdRank: null },
  { abbr: 'SAI', grid: 17, pos: 9,    dnf: false, dotdRank: null },
  { abbr: 'COL', grid: 12, pos: 10,   dnf: false, dotdRank: null },
  { abbr: 'HUL', grid: 11, pos: 11,   dnf: false, dotdRank: null },
  { abbr: 'LIN', grid: 15, pos: 12,   dnf: false, dotdRank: null },
  { abbr: 'BOT', grid: 19, pos: 13,   dnf: false, dotdRank: null },
  { abbr: 'PER', grid: 21, pos: 14,   dnf: false, dotdRank: null },
  { abbr: 'OCO', grid: 13, pos: 15,   dnf: false, dotdRank: null },
  // DNF
  { abbr: 'VER', grid: 8,  pos: null, dnf: true,  dotdRank: 3 },  // DOTD 3° +1pt (ma DNF → 0 totale, vedi nota)
  { abbr: 'ALO', grid: 18, pos: null, dnf: true,  dotdRank: null },
  { abbr: 'STR', grid: 20, pos: null, dnf: true,  dotdRank: null },
  // DNS (trattati come DNF = 0 punti)
  { abbr: 'NOR', grid: 6,  pos: null, dnf: true,  dotdRank: null },
  { abbr: 'PIA', grid: 5,  pos: null, dnf: true,  dotdRank: null },
  { abbr: 'BOR', grid: 16, pos: null, dnf: true,  dotdRank: null },
  { abbr: 'ALB', grid: 22, pos: null, dnf: true,  dotdRank: null },
];

async function run() {
  // 1. Carica mappa piloti abbreviazione → id
  const { data: pilots, error: pilotErr } = await supabase
    .from('pilots')
    .select('id, abbreviation');

  if (pilotErr) { console.error('Errore piloti:', pilotErr); process.exit(1); }

  const pilotMap = {};
  pilots.forEach(p => pilotMap[p.abbreviation] = p.id);

  // 2. Trova calendar_event per GP Cina (principale, non sprint)
  const { data: calEvent, error: calErr } = await supabase
    .from('calendar_events')
    .select('id')
    .eq('location', 'Cina')
    .eq('is_sprint', false)
    .single();

  if (calErr || !calEvent) {
    console.error('Calendar event GP Cina (principale) non trovato:', calErr);
    process.exit(1);
  }
  console.log('Calendar Event GP Cina:', calEvent.id);

  // 3. Crea o recupera la Race
  let raceId;
  const { data: existingRace } = await supabase
    .from('races')
    .select('id')
    .eq('calendar_event_id', calEvent.id)
    .single();

  if (existingRace) {
    raceId = existingRace.id;
    await supabase.from('races').update({ status: 'completed', is_sprint: false }).eq('id', raceId);
    console.log('Race esistente:', raceId);
  } else {
    const { data: newRace, error: raceErr } = await supabase
      .from('races')
      .insert({ calendar_event_id: calEvent.id, is_sprint: false })
      .select('id')
      .single();

    if (raceErr) { console.error('Errore creazione race:', raceErr); process.exit(1); }
    raceId = newRace.id;
    console.log('Race creata:', raceId);
  }

  // 4. Pulisce risultati precedenti e inserisce nuovi
  await supabase.from('race_results').delete().eq('race_id', raceId);

  const inserts = RACE_RESULTS.filter(r => {
    if (!pilotMap[r.abbr]) {
      console.warn(`Pilota ${r.abbr} non trovato in DB, skip.`);
      return false;
    }
    return true;
  }).map(r => ({
    race_id:       raceId,
    pilot_id:      pilotMap[r.abbr],
    grid_position: r.grid,
    position:      r.pos,
    dnf:           r.dnf,
    dotd_rank:     r.dotdRank,
    // overtakes calcolati automaticamente dal trigger (grid - pos se >0)
  }));

  const { error: insertErr } = await supabase.from('race_results').insert(inserts);
  if (insertErr) {
    console.error('Errore inserimento risultati:', insertErr);
    process.exit(1);
  }
  console.log(`Risultati inseriti: ${inserts.length} piloti`);

  // 5. Segna race come completata
  await supabase.from('races').update({ status: 'completed' }).eq('id', raceId);

  // 6. Inserisce formazioni (lineups) per i 6 team
  // Usa le stesse rose del GP Australia / Sprint Cina
  const teamMap = {};
  const { data: teams } = await supabase.from('teams').select('id, name');
  teams.forEach(t => teamMap[t.name] = t.id);

  const teamNames = {
    ZETA:      'ZetaRacing',
    MAZZAR:    'Abdull Mazzar',
    CHIRO:     'Alpha Chiro Racing',
    RANO:      'Ranocchiettos',
    FAINELLI:  'SF – Scuderia Fainelli',
    SCUDEMARIA:'Scudemaria Ferrari',
  };

  // Verifica che tutti i team esistano
  for (const [key, name] of Object.entries(teamNames)) {
    if (!teamMap[name]) {
      console.error(`Team "${name}" non trovato in DB!`);
      process.exit(1);
    }
  }

  // Pulisce lineup precedenti per questa race
  await supabase.from('lineups').delete().eq('race_id', raceId);

  // Costruisce lineup
  const lineups = [
    // ZetaRacing: LEC (T), ANT (T), LIN (T) — nessuna panchina (3 piloti)
    { race_id: raceId, team_id: teamMap[teamNames.ZETA],       pilot_id: pilotMap['LEC'], is_reserve: false },
    { race_id: raceId, team_id: teamMap[teamNames.ZETA],       pilot_id: pilotMap['ANT'], is_reserve: false },
    { race_id: raceId, team_id: teamMap[teamNames.ZETA],       pilot_id: pilotMap['LIN'], is_reserve: false },

    // Abdull Mazzar: BEA (T), COL (T), BOT (T) — panchina: PER
    { race_id: raceId, team_id: teamMap[teamNames.MAZZAR],     pilot_id: pilotMap['BEA'], is_reserve: false },
    { race_id: raceId, team_id: teamMap[teamNames.MAZZAR],     pilot_id: pilotMap['COL'], is_reserve: false },
    { race_id: raceId, team_id: teamMap[teamNames.MAZZAR],     pilot_id: pilotMap['BOT'], is_reserve: false },

    // Alpha Chiro Racing: HAD (T), OCO (T), PIA (T→DNS = 0pts)
    { race_id: raceId, team_id: teamMap[teamNames.CHIRO],      pilot_id: pilotMap['HAD'], is_reserve: false },
    { race_id: raceId, team_id: teamMap[teamNames.CHIRO],      pilot_id: pilotMap['OCO'], is_reserve: false },
    { race_id: raceId, team_id: teamMap[teamNames.CHIRO],      pilot_id: pilotMap['PIA'], is_reserve: false },

    // Ranocchiettos: RUS (T), LAW (T), HUL (T) — nessuna panchina
    { race_id: raceId, team_id: teamMap[teamNames.RANO],       pilot_id: pilotMap['RUS'], is_reserve: false },
    { race_id: raceId, team_id: teamMap[teamNames.RANO],       pilot_id: pilotMap['LAW'], is_reserve: false },
    { race_id: raceId, team_id: teamMap[teamNames.RANO],       pilot_id: pilotMap['HUL'], is_reserve: false },

    // SF Fainelli: VER (T→DNF), HAM (T), GAS (T) — panchina: ALB (DNS)
    { race_id: raceId, team_id: teamMap[teamNames.FAINELLI],   pilot_id: pilotMap['VER'], is_reserve: false },
    { race_id: raceId, team_id: teamMap[teamNames.FAINELLI],   pilot_id: pilotMap['HAM'], is_reserve: false },
    { race_id: raceId, team_id: teamMap[teamNames.FAINELLI],   pilot_id: pilotMap['GAS'], is_reserve: false },

    // Scudemaria Ferrari: NOR (T→DNS=0), SAI (T), BOR (T→DNS=0)
    { race_id: raceId, team_id: teamMap[teamNames.SCUDEMARIA], pilot_id: pilotMap['NOR'], is_reserve: false },
    { race_id: raceId, team_id: teamMap[teamNames.SCUDEMARIA], pilot_id: pilotMap['SAI'], is_reserve: false },
    { race_id: raceId, team_id: teamMap[teamNames.SCUDEMARIA], pilot_id: pilotMap['BOR'], is_reserve: false },
  ];

  const { error: lineupErr } = await supabase.from('lineups').insert(lineups);
  if (lineupErr) {
    console.error('Errore inserimento lineups:', lineupErr);
    process.exit(1);
  }
  console.log(`Lineups inserite: ${lineups.length} righe`);

  // 7. Ricalcola team_race_scores (se la funzione esiste)
  const { error: rpcErr } = await supabase.rpc('recompute_team_race_scores', { p_race_id: raceId });
  if (rpcErr) console.warn('recompute_team_race_scores non disponibile o errore (ignorato):', rpcErr.message);

  console.log('\n=== COMPLETATO ===');
  console.log('Race GP Cina 2026 ID:', raceId);
  console.log('\nPUNTEGGI ATTESI (con DOTD: ANT=1°+3, HAM=2°+2):');
  console.log('  ZetaRacing:      ANT(25+3) + LEC(18) + LIN(9+1.5ov)    = 56.5 pts');
  console.log('  Ranocchiettos:   RUS(22) + LAW(14+3ov) + HUL(10)       = 49.0 pts');
  console.log('  Abdull Mazzar:   BEA(16+2.5ov) + BOT(8+3ov) + COL(11+1ov) = 41.5 pts');
  console.log('  SF Fainelli:     HAM(20+2) + GAS(15+0.5ov) + VER(0)    = 37.5 pts');
  console.log('  Alpha Chiro:     HAD(13+0.5ov) + OCO(6) + PIA(0)       = 19.5 pts');
  console.log('  Scudemaria:      SAI(12+3ov) + NOR(0) + BOR(0)         = 15.0 pts');
}

run().catch(console.error);
