/**
 * restore_china_races.js
 * Ripristina Sprint + GP Cina 2026 dopo il reset dell'asta.
 * Usa service_role key per bypassare RLS.
 *
 * Esegui con:  node --env-file=.env.local scripts/restore_china_races.js
 */

const { createClient } = require('@supabase/supabase-js');

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAwMDkxNCwiZXhwIjoyMDg3NTc2OTE0fQ.kyBXfpPY0xvbqNDxpvZLfi75m0abEcSNpx3k39qH60I';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  SERVICE_ROLE_KEY
);

// ─── SPRINT CINA (sort_order = 1) ────────────────────────────────────────────
const SPRINT_RESULTS = [
  { abbr: "RUS", grid: 1,  end: 1,    dnf: false },
  { abbr: "LEC", grid: 3,  end: 2,    dnf: false },
  { abbr: "HAM", grid: 4,  end: 3,    dnf: false },
  { abbr: "NOR", grid: 5,  end: 4,    dnf: false },
  { abbr: "ANT", grid: 2,  end: 5,    dnf: false },
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
  { abbr: "HUL", grid: 19, end: null, dnf: true  },
  { abbr: "BOT", grid: 21, end: null, dnf: true  },
  { abbr: "LIN", grid: 22, end: null, dnf: true  },
];

// ─── GP CINA (is_sprint = false, location = 'Cina') ─────────────────────────
const GP_RESULTS = [
  { abbr: 'ANT', grid: 1,  pos: 1,    dnf: false, dotdRank: 1 },
  { abbr: 'RUS', grid: 2,  pos: 2,    dnf: false, dotdRank: null },
  { abbr: 'HAM', grid: 3,  pos: 3,    dnf: false, dotdRank: 2 },
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
  { abbr: 'VER', grid: 8,  pos: null, dnf: true,  dotdRank: 3 },
  { abbr: 'ALO', grid: 18, pos: null, dnf: true,  dotdRank: null },
  { abbr: 'STR', grid: 20, pos: null, dnf: true,  dotdRank: null },
  { abbr: 'NOR', grid: 6,  pos: null, dnf: true,  dotdRank: null },
  { abbr: 'PIA', grid: 5,  pos: null, dnf: true,  dotdRank: null },
  { abbr: 'BOR', grid: 16, pos: null, dnf: true,  dotdRank: null },
  { abbr: 'ALB', grid: 22, pos: null, dnf: true,  dotdRank: null },
];

