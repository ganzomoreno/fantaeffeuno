/**
 * fix_auction_prices.js
 * Aggiorna SOLO i prezzi piloti, budget squadre e auction_lots
 * per allinearli allo spreadsheet ufficiale Asta 1.
 * NON tocca races, race_results, lineups.
 * Usa service_role key per bypassare RLS.
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAwMDkxNCwiZXhwIjoyMDg3NTc2OTE0fQ.kyBXfpPY0xvbqNDxpvZLfi75m0abEcSNpx3k39qH60I';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  SERVICE_ROLE_KEY
);

// Prezzi corretti dallo spreadsheet
const CORRECT_PRICES = [
  { abbr: 'LIN', team: 'ZetaRacing', price: 1 },
  { abbr: 'LEC', team: 'ZetaRacing', price: 54 },
  { abbr: 'ANT', team: 'ZetaRacing', price: 36 },
  { abbr: 'ALO', team: 'ZetaRacing', price: 1 },

  { abbr: 'VER', team: 'SF – Scuderia Fainelli', price: 46 },
  { abbr: 'HAM', team: 'SF – Scuderia Fainelli', price: 34 },
  { abbr: 'ALB', team: 'SF – Scuderia Fainelli', price: 8 },
  { abbr: 'GAS', team: 'SF – Scuderia Fainelli', price: 9 },

  { abbr: 'RUS', team: 'Ranocchiettos', price: 68 },
  { abbr: 'HUL', team: 'Ranocchiettos', price: 12 },
  { abbr: 'LAW', team: 'Ranocchiettos', price: 2 },

  { abbr: 'BOT', team: 'Abdull Mazzar', price: 1 },
  { abbr: 'PER', team: 'Abdull Mazzar', price: 1 },
  { abbr: 'COL', team: 'Abdull Mazzar', price: 1 },
  { abbr: 'BEA', team: 'Abdull Mazzar', price: 22 },

  { abbr: 'OCO', team: 'Alpha Chiro Racing', price: 6 },
  { abbr: 'HAD', team: 'Alpha Chiro Racing', price: 17 },
  { abbr: 'PIA', team: 'Alpha Chiro Racing', price: 51 },

  { abbr: 'SAI', team: 'Scudemaria Ferrari', price: 5 },
  { abbr: 'BOR', team: 'Scudemaria Ferrari', price: 10 },
  { abbr: 'NOR', team: 'Scudemaria Ferrari', price: 41 },
];

// Budget residui corretti
const CORRECT_BUDGETS = {
  'ZetaRacing': 8,
  'SF – Scuderia Fainelli': 3,
  'Ranocchiettos': 18,
  'Abdull Mazzar': 75,
  'Alpha Chiro Racing': 26,
  'Scudemaria Ferrari': 44,
};

async function run() {
  console.log('=== FIX AUCTION PRICES (solo prezzi + budget) ===\n');

  // Carica piloti e team dal DB
  const { data: pilots } = await supabase.from('pilots').select('id, abbreviation, name, purchase_price, owner_team_id');
  const { data: teams } = await supabase.from('teams').select('id, name, budget');

  const pilotByAbbr = {};
  pilots.forEach(p => pilotByAbbr[p.abbreviation] = p);
  const teamByName = {};
  teams.forEach(t => teamByName[t.name] = t);

  // 1. Aggiorna purchase_price e owner_team_id per ogni pilota
  console.log('--- Aggiornamento prezzi piloti ---');
  for (const item of CORRECT_PRICES) {
    const pilot = pilotByAbbr[item.abbr];
    const team = teamByName[item.team];
    if (!pilot || !team) {
      console.error(`  ERRORE: pilota ${item.abbr} o team ${item.team} non trovato!`);
      continue;
    }

    const needsUpdate = pilot.purchase_price !== item.price || pilot.owner_team_id !== team.id;
    if (needsUpdate) {
      const { error } = await supabase.from('pilots').update({
        purchase_price: item.price,
        owner_team_id: team.id
      }).eq('id', pilot.id);

      if (error) {
        console.error(`  ERRORE ${item.abbr}:`, error.message);
      } else {
        console.log(`  ${item.abbr}: ${pilot.purchase_price}M → ${item.price}M (${item.team})`);
      }
    } else {
      console.log(`  ${item.abbr}: OK (${item.price}M)`);
    }
  }

  // 2. Libera Stroll (se assegnato)
  const stroll = pilotByAbbr['STR'];
  if (stroll && stroll.owner_team_id !== null) {
    const { error } = await supabase.from('pilots').update({
      owner_team_id: null,
      purchase_price: 0
    }).eq('id', stroll.id);
    if (error) console.error('  ERRORE STR:', error.message);
    else console.log(`  STR: liberato (era in ${stroll.owner_team_id})`);
  } else {
    console.log('  STR: già libero');
  }

  // 3. Aggiorna budget squadre
  console.log('\n--- Aggiornamento budget squadre ---');
  for (const [teamName, correctBudget] of Object.entries(CORRECT_BUDGETS)) {
    const team = teamByName[teamName];
    if (!team) { console.error(`  ERRORE: team ${teamName} non trovato!`); continue; }

    if (team.budget !== correctBudget) {
      const { error } = await supabase.from('teams').update({ budget: correctBudget }).eq('id', team.id);
      if (error) console.error(`  ERRORE ${teamName}:`, error.message);
      else console.log(`  ${teamName}: ${team.budget}M → ${correctBudget}M`);
    } else {
      console.log(`  ${teamName}: OK (${correctBudget}M)`);
    }
  }

  // 4. Aggiorna auction_lots
  console.log('\n--- Aggiornamento auction_lots ---');
  const { data: auction } = await supabase.from('auctions').select('id').eq('auction_number', 1).single();
  if (!auction) { console.error('Asta 1 non trovata!'); return; }

  // Rimuovi il lotto di Stroll
  if (stroll) {
    const { data: strollLot } = await supabase.from('auction_lots')
      .select('id')
      .eq('auction_id', auction.id)
      .eq('pilot_id', stroll.id)
      .maybeSingle();
    if (strollLot) {
      await supabase.from('auction_lots').delete().eq('id', strollLot.id);
      console.log('  Rimosso lotto STR');
    }
  }

  // Aggiorna prezzi nei lotti
  for (const item of CORRECT_PRICES) {
    const pilot = pilotByAbbr[item.abbr];
    const team = teamByName[item.team];
    const { data: lot } = await supabase.from('auction_lots')
      .select('id, final_price')
      .eq('auction_id', auction.id)
      .eq('pilot_id', pilot.id)
      .maybeSingle();

    if (lot) {
      if (lot.final_price !== item.price) {
        await supabase.from('auction_lots').update({
          final_price: item.price,
          winner_team_id: team.id
        }).eq('id', lot.id);
        console.log(`  ${item.abbr}: lotto ${lot.final_price}M → ${item.price}M`);
      }
    } else {
      // Lotto mancante, crealo
      await supabase.from('auction_lots').insert({
        auction_id: auction.id,
        pilot_id: pilot.id,
        winner_team_id: team.id,
        final_price: item.price,
        lot_order: CORRECT_PRICES.indexOf(item) + 1
      });
      console.log(`  ${item.abbr}: lotto CREATO (${item.price}M → ${item.team})`);
    }
  }

  // 5. Verifica finale
  console.log('\n=== VERIFICA FINALE ===');
  const { data: updatedPilots } = await supabase.from('pilots')
    .select('abbreviation, purchase_price, teams:owner_team_id(name)')
    .not('owner_team_id', 'is', null)
    .order('purchase_price', { ascending: false });

  updatedPilots.forEach(p => {
    console.log(`  ${p.abbreviation} → ${p.teams?.name} | ${p.purchase_price}M`);
  });

  console.log('\n  Budget:');
  const { data: updatedTeams } = await supabase.from('teams').select('name, budget').order('name');
  updatedTeams.forEach(t => console.log(`  ${t.name}: ${t.budget}M`));

  console.log('\n=== COMPLETATO ===');
}

run().catch(console.error);
