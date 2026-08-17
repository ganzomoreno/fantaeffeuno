/**
 * open_next_auction.js — Apre la prossima asta. Mirror esatto di lib/db.js openNextAuction
 * (stessa logica e stesse garanzie), più la pulizia delle formazioni future.
 *
 * Cosa fa:
 *   1. GUARD idempotenza: se esiste già un'asta APERTA non fa NULLA (niente +100M doppio)
 *   2. crea la riga auctions #N (aperta) sul calendar_event "Asta N"
 *   3. +100M al budget di ogni squadra — UNA sola volta
 *   4. libera tutti i piloti (re-draft, senza rimborso)
 *   5. cancella le formazioni già inserite per gare NON ancora disputate
 *      (dopo il re-draft schiererebbero piloti non più di proprietà)
 *
 * Uso: node scripts/open_next_auction.js --dry   → mostra il piano, non scrive
 *      node scripts/open_next_auction.js         → applica
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const DRY = process.argv.includes('--dry');
const BUDGET_TO_ADD = 100;

async function main() {
  console.log(DRY ? '=== DRY RUN — nessuna scrittura ===\n' : '=== APERTURA PROSSIMA ASTA ===\n');

  const { data: auctions } = await sb.from('auctions').select('id, auction_number, is_completed').order('auction_number');
  const { data: teams } = await sb.from('teams').select('id, name, budget').order('created_at');

  // ── 1. GUARD idempotenza ────────────────────────────────────────────────────
  const alreadyOpen = (auctions || []).find(a => !a.is_completed);
  if (alreadyOpen) {
    console.log(`⚠️  Asta ${alreadyOpen.auction_number} è già APERTA.`);
    console.log('    NON creo nulla e NON aggiungo budget (evita il +100M doppio).');
    return;
  }
  const nextNumber = (auctions || []).reduce((m, a) => Math.max(m, a.auction_number), 0) + 1;

  const { data: calEv } = await sb.from('calendar_events').select('id, event_date')
    .eq('event_type', 'auction').eq('location', `Asta ${nextNumber}`).maybeSingle();
  if (!calEv) throw new Error(`Calendar event "Asta ${nextNumber}" non trovato.`);
  console.log(`Asta da aprire: Asta ${nextNumber} (${calEv.event_date})\n`);

  console.log('Budget: ATTUALE → DOPO (+100M una sola volta)');
  teams.forEach(t => console.log(`  ${t.name.padEnd(24)} ${String(t.budget).padStart(4)} → ${String(t.budget + BUDGET_TO_ADD).padStart(4)}`));

  const { data: owned } = await sb.from('pilots').select('id').not('owner_team_id', 'is', null);
  console.log(`\nPiloti da liberare per il re-draft: ${owned.length}/22`);

  // ── Formazioni future da azzerare (gare senza risultati) ────────────────────
  const { data: races } = await sb.from('races').select('id, calendar_events(location, sort_order)');
  const { data: rr } = await sb.from('race_results').select('race_id');
  const withResults = new Set((rr || []).map(r => r.race_id));
  const { data: allLu } = await sb.from('lineups').select('id, race_id, team_id, pilot_id');
  const { data: pilotsAll } = await sb.from('pilots').select('id, abbreviation');
  const pAbbr = Object.fromEntries(pilotsAll.map(p => [p.id, p.abbreviation]));
  const tName = Object.fromEntries(teams.map(t => [t.id, t.name]));
  const raceInfo = Object.fromEntries((races || []).map(r => [r.id, r.calendar_events]));

  const staleLu = (allLu || []).filter(l => !withResults.has(l.race_id));
  console.log(`\nFormazioni su gare non ancora disputate: ${staleLu.length}`);
  staleLu.forEach(l => {
    const ev = raceInfo[l.race_id];
    console.log(`  ${(ev?.location || '?').padEnd(16)} ${tName[l.team_id].padEnd(24)} ${pAbbr[l.pilot_id]}`);
  });
  if (staleLu.length) console.log('  → verranno cancellate: dopo il re-draft schiererebbero piloti non più propri');

  if (DRY) { console.log('\n(--dry: nessuna modifica applicata)'); return; }

  // ── 2. Crea la riga asta ────────────────────────────────────────────────────
  const { data: created, error: eIns } = await sb.from('auctions')
    .insert({ calendar_event_id: calEv.id, auction_number: nextNumber, budget_added: BUDGET_TO_ADD, is_completed: false })
    .select('id, auction_number').single();
  if (eIns) throw eIns;
  console.log(`\n✓ Creata Asta ${created.auction_number} (id=${created.id}, aperta)`);

  // ── 3. +100M una sola volta ─────────────────────────────────────────────────
  for (const t of teams) {
    const { error } = await sb.from('teams').update({ budget: t.budget + BUDGET_TO_ADD }).eq('id', t.id);
    if (error) throw error;
  }
  console.log('✓ +100M accreditati (una sola volta)');

  // ── 4. Re-draft: libera i piloti ────────────────────────────────────────────
  const { error: eFree } = await sb.from('pilots')
    .update({ owner_team_id: null, purchase_price: 0 }).not('owner_team_id', 'is', null);
  if (eFree) throw eFree;
  console.log('✓ Piloti liberati');

  // ── 5. Pulisci le formazioni future ─────────────────────────────────────────
  for (const l of staleLu) {
    const { error } = await sb.from('lineups').delete().eq('id', l.id);
    if (error) throw error;
  }
  if (staleLu.length) console.log(`✓ ${staleLu.length} formazioni future cancellate`);

  // ── Verifica finale ─────────────────────────────────────────────────────────
  const { data: after } = await sb.from('teams').select('name, budget').order('budget', { ascending: false });
  const { count: free } = await sb.from('pilots').select('*', { count: 'exact', head: true }).is('owner_team_id', null);
  console.log('\n=== STATO FINALE ===');
  after.forEach(t => console.log(`  ${t.name.padEnd(24)} ${t.budget}M`));
  console.log(`  Piloti liberi: ${free}/22`);
  console.log(`\n✅ Asta ${created.auction_number} APERTA — gestibile da ASTA LIVE.`);
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
