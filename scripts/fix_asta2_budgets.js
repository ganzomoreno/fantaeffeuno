/**
 * fix_asta2_budgets.js
 * Corregge i budget dopo Asta 2: +100M (non +180M).
 */
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAwMDkxNCwiZXhwIjoyMDg3NTc2OTE0fQ.kyBXfpPY0xvbqNDxpvZLfi75m0abEcSNpx3k39qH60I';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  SERVICE_ROLE_KEY
);

// Budget corretti: residuo Asta 1 + 100 - speso Asta 2
const CORRECT_BUDGETS = {
  'ZetaRacing': 83,              // 8 + 100 - 25
  'SF – Scuderia Fainelli': 0,   // 3 + 100 - 103
  'Ranocchiettos': 21,           // 18 + 100 - 97
  'Abdull Mazzar': 152,          // 75 + 100 - 23
  'Alpha Chiro Racing': 75,      // 26 + 100 - 51
  'Scudemaria Ferrari': 17,      // 44 + 100 - 127
};

async function run() {
  console.log('=== FIX BUDGET ASTA 2 (+100M, non +180M) ===\n');

  const { data: teams } = await supabase.from('teams').select('id, name, budget').order('name');

  for (const team of teams) {
    const correct = CORRECT_BUDGETS[team.name];
    if (correct === undefined) continue;

    const { error } = await supabase.from('teams').update({ budget: correct }).eq('id', team.id);
    if (error) {
      console.error(`  ERRORE ${team.name}:`, error.message);
    } else {
      console.log(`  ${team.name}: ${team.budget}M → ${correct}M`);
    }
  }

  // Aggiorna anche budget_added nell'asta 2
  const { data: auction } = await supabase.from('auctions')
    .select('id').eq('auction_number', 2).maybeSingle();
  if (auction) {
    await supabase.from('auctions').update({ budget_added: 100 }).eq('id', auction.id);
    console.log('\n  Asta 2 budget_added: 100M');
  }

  console.log('\n=== COMPLETATO ===');
}

run().catch(console.error);
