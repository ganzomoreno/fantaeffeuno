/**
 * apply_asta3.js
 * Applica i risultati dell'Asta 3 (02/05/2026) - svolta dopo la sprint di Miami.
 * Bahrain (12/04) e Arabia Saudita (19/04) sono state cancellate.
 * Budget aggiunto: +100M per squadra.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAwMDkxNCwiZXhwIjoyMDg3NTc2OTE0fQ.kyBXfpPY0xvbqNDxpvZLfi75m0abEcSNpx3k39qH60I';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, SERVICE_ROLE_KEY);

const BUDGET_ADDED = 100;
const AUCTION_DATE = '2026-05-02';

const ASTA3_RESULTS = [
  { abbr: 'ANT', team: 'Scudemaria Ferrari', price: 75 },
  { abbr: 'HAD', team: 'Scudemaria Ferrari', price: 25 },
  { abbr: 'ALO', team: 'Scudemaria Ferrari', price: 1 },
  { abbr: 'BOT', team: 'Scudemaria Ferrari', price: 1 },

  { abbr: 'RUS', team: 'Alpha Chiro Racing', price: 72 },
  { abbr: 'ALB', team: 'Alpha Chiro Racing', price: 17 },
  { abbr: 'HUL', team: 'Alpha Chiro Racing', price: 13 },
  { abbr: 'SAI', team: 'Alpha Chiro Racing', price: 11 },

  { abbr: 'LEC', team: 'Abdull Mazzar', price: 53 },
  { abbr: 'NOR', team: 'Abdull Mazzar', price: 51 },
  { abbr: 'PIA', team: 'Abdull Mazzar', price: 39 },
  { abbr: 'VER', team: 'Abdull Mazzar', price: 37 },

  { abbr: 'BEA', team: 'SF – Scuderia Fainelli', price: 23 },
  { abbr: 'PER', team: 'SF – Scuderia Fainelli', price: 1 },
  { abbr: 'STR', team: 'SF – Scuderia Fainelli', price: 1 },

  { abbr: 'HAM', team: 'Ranocchiettos', price: 36 },
  { abbr: 'GAS', team: 'Ranocchiettos', price: 11 },
  { abbr: 'OCO', team: 'Ranocchiettos', price: 4 },
  { abbr: 'LAW', team: 'Ranocchiettos', price: 11 },

  { abbr: 'BOR', team: 'ZetaRacing', price: 14 },
  { abbr: 'LIN', team: 'ZetaRacing', price: 4 },
  { abbr: 'COL', team: 'ZetaRacing', price: 5 },
];

// Pre-Asta 3 budgets (post-Asta 2 confermati nel DB)
const PRE_ASTA3_BUDGETS = {
  'Scudemaria Ferrari': 17,
  'Alpha Chiro Racing': 75,
  'Abdull Mazzar': 152,
  'SF – Scuderia Fainelli': 0,
  'Ranocchiettos': 21,
  'ZetaRacing': 83,
};

async function run() {
  console.log('=== APPLICAZIONE ASTA 3 (02/05/2026) ===\n');

  // 0. Verifica calcoli budget
  console.log('--- Calcolo budget post-Asta 3 ---');
  const POST_ASTA3_BUDGETS = {};
  for (const [team, pre] of Object.entries(PRE_ASTA3_BUDGETS)) {
    const spent = ASTA3_RESULTS.filter(r => r.team === team).reduce((s, r) => s + r.price, 0);
    POST_ASTA3_BUDGETS[team] = pre + BUDGET_ADDED - spent;
    console.log(`  ${team}: ${pre}M + ${BUDGET_ADDED}M - ${spent}M = ${POST_ASTA3_BUDGETS[team]}M`);
  }
  console.log();

  const { data: pilots } = await supabase.from('pilots').select('id, abbreviation');
  const { data: teams } = await supabase.from('teams').select('id, name');
  const pilotByAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p]));
  const teamByName = Object.fromEntries(teams.map(t => [t.name, t]));

  // 1. Sposta data Asta 3 al 02/05/2026
  console.log('--- Aggiornamento data Asta 3 nel calendario ---');
  const { data: asta3Cal } = await supabase
    .from('calendar_events').select('id, event_date')
    .eq('event_type', 'auction').eq('location', 'Asta 3').maybeSingle();
  if (asta3Cal) {
    if (asta3Cal.event_date !== AUCTION_DATE) {
      await supabase.from('calendar_events').update({ event_date: AUCTION_DATE }).eq('id', asta3Cal.id);
      console.log(`  Asta 3 spostata: ${asta3Cal.event_date} → ${AUCTION_DATE}`);
    } else {
      console.log(`  Asta 3 già al ${AUCTION_DATE}`);
    }
  } else {
    console.log('  ATTENZIONE: evento Asta 3 non trovato.');
  }

  // 2. Aggiorna piloti (owner + price) e libera quelli non in Asta 3
  console.log('\n--- Aggiornamento ownership piloti ---');
  const assignedAbbrs = new Set(ASTA3_RESULTS.map(r => r.abbr));
  for (const item of ASTA3_RESULTS) {
    const pilot = pilotByAbbr[item.abbr];
    const team = teamByName[item.team];
    if (!pilot || !team) {
      console.error(`  ERRORE: ${item.abbr} o ${item.team} non trovato!`);
      continue;
    }
    const { error } = await supabase.from('pilots')
      .update({ purchase_price: item.price, owner_team_id: team.id })
      .eq('id', pilot.id);
    if (error) console.error(`  ERR ${item.abbr}: ${error.message}`);
    else console.log(`  ${item.abbr} → ${item.team} | ${item.price}M`);
  }
  for (const p of pilots) {
    if (!assignedAbbrs.has(p.abbreviation)) {
      await supabase.from('pilots').update({ owner_team_id: null, purchase_price: 0 }).eq('id', p.id);
      console.log(`  ${p.abbreviation}: liberato`);
    }
  }

  // 3. Aggiorna budget squadre
  console.log('\n--- Aggiornamento budget squadre ---');
  for (const [name, budget] of Object.entries(POST_ASTA3_BUDGETS)) {
    const t = teamByName[name];
    const { error } = await supabase.from('teams').update({ budget }).eq('id', t.id);
    if (error) console.error(`  ERR ${name}: ${error.message}`);
    else console.log(`  ${name}: → ${budget}M`);
  }

  // 4. Crea / aggiorna riga in auctions
  console.log('\n--- Riga auctions per Asta 3 ---');
  let { data: auction } = await supabase.from('auctions')
    .select('id').eq('auction_number', 3).maybeSingle();
  if (!auction && asta3Cal) {
    const { data: newA } = await supabase.from('auctions').insert({
      calendar_event_id: asta3Cal.id,
      auction_number: 3,
      budget_added: BUDGET_ADDED,
      is_completed: true,
    }).select('id').single();
    auction = newA;
    console.log(`  Creata Asta 3 (id ${auction.id})`);
  } else if (auction) {
    await supabase.from('auctions').update({
      is_completed: true, budget_added: BUDGET_ADDED,
    }).eq('id', auction.id);
    console.log(`  Asta 3 aggiornata (id ${auction.id})`);
  }

  // 5. Inserisci auction_lots
  if (auction) {
    await supabase.from('auction_lots').delete().eq('auction_id', auction.id);
    const lots = ASTA3_RESULTS.map((item, i) => ({
      auction_id: auction.id,
      pilot_id: pilotByAbbr[item.abbr].id,
      winner_team_id: teamByName[item.team].id,
      final_price: item.price,
      lot_order: i + 1,
    }));
    const { error: lotErr } = await supabase.from('auction_lots').insert(lots);
    if (lotErr) console.error('  ERR lotti:', lotErr.message);
    else console.log(`  ${lots.length} lotti inseriti`);
  }

  // 6. Verifica finale
  console.log('\n=== VERIFICA FINALE ===');
  const { data: updTeams } = await supabase.from('teams').select('name, budget').order('name');
  const { data: updPilots } = await supabase.from('pilots')
    .select('abbreviation, purchase_price, teams:owner_team_id(name)')
    .not('owner_team_id', 'is', null)
    .order('purchase_price', { ascending: false });
  const byTeam = {};
  updPilots.forEach(p => {
    const tn = p.teams?.name; if (!tn) return;
    (byTeam[tn] = byTeam[tn] || []).push(`${p.abbreviation} ${p.purchase_price}M`);
  });
  updTeams.forEach(t => {
    const roster = byTeam[t.name] ? byTeam[t.name].join(', ') : '—';
    console.log(`  ${t.name} (${t.budget}M): ${roster}`);
  });
  const { data: free } = await supabase.from('pilots').select('abbreviation').is('owner_team_id', null);
  console.log(`\n  Piloti liberi: ${free.length ? free.map(p => p.abbreviation).join(', ') : 'nessuno'}`);
  console.log('\n=== ASTA 3 COMPLETATA ===');
}

run().catch(console.error);
