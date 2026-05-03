/**
 * apply_asta2.js
 * Applica i risultati dell'Asta 2 (16 marzo 2026).
 * Budget aggiunto: +180M per squadra.
 * Aggiorna: pilot owner/price, team budget, auction_lots.
 * NON tocca races, race_results, lineups.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAwMDkxNCwiZXhwIjoyMDg3NTc2OTE0fQ.kyBXfpPY0xvbqNDxpvZLfi75m0abEcSNpx3k39qH60I';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  SERVICE_ROLE_KEY
);

const BUDGET_ADDED = 180;

// Risultati Asta 2
const ASTA2_RESULTS = [
  { abbr: 'HAD', team: 'ZetaRacing', price: 10 },
  { abbr: 'HUL', team: 'ZetaRacing', price: 5 },
  { abbr: 'SAI', team: 'ZetaRacing', price: 5 },
  { abbr: 'LAW', team: 'ZetaRacing', price: 5 },

  { abbr: 'ANT', team: 'SF – Scuderia Fainelli', price: 56 },
  { abbr: 'NOR', team: 'SF – Scuderia Fainelli', price: 46 },
  { abbr: 'BOT', team: 'SF – Scuderia Fainelli', price: 1 },

  { abbr: 'HAM', team: 'Ranocchiettos', price: 62 },
  { abbr: 'PIA', team: 'Ranocchiettos', price: 28 },
  { abbr: 'OCO', team: 'Ranocchiettos', price: 6 },
  { abbr: 'BOR', team: 'Ranocchiettos', price: 1 },

  { abbr: 'GAS', team: 'Abdull Mazzar', price: 16 },
  { abbr: 'ALO', team: 'Abdull Mazzar', price: 6 },
  { abbr: 'PER', team: 'Abdull Mazzar', price: 1 },

  { abbr: 'ALB', team: 'Alpha Chiro Racing', price: 3 },
  { abbr: 'LEC', team: 'Alpha Chiro Racing', price: 2 },
  { abbr: 'VER', team: 'Alpha Chiro Racing', price: 32 },
  { abbr: 'COL', team: 'Alpha Chiro Racing', price: 14 },

  { abbr: 'RUS', team: 'Scudemaria Ferrari', price: 90 },
  { abbr: 'BEA', team: 'Scudemaria Ferrari', price: 33 },
  { abbr: 'LIN', team: 'Scudemaria Ferrari', price: 4 },
];

// Budget residui corretti (residuo asta1 + 180 - speso asta2)
const CORRECT_BUDGETS = {
  'ZetaRacing': 163,           // 8 + 180 - 25
  'SF – Scuderia Fainelli': 80, // 3 + 180 - 103
  'Ranocchiettos': 101,        // 18 + 180 - 97
  'Abdull Mazzar': 232,        // 75 + 180 - 23
  'Alpha Chiro Racing': 155,   // 26 + 180 - 51
  'Scudemaria Ferrari': 97,    // 44 + 180 - 127
};

async function run() {
  console.log('=== APPLICAZIONE ASTA 2 (16 marzo 2026) ===\n');

  // Carica piloti e team
  const { data: pilots } = await supabase.from('pilots').select('id, abbreviation, name, purchase_price, owner_team_id');
  const { data: teams } = await supabase.from('teams').select('id, name, budget');

  const pilotByAbbr = {};
  pilots.forEach(p => pilotByAbbr[p.abbreviation] = p);
  const teamByName = {};
  teams.forEach(t => teamByName[t.name] = t);

  // Lista di tutte le abbreviazioni assegnate in Asta 2
  const assignedAbbrs = new Set(ASTA2_RESULTS.map(r => r.abbr));

  // 1. Libera tutti i piloti NON in Asta 2 (es. Stroll)
  console.log('--- Reset piloti non acquistati ---');
  for (const pilot of pilots) {
    if (!assignedAbbrs.has(pilot.abbreviation) && pilot.owner_team_id !== null) {
      await supabase.from('pilots').update({ owner_team_id: null, purchase_price: 0 }).eq('id', pilot.id);
      console.log(`  ${pilot.abbreviation}: liberato`);
    }
  }

  // 2. Aggiorna owner e prezzo per ogni pilota dell'Asta 2
  console.log('\n--- Aggiornamento piloti Asta 2 ---');
  for (const item of ASTA2_RESULTS) {
    const pilot = pilotByAbbr[item.abbr];
    const team = teamByName[item.team];
    if (!pilot || !team) {
      console.error(`  ERRORE: ${item.abbr} o ${item.team} non trovato!`);
      continue;
    }

    const { error } = await supabase.from('pilots').update({
      purchase_price: item.price,
      owner_team_id: team.id
    }).eq('id', pilot.id);

    if (error) {
      console.error(`  ERRORE ${item.abbr}:`, error.message);
    } else {
      console.log(`  ${item.abbr} → ${item.team} | ${item.price}M`);
    }
  }

  // 3. Aggiorna budget squadre
  console.log('\n--- Aggiornamento budget ---');
  for (const [teamName, correctBudget] of Object.entries(CORRECT_BUDGETS)) {
    const team = teamByName[teamName];
    if (!team) continue;

    const { error } = await supabase.from('teams').update({ budget: correctBudget }).eq('id', team.id);
    if (error) console.error(`  ERRORE ${teamName}:`, error.message);
    else console.log(`  ${teamName}: ${team.budget}M → ${correctBudget}M`);
  }

  // 4. Gestisci auction_lots per Asta 2
  console.log('\n--- Auction lots Asta 2 ---');
  // Cerca o crea l'asta 2
  let { data: auction } = await supabase.from('auctions')
    .select('id').eq('auction_number', 2).maybeSingle();

  if (!auction) {
    // Prova a trovare la seconda asta dal calendario
    const { data: auctionEvent } = await supabase.from('calendar_events')
      .select('id').ilike('location', '%Asta 2%').maybeSingle();

    if (auctionEvent) {
      const { data: newAuction } = await supabase.from('auctions').insert({
        calendar_event_id: auctionEvent.id,
        auction_number: 2,
        budget_added: BUDGET_ADDED,
        is_completed: true
      }).select('id').single();
      auction = newAuction;
      console.log(`  Creata asta 2 (id: ${auction.id})`);
    } else {
      console.log('  Evento Asta 2 non trovato nel calendario, creo lotti senza auction_id...');
    }
  } else {
    // Aggiorna come completata e budget aggiunto
    await supabase.from('auctions').update({
      is_completed: true,
      budget_added: BUDGET_ADDED
    }).eq('id', auction.id);
    console.log(`  Asta 2 trovata (id: ${auction.id})`);
  }

  if (auction) {
    // Pulisci vecchi lotti dell'asta 2
    await supabase.from('auction_lots').delete().eq('auction_id', auction.id);

    // Inserisci nuovi lotti
    const lots = ASTA2_RESULTS.map((item, i) => ({
      auction_id: auction.id,
      pilot_id: pilotByAbbr[item.abbr].id,
      winner_team_id: teamByName[item.team].id,
      final_price: item.price,
      lot_order: i + 1
    }));

    const { error: lotErr } = await supabase.from('auction_lots').insert(lots);
    if (lotErr) console.error('  Errore lotti:', lotErr.message);
    else console.log(`  ${lots.length} lotti inseriti`);
  }

  // 5. Verifica finale
  console.log('\n=== VERIFICA FINALE ===');
  const { data: updatedPilots } = await supabase.from('pilots')
    .select('abbreviation, purchase_price, teams:owner_team_id(name)')
    .not('owner_team_id', 'is', null)
    .order('purchase_price', { ascending: false });

  const byTeam = {};
  updatedPilots.forEach(p => {
    const tn = p.teams?.name || '?';
    if (!byTeam[tn]) byTeam[tn] = [];
    byTeam[tn].push(`${p.abbreviation} ${p.purchase_price}M`);
  });

  const { data: updatedTeams } = await supabase.from('teams').select('name, budget').order('name');
  updatedTeams.forEach(t => {
    const roster = byTeam[t.name] ? byTeam[t.name].join(', ') : 'nessuno';
    console.log(`  ${t.name} (budget: ${t.budget}M): ${roster}`);
  });

  const { data: freePilots } = await supabase.from('pilots')
    .select('abbreviation, name').is('owner_team_id', null);
  if (freePilots.length) {
    console.log(`\n  Piloti liberi: ${freePilots.map(p => p.abbreviation).join(', ')}`);
  }

  console.log('\n=== ASTA 2 COMPLETATA ===');
}

run().catch(console.error);