async function run() {
  // ── Mappa piloti ──
  const { data: pilots, error: ePilots } = await supabase.from('pilots').select('id, abbreviation');
  if (ePilots) { console.error(ePilots); process.exit(1); }
  const pilotMap = {};
  pilots.forEach(p => pilotMap[p.abbreviation] = p.id);

  // ── Mappa team ──
  const { data: teams } = await supabase.from('teams').select('id, name');
  const teamMap = {};
  teams.forEach(t => teamMap[t.name] = t.id);

  // ════════════════════════════════════════════════════════════════════════
  // SPRINT CINA
  // ════════════════════════════════════════════════════════════════════════
  console.log('--- SPRINT CINA 2026 ---');

  const { data: sprintCal, error: eSprintCal } = await supabase
    .from('calendar_events').select('id')
    .eq('sort_order', 1).single();
  if (eSprintCal) { console.error('Sprint calendar event non trovato:', eSprintCal); process.exit(1); }

  // Crea/recupera race sprint
  const { data: existingSprint } = await supabase
    .from('races').select('id')
    .eq('calendar_event_id', sprintCal.id).maybeSingle();

  let sprintRaceId;
  if (existingSprint) {
    sprintRaceId = existingSprint.id;
    await supabase.from('races').update({ is_sprint: true, status: 'completed' }).eq('id', sprintRaceId);
  } else {
    const { data: newRace, error: eRace } = await supabase
      .from('races').insert({ calendar_event_id: sprintCal.id, is_sprint: true, status: 'completed' })
      .select('id').single();
    if (eRace) { console.error(eRace); process.exit(1); }
    sprintRaceId = newRace.id;
  }

  // Inserisci risultati sprint
  await supabase.from('race_results').delete().eq('race_id', sprintRaceId);
  const sprintRows = SPRINT_RESULTS.filter(r => pilotMap[r.abbr]).map(r => ({
    race_id: sprintRaceId,
    pilot_id: pilotMap[r.abbr],
    grid_position: r.grid,
    position: r.end,
    overtakes: 0,
    dotd_rank: null,
    dnf: r.dnf,
  }));
  const { error: eSprintInsert } = await supabase.from('race_results').insert(sprintRows);
  if (eSprintInsert) { console.error('Errore sprint:', eSprintInsert); process.exit(1); }
  console.log(`Sprint: ${sprintRows.length} risultati inseriti (race_id: ${sprintRaceId})`);

  // Inserisci lineups sprint (stesse della gara principale)
  await supabase.from('lineups').delete().eq('race_id', sprintRaceId);
  const sprintLineups = [
    // ZetaRacing: LEC, ANT, LIN (3 piloti, no panchina) + ALO panchina
    { race_id: sprintRaceId, team_id: teamMap['ZetaRacing'],              pilot_id: pilotMap['LEC'], is_reserve: false },
    { race_id: sprintRaceId, team_id: teamMap['ZetaRacing'],              pilot_id: pilotMap['ANT'], is_reserve: false },
    { race_id: sprintRaceId, team_id: teamMap['ZetaRacing'],              pilot_id: pilotMap['LIN'], is_reserve: false },
    { race_id: sprintRaceId, team_id: teamMap['ZetaRacing'],              pilot_id: pilotMap['ALO'], is_reserve: true },
    // Abdull Mazzar: BEA, COL, BOT titolari, PER panchina
    { race_id: sprintRaceId, team_id: teamMap['Abdull Mazzar'],           pilot_id: pilotMap['BEA'], is_reserve: false },
    { race_id: sprintRaceId, team_id: teamMap['Abdull Mazzar'],           pilot_id: pilotMap['COL'], is_reserve: false },
    { race_id: sprintRaceId, team_id: teamMap['Abdull Mazzar'],           pilot_id: pilotMap['BOT'], is_reserve: false },
    { race_id: sprintRaceId, team_id: teamMap['Abdull Mazzar'],           pilot_id: pilotMap['PER'], is_reserve: true },
    // Alpha Chiro Racing: HAD, OCO, PIA (3 piloti)
    { race_id: sprintRaceId, team_id: teamMap['Alpha Chiro Racing'],      pilot_id: pilotMap['HAD'], is_reserve: false },
    { race_id: sprintRaceId, team_id: teamMap['Alpha Chiro Racing'],      pilot_id: pilotMap['OCO'], is_reserve: false },
    { race_id: sprintRaceId, team_id: teamMap['Alpha Chiro Racing'],      pilot_id: pilotMap['PIA'], is_reserve: false },
    // Ranocchiettos: RUS, LAW, HUL (3 piloti)
    { race_id: sprintRaceId, team_id: teamMap['Ranocchiettos'],           pilot_id: pilotMap['RUS'], is_reserve: false },
    { race_id: sprintRaceId, team_id: teamMap['Ranocchiettos'],           pilot_id: pilotMap['LAW'], is_reserve: false },
    { race_id: sprintRaceId, team_id: teamMap['Ranocchiettos'],           pilot_id: pilotMap['HUL'], is_reserve: false },
    // SF Fainelli: VER, HAM, GAS titolari, ALB panchina
    { race_id: sprintRaceId, team_id: teamMap['SF – Scuderia Fainelli'],  pilot_id: pilotMap['VER'], is_reserve: false },
    { race_id: sprintRaceId, team_id: teamMap['SF – Scuderia Fainelli'],  pilot_id: pilotMap['HAM'], is_reserve: false },
    { race_id: sprintRaceId, team_id: teamMap['SF – Scuderia Fainelli'],  pilot_id: pilotMap['GAS'], is_reserve: false },
    { race_id: sprintRaceId, team_id: teamMap['SF – Scuderia Fainelli'],  pilot_id: pilotMap['ALB'], is_reserve: true },
    // Scudemaria Ferrari: NOR, SAI, BOR (3 piloti)
    { race_id: sprintRaceId, team_id: teamMap['Scudemaria Ferrari'],      pilot_id: pilotMap['NOR'], is_reserve: false },
    { race_id: sprintRaceId, team_id: teamMap['Scudemaria Ferrari'],      pilot_id: pilotMap['SAI'], is_reserve: false },
    { race_id: sprintRaceId, team_id: teamMap['Scudemaria Ferrari'],      pilot_id: pilotMap['BOR'], is_reserve: false },
  ];
  const { error: eSprintLineup } = await supabase.from('lineups').insert(sprintLineups);
  if (eSprintLineup) console.error('Errore lineups sprint:', eSprintLineup);
  else console.log(`Sprint lineups: ${sprintLineups.length} righe`);

  // ════════════════════════════════════════════════════════════════════════
  // GP CINA (GARA PRINCIPALE)
  // ════════════════════════════════════════════════════════════════════════
  console.log('\n--- GP CINA 2026 (PRINCIPALE) ---');

  const { data: gpCal, error: eGpCal } = await supabase
    .from('calendar_events').select('id')
    .eq('location', 'Cina').eq('is_sprint', false).single();
  if (eGpCal) { console.error('GP Cina calendar event non trovato:', eGpCal); process.exit(1); }

  const { data: existingGp } = await supabase
    .from('races').select('id')
    .eq('calendar_event_id', gpCal.id).maybeSingle();

  let gpRaceId;
  if (existingGp) {
    gpRaceId = existingGp.id;
    await supabase.from('races').update({ is_sprint: false, status: 'completed' }).eq('id', gpRaceId);
  } else {
    const { data: newRace, error: eRace } = await supabase
      .from('races').insert({ calendar_event_id: gpCal.id, is_sprint: false, status: 'completed' })
      .select('id').single();
    if (eRace) { console.error(eRace); process.exit(1); }
    gpRaceId = newRace.id;
  }

  // Risultati GP
  await supabase.from('race_results').delete().eq('race_id', gpRaceId);
  const gpRows = GP_RESULTS.filter(r => pilotMap[r.abbr]).map(r => ({
    race_id: gpRaceId,
    pilot_id: pilotMap[r.abbr],
    grid_position: r.grid,
    position: r.pos,
    dnf: r.dnf,
    dotd_rank: r.dotdRank,
  }));
  const { error: eGpInsert } = await supabase.from('race_results').insert(gpRows);
  if (eGpInsert) { console.error('Errore GP:', eGpInsert); process.exit(1); }
  console.log(`GP: ${gpRows.length} risultati inseriti (race_id: ${gpRaceId})`);

  // Lineups GP
  await supabase.from('lineups').delete().eq('race_id', gpRaceId);
  const gpLineups = [
    // ZetaRacing: LEC, ANT, LIN titolari, ALO panchina
    { race_id: gpRaceId, team_id: teamMap['ZetaRacing'],              pilot_id: pilotMap['LEC'], is_reserve: false },
    { race_id: gpRaceId, team_id: teamMap['ZetaRacing'],              pilot_id: pilotMap['ANT'], is_reserve: false },
    { race_id: gpRaceId, team_id: teamMap['ZetaRacing'],              pilot_id: pilotMap['LIN'], is_reserve: false },
    { race_id: gpRaceId, team_id: teamMap['ZetaRacing'],              pilot_id: pilotMap['ALO'], is_reserve: true },
    // Abdull Mazzar: BEA, COL, BOT titolari, PER panchina
    { race_id: gpRaceId, team_id: teamMap['Abdull Mazzar'],           pilot_id: pilotMap['BEA'], is_reserve: false },
    { race_id: gpRaceId, team_id: teamMap['Abdull Mazzar'],           pilot_id: pilotMap['COL'], is_reserve: false },
    { race_id: gpRaceId, team_id: teamMap['Abdull Mazzar'],           pilot_id: pilotMap['BOT'], is_reserve: false },
    { race_id: gpRaceId, team_id: teamMap['Abdull Mazzar'],           pilot_id: pilotMap['PER'], is_reserve: true },
    // Alpha Chiro Racing: HAD, OCO, PIA
    { race_id: gpRaceId, team_id: teamMap['Alpha Chiro Racing'],      pilot_id: pilotMap['HAD'], is_reserve: false },
    { race_id: gpRaceId, team_id: teamMap['Alpha Chiro Racing'],      pilot_id: pilotMap['OCO'], is_reserve: false },
    { race_id: gpRaceId, team_id: teamMap['Alpha Chiro Racing'],      pilot_id: pilotMap['PIA'], is_reserve: false },
    // Ranocchiettos: RUS, LAW, HUL
    { race_id: gpRaceId, team_id: teamMap['Ranocchiettos'],           pilot_id: pilotMap['RUS'], is_reserve: false },
    { race_id: gpRaceId, team_id: teamMap['Ranocchiettos'],           pilot_id: pilotMap['LAW'], is_reserve: false },
    { race_id: gpRaceId, team_id: teamMap['Ranocchiettos'],           pilot_id: pilotMap['HUL'], is_reserve: false },
    // SF Fainelli: VER, HAM, GAS titolari, ALB panchina
    { race_id: gpRaceId, team_id: teamMap['SF – Scuderia Fainelli'],  pilot_id: pilotMap['VER'], is_reserve: false },
    { race_id: gpRaceId, team_id: teamMap['SF – Scuderia Fainelli'],  pilot_id: pilotMap['HAM'], is_reserve: false },
    { race_id: gpRaceId, team_id: teamMap['SF – Scuderia Fainelli'],  pilot_id: pilotMap['GAS'], is_reserve: false },
    { race_id: gpRaceId, team_id: teamMap['SF – Scuderia Fainelli'],  pilot_id: pilotMap['ALB'], is_reserve: true },
    // Scudemaria Ferrari: NOR, SAI, BOR
    { race_id: gpRaceId, team_id: teamMap['Scudemaria Ferrari'],      pilot_id: pilotMap['NOR'], is_reserve: false },
    { race_id: gpRaceId, team_id: teamMap['Scudemaria Ferrari'],      pilot_id: pilotMap['SAI'], is_reserve: false },
    { race_id: gpRaceId, team_id: teamMap['Scudemaria Ferrari'],      pilot_id: pilotMap['BOR'], is_reserve: false },
  ];
  const { error: eGpLineup } = await supabase.from('lineups').insert(gpLineups);
  if (eGpLineup) console.error('Errore lineups GP:', eGpLineup);
  else console.log(`GP lineups: ${gpLineups.length} righe`);

  // Ricalcola punteggi
  const { error: rpcErr1 } = await supabase.rpc('recompute_team_race_scores', { p_race_id: sprintRaceId });
  if (rpcErr1) console.warn('recompute sprint:', rpcErr1.message);
  const { error: rpcErr2 } = await supabase.rpc('recompute_team_race_scores', { p_race_id: gpRaceId });
  if (rpcErr2) console.warn('recompute gp:', rpcErr2.message);

  console.log('\n=== RIPRISTINO COMPLETATO ===');
}

run().catch(console.error);
