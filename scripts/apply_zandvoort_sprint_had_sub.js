/**
 * apply_zandvoort_sprint_had_sub.js — Regola sostituzione pilota (Sprint Zandvoort 2026).
 * HAD infortunato: chi lo schiera viene conteggiato col sostituto TSU (P13 nella sprint).
 * Scrive la riga race_results di HAD con griglia/arrivo di TSU. Idempotente.
 * Uso: node scripts/apply_zandvoort_sprint_had_sub.js
 */
const fs = require('fs');
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const RACE_ID = '217c7967-847d-4d57-a779-b2a6f6f2dcb0'; // sprint Zandvoort
const SUB_POS = 13; // risultato di TSU nella sprint

async function main() {
  const { data: had, error: eP } = await sb.from('pilots')
    .select('id, abbreviation, name').eq('abbreviation', 'HAD').single();
  if (eP) throw eP;
  await sb.from('race_results').delete().eq('race_id', RACE_ID).eq('pilot_id', had.id);
  const { error: eIns } = await sb.from('race_results').insert({
    race_id: RACE_ID,
    pilot_id: had.id,
    grid_position: SUB_POS, // = position: nelle sprint niente sorpassi fantasma
    position: SUB_POS,
    dotd_rank: null,
    dnf: false,
  });
  if (eIns) throw eIns;
  console.log(`✓ Riga scritta: ${had.abbreviation} (${had.name}) conteggiato col sostituto TSU, P${SUB_POS} sprint = 0 pt (punti solo top-8).`);
  const { count } = await sb.from('race_results')
    .select('id', { count: 'exact', head: true }).eq('race_id', RACE_ID);
  console.log(`✓ race_results sprint Zandvoort ora: ${count} righe (22 = tutti i piloti del roster).`);
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
