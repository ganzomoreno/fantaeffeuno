// Ripristina i 2 piloti liberati per errore durante la sessione Asta 5 (2026-06-27):
//   COL (Colapinto) -> Abdull Mazzar @ 18M
//   LIN (Lindblad)  -> SF – Scuderia Fainelli @ 9M
// Usa i prezzi/vincitori dai lotti reali dell'Asta 4. Idempotente: salta i piloti
// che risultano già assegnati. I lotti storici Asta 4 sono già corretti.
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function restore(abbr) {
  // Trova il lotto Asta 4 per questo pilota (fonte di verità su vincitore e prezzo)
  const { data: a4 } = await supabase.from('auctions').select('id').eq('auction_number', 4).single();
  const { data: lot } = await supabase
    .from('auction_lots')
    .select('final_price, winner_team_id, pilots:pilot_id(id, abbreviation, name, owner_team_id), teams:winner_team_id(name)')
    .eq('auction_id', a4.id)
    .eq('pilots.abbreviation', abbr)
    .not('pilots', 'is', null)
    .maybeSingle();

  if (!lot) { console.log(`  ${abbr}: nessun lotto Asta 4 trovato, salto.`); return; }
  const pilot = lot.pilots;
  if (pilot.owner_team_id) {
    console.log(`  ${abbr}: già assegnato (owner_team_id presente), salto.`);
    return;
  }

  // Riassegna pilota + scala budget
  const { error: eP } = await supabase
    .from('pilots')
    .update({ owner_team_id: lot.winner_team_id, purchase_price: lot.final_price })
    .eq('id', pilot.id);
  if (eP) throw eP;

  const { data: team } = await supabase.from('teams').select('budget, name').eq('id', lot.winner_team_id).single();
  const newBudget = team.budget - lot.final_price;
  const { error: eT } = await supabase.from('teams').update({ budget: newBudget }).eq('id', lot.winner_team_id);
  if (eT) throw eT;

  console.log(`  ✓ ${abbr} (${pilot.name}) → ${team.name} @ ${lot.final_price}M | budget ${team.budget}M → ${newBudget}M`);
}

async function main() {
  console.log('Ripristino piloti liberati per errore:');
  await restore('COL');
  await restore('LIN');
  console.log('\n✅ Fatto.');
}

main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
