/**
 * insert_japan_gp_2026.js
 * Inserisce risultati GP Giappone 2026 (29 marzo) — Suzuka
 * Fonte: formula1.com, the-race.com
 *
 * P1 ANT, P2 PIA, P3 LEC, P4 RUS, P5 NOR, P6 HAM, P7 GAS, P8 VER
 * P9 LAW, P10 OCO, P11 HUL, P12 HAD, P13 BOR, P14 LIN, P15 SAI
 * P16 COL, P17 PER, P18 ALO (+1 lap), P19 BOT (+1 lap), P20 ALB (+2 laps)
 * DNF: STR (lap 30, water pressure), BEA (lap 20, crash)
 * DOTD: Piastri
 * Fastest Lap: Antonelli (1:32.432, lap 49)
 *
 * Esegui con: node --env-file=.env.local scripts/insert_japan_gp_2026.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAwMDkxNCwiZXhwIjoyMDg3NTc2OTE0fQ.kyBXfpPY0xvbqNDxpvZLfi75m0abEcSNpx3k39qH60I';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  SERVICE_ROLE_KEY
);

const RACE_RESULTS = [
  { abbr: 'ANT', grid: 1,  pos: 1,    dnf: false, dotdRank: null },
  { abbr: 'PIA', grid: 3,  pos: 2,    dnf: false, dotdRank: 1 },    // DOTD
  { abbr: 'LEC', grid: 4,  pos: 3,    dnf: false, dotdRank: null },
  { abbr: 'RUS', grid: 2,  pos: 4,    dnf: false, dotdRank: null },
  { abbr: 'NOR', grid: 5,  pos: 5,    dnf: false, dotdRank: null },
  { abbr: 'HAM', grid: 6,  pos: 6,    dnf: false, dotdRank: null },
  { abbr: 'GAS', grid: 7,  pos: 7,    dnf: false, dotdRank: null },
  { abbr: 'VER', grid: 11, pos: 8,    dnf: false, dotdRank: null },
  { abbr: 'LAW', grid: 14, pos: 9,    dnf: false, dotdRank: null },
  { abbr: 'OCO', grid: 12, pos: 10,   dnf: false, dotdRank: null },
  { abbr: 'HUL', grid: 13, pos: 11,   dnf: false, dotdRank: null },
  { abbr: 'HAD', grid: 8,  pos: 12,   dnf: false, dotdRank: null },
  { abbr: 'BOR', grid: 9,  pos: 13,   dnf: false, dotdRank: null },
  { abbr: 'LIN', grid: 10, pos: 14,   dnf: false, dotdRank: null },
  { abbr: 'SAI', grid: 16, pos: 15,   dnf: false, dotdRank: null },
  { abbr: 'COL', grid: 15, pos: 16,   dnf: false, dotdRank: null },
  { abbr: 'PER', grid: 19, pos: 17,   dnf: false, dotdRank: null },
  { abbr: 'ALO', grid: 21, pos: 18,   dnf: false, dotdRank: null },  // +1 lap
  { abbr: 'BOT', grid: 20, pos: 19,   dnf: false, dotdRank: null },  // +1 lap
  { abbr: 'ALB', grid: 17, pos: 20,   dnf: false, dotdRank: null },  // +2 laps
  // DNF
  { abbr: 'STR', grid: 22, pos: null, dnf: true,  dotdRank: null },  // DNF lap 30
  { abbr: 'BEA', grid: 18, pos: null, dnf: true,  dotdRank: null },  // DNF lap 20 (crash)
];

// Formazioni per il GP Giappone (post Asta 2)
const LINEUPS = {
  'ZetaRacing':              { starters: ['HAD', 'HUL', 'LAW'], reserve: 'SAI' },
  'Ranocchiettos':           { starters: ['HAM', 'PIA', 'BOR'], reserve: 'OCO' },
  'SF – Scuderia Fainelli':  { starters: ['ANT', 'BOT', 'NOR'], reserve: null },
  'Abdull Mazzar':           { starters: ['GAS', 'ALO', 'PER'], reserve: null },
  'Scudemaria Ferrari':      { starters: ['RUS', 'BEA', 'LIN'], reserve: null },
  'Alpha Chiro Racing':      { starters: ['LEC', 'VER', 'COL'], reserve: 'ALB' },
};

async function run() {
  console.log('=== GP GIAPPONE 2026 - Suzuka (29/03/2026) ===\n');

  // Carica piloti e team
  const { data: pilots } = await supabase.from('pilots').select('id, abbreviation');
  const pilotMap = {};
  pilots.forEach(p => pilotMap[p.abbreviation] = p.id);

  const { data: teams } = await supabase.from('teams').select('id, name');
  const teamMap = {};
  teams.forEach(t => teamMap[t.name] = t.id);

  // Trova calendar_event per GP Giappone
  const { data: calEvent, error: calErr } = await supabase
    .from('calendar_events')
    .select('id, sort_order')
    .eq('location', 'Giappone')
    .eq('event_type', 'race')
    .single();

  if (calErr || !calEvent) {
    console.error('Calendar event GP Giappone non trovato:', calErr);
    process.exit(1);
  }
  console.log(`Calendar event: ${calEvent.id} (sort_order: ${calEvent.sort_order})`);

  // Crea o recupera la race
  let raceId;
  const { data: existingRace } = await supabase
    .from('races')
    .select('id')
    .eq('calendar_event_id', calEvent.id)
    .maybeSingle();

  if (existingRace) {
    raceId = existingRace.id;
    await supabase.from('races').update({ is_sprint: false }).eq('id', raceId);
    console.log(`Race esistente: ${raceId}`);
  } else {
    const { data: newRace, error: raceErr } = await supabase
      .from('races')
      .insert({ calendar_event_id: calEvent.id, is_sprint: false })
      .select('id')
      .single();
    if (raceErr) { console.error('Errore creazione race:', raceErr); process.exit(1); }
    raceId = newRace.id;
    console.log(`Race creata: ${raceId}`);
  }

  // Inserisci risultati
  console.log('\n--- Risultati gara ---');
  await supabase.from('race_results').delete().eq('race_id', raceId);

  const rows = RACE_RESULTS.filter(r => {
    if (!pilotMap[r.abbr]) { console.warn(`Pilota ${r.abbr} non trovato!`); return false; }
    return true;
  }).map(r => ({
    race_id:       raceId,
    pilot_id:      pilotMap[r.abbr],
    grid_position: r.grid,
    position:      r.pos,
    dnf:           r.dnf,
    dotd_rank:     r.dotdRank,
  }));

  const { error: insertErr } = await supabase.from('race_results').insert(rows);
  if (insertErr) { console.error('Errore risultati:', insertErr); process.exit(1); }
  console.log(`${rows.length} risultati inseriti`);

  // Inserisci lineups
  console.log('\n--- Lineups ---');
  await supabase.from('lineups').delete().eq('race_id', raceId);

  const lineupRows = [];
  for (const [teamName, lineup] of Object.entries(LINEUPS)) {
    const teamId = teamMap[teamName];
    if (!teamId) { console.error(`Team ${teamName} non trovato!`); continue; }

    for (const abbr of lineup.starters) {
      if (!pilotMap[abbr]) { console.warn(`Pilota ${abbr} non trovato!`); continue; }
      lineupRows.push({ race_id: raceId, team_id: teamId, pilot_id: pilotMap[abbr], is_reserve: false });
    }
    if (lineup.reserve && pilotMap[lineup.reserve]) {
      lineupRows.push({ race_id: raceId, team_id: teamId, pilot_id: pilotMap[lineup.reserve], is_reserve: true });
    }
  }

  const { error: lineupErr } = await supabase.from('lineups').insert(lineupRows);
  if (lineupErr) { console.error('Errore lineups:', lineupErr); process.exit(1); }
  console.log(`${lineupRows.length} lineup inserite`);

  // Segna calendario come completato
  await supabase.from('calendar_events').update({ is_completed: true }).eq('id', calEvent.id);
  console.log('\nCalendario: GP Giappone segnato come completato');

  // Segna anche Asta 2 come completata se non lo è già
  const { data: asta2Event } = await supabase
    .from('calendar_events')
    .select('id, is_completed')
    .eq('event_type', 'auction')
    .lt('sort_order', calEvent.sort_order)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (asta2Event && !asta2Event.is_completed) {
    await supabase.from('calendar_events').update({ is_completed: true }).eq('id', asta2Event.id);
    console.log('Calendario: Asta 2 segnata come completata');
  }

  // Riepilogo punteggi per squadra
  console.log('\n=== RIEPILOGO PUNTEGGI SQUADRE ===');
  for (const [teamName, lineup] of Object.entries(LINEUPS)) {
    const starters = lineup.starters;
    let teamTotal = 0;
    const details = [];

    for (const abbr of starters) {
      const result = RACE_RESULTS.find(r => r.abbr === abbr);
      if (!result) continue;

      let pts = 0;
      if (!result.dnf && result.pos) {
        // Punteggi fantasy: P1=25, P2=22, P3=20, P4=18, P5=16, P6=15, P7=14, P8=13, P9=12, P10=11
        // P11=10, P12=9, P13=8, P14=7, P15=6, P16=5, P17=4, P18=3, P19=2, P20=1
        const POINTS = [25, 22, 20, 18, 16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
        pts = result.pos <= 20 ? POINTS[result.pos - 1] : 0;
      }

      // DOTD bonus
      let dotdBonus = 0;
      if (result.dotdRank === 1) dotdBonus = 3;
      else if (result.dotdRank === 2) dotdBonus = 2;
      else if (result.dotdRank === 3) dotdBonus = 1;

      const total = pts + dotdBonus;
      teamTotal += total;
      details.push(`${abbr} P${result.pos || 'DNF'}=${pts}${dotdBonus ? `+${dotdBonus}dotd` : ''}=${total}`);
    }

    console.log(`  ${teamName}: ${details.join(' + ')} = ${teamTotal} pts`);
  }

  console.log('\n=== COMPLETATO ===');
}

run().catch(console.error);
