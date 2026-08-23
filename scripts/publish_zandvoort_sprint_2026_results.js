/**
 * publish_zandvoort_sprint_2026_results.js — SPRINT GP Olanda (Zandvoort), 22/08/2026.
 * Prima (e ultima) Sprint di Zandvoort: il circuito esce dal calendario nel 2027.
 *
 * Fonti concordi: formula1.com (report ufficiale) + Sky Sports + GPFans/PlanetF1.
 * Russell vince dalla pole in testa dal via; Leclerc passa Norris al giro 18.
 *
 * Sprint: punteggio SOLO piazzamento top 8 (8-7-6-5-4-3-2-1). Niente sorpassi, niente DOTD.
 * grid_position = position (irrilevante nelle sprint, evita sorpassi fantasma).
 *
 * Casi particolari di questo weekend:
 * - HAD assente (infortunato): NESSUNA riga risultato. LAW corre sulla Red Bull.
 *   Segnalare ai proprietari di HAD lo switch infortunio (gratuito e obbligatorio da regolamento).
 * - HUL ritirato in gara (rientrato in pista ma non classificato) → dnf.
 * - P13 occupata dalla riserva che ha preso il sedile Racing Bulls di LAW:
 *   non è nel roster fantacalcio, quindi nessuna riga. Fuori zona punti, 0 impatto.
 *
 * Uso:
 *   node scripts/publish_zandvoort_sprint_2026_results.js --dry   # prova senza scrivere
 *   node scripts/publish_zandvoort_sprint_2026_results.js         # pubblica
 */
const fs = require('fs');
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const DRY = process.argv.includes('--dry');

// Classifica ufficiale Sprint. HAD assente. P13 = riserva fuori roster (nessuna riga).
const RESULTS = [
  { abbr: 'RUS', pos: 1 },
  { abbr: 'LEC', pos: 2 },
  { abbr: 'NOR', pos: 3 },
  { abbr: 'ANT', pos: 4 },
  { abbr: 'PIA', pos: 5 },
  { abbr: 'VER', pos: 6 },
  { abbr: 'HAM', pos: 7 },
  { abbr: 'GAS', pos: 8 },
  { abbr: 'BOR', pos: 9 },
  { abbr: 'LIN', pos: 10 },
  { abbr: 'LAW', pos: 11 }, // sulla Red Bull al posto di HAD
  { abbr: 'COL', pos: 12 },
  { abbr: 'OCO', pos: 14 },
  { abbr: 'BEA', pos: 15 },
  { abbr: 'ALB', pos: 16 },
  { abbr: 'STR', pos: 17 },
  { abbr: 'ALO', pos: 18 },
  { abbr: 'BOT', pos: 19 },
  { abbr: 'SAI', pos: 20 },
  { abbr: 'PER', pos: 21 },
  { abbr: 'HUL', pos: null, dnf: true }, // ritirato, rientrato, non classificato
];
const SPRINT_POINTS = { 1: 8, 2: 7, 3: 6, 4: 5, 5: 4, 6: 3, 7: 2, 8: 1 };

async function main() {
  // 1. Trova l'evento sprint di Zandvoort nel calendario
  const { data: events, error: eEv } = await sb
    .from('calendar_events')
    .select('*')
    .or('location.ilike.%oland%,location.ilike.%zandvoort%,location.ilike.%paesi bassi%,location.ilike.%netherlands%')
    .order('sort_order');
  if (eEv) throw eEv;
  if (!events?.length) throw new Error('Nessun calendar_event per Zandvoort/Olanda: controlla il calendario.');
  console.log('Eventi Zandvoort trovati:');
  events.forEach(ev => console.log(' ', JSON.stringify(ev)));

  // L'evento sprint: match esplicito su campi noti, altrimenti il primo dei due del weekend
  const sprintEv = events.find(ev =>
    ev.is_sprint === true ||
    /sprint/i.test(ev.event_type || '') ||
    /sprint/i.test(ev.title || ev.name || '')
  ) || events[0];
  console.log(`\n→ Evento scelto: sort_order ${sprintEv.sort_order} (id ${sprintEv.id})`);

  // 2. Ottieni/crea la race sprint
  const { data: existing } = await sb.from('races').select('id, is_sprint')
    .eq('calendar_event_id', sprintEv.id).maybeSingle();
  let raceId;
  if (existing) {
    raceId = existing.id;
    if (!existing.is_sprint && !DRY) await sb.from('races').update({ is_sprint: true }).eq('id', raceId);
    console.log(`Race esistente: ${raceId} (is_sprint: ${existing.is_sprint})`);
  } else if (DRY) {
    console.log('Race da creare (dry-run: non creata).');
  } else {
    const { data: nr, error: eR } = await sb.from('races')
      .insert({ calendar_event_id: sprintEv.id, is_sprint: true }).select('id').single();
    if (eR) throw eR;
    raceId = nr.id;
    console.log(`Race sprint creata: ${raceId}`);
  }

  // 3. Piloti
  const { data: pilots, error: eP } = await sb.from('pilots').select('id, abbreviation, name, owner_team_id, teams:owner_team_id(name)');
  if (eP) throw eP;
  const byAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p]));
  for (const r of RESULTS) if (!byAbbr[r.abbr]) throw new Error(`Pilota mancante in DB: ${r.abbr}`);
  const positions = RESULTS.filter(r => r.pos).map(r => r.pos);
  if (new Set(positions).size !== positions.length) throw new Error('Posizioni duplicate');
  console.log(`✓ Validazione OK (${RESULTS.length} righe risultato, HAD assente per infortunio)`);

  // 4. Scrittura
  if (!DRY && raceId) {
    await sb.from('race_results').delete().eq('race_id', raceId);
    const rows = RESULTS.map(r => ({
      race_id: raceId,
      pilot_id: byAbbr[r.abbr].id,
      grid_position: r.pos ?? null,
      position: r.pos ?? null,
      dotd_rank: null,
      dnf: r.dnf ?? false,
    }));
    const { error: eIns } = await sb.from('race_results').insert(rows);
    if (eIns) throw eIns;
    console.log('✓ race_results sprint inseriti');
  } else {
    console.log('(--dry: nessuna scrittura)');
  }

  // 5. Riepilogo punti pilota
  console.log('\n--- PUNTI PILOTA (sprint, top-8) ---');
  RESULTS.filter(r => r.pos && r.pos <= 8).forEach(r =>
    console.log(`  P${r.pos} ${r.abbr} ${byAbbr[r.abbr].name.padEnd(24)} ${SPRINT_POINTS[r.pos]} pt`));
  console.log('  (dal 9° in giù = 0 pt; HUL dnf = 0; HAD assente = nessuna riga)');

  // 6. Classifica squadre della sprint (dai lineups, se presenti)
  if (raceId) {
    const { data: lineups } = await sb.from('lineups')
      .select('team_id, pilot_id, is_reserve, teams:team_id(name)')
      .eq('race_id', raceId);
    if (!lineups?.length) {
      console.log('\n⚠️  Nessuna formazione per questa sprint: verificare (penalità -2 gestita da scoring.js lato app).');
    } else {
      const posByAbbr = Object.fromEntries(RESULTS.filter(r => r.pos).map(r => [r.abbr, r.pos]));
      const abbrById = Object.fromEntries(pilots.map(p => [p.id, p.abbreviation]));
      const teamPts = {};
      const starters = lineups.filter(l => !l.is_reserve);
      starters.forEach(l => {
        const a = abbrById[l.pilot_id];
        teamPts[l.teams.name] = (teamPts[l.teams.name] || 0) + (SPRINT_POINTS[posByAbbr[a]] || 0);
      });
      console.log('\n--- CLASSIFICA SPRINT (titolari) ---');
      Object.entries(teamPts).sort((a, b) => b[1] - a[1]).forEach(([name, pts], i) =>
        console.log(`  ${i + 1}. ${name.padEnd(24)} ${pts} pt`));
      const hadOwners = starters.filter(l => abbrById[l.pilot_id] === 'HAD');
      if (hadOwners.length) console.log(`\n⚠️  HAD era titolare per: ${hadOwners.map(l => l.teams.name).join(', ')} → segnalare switch infortunio (gratuito).`);
    }
  }
  console.log('\n✅ Sprint Zandvoort ' + (DRY ? 'validata (dry-run).' : 'pubblicata.'));
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
