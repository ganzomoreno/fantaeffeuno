/**
 * publish_singapore_sprint_2026_results.js — SPRINT GP Singapore (Marina Bay), 10/10/2026.
 * Prima Sprint di sempre a Singapore, sotto la pioggia.
 *
 * Fonti: formula1.com / crash.net / grandprix.com (classifica), formula1.com +
 * racefans (steward: nessuna penalita' per il contatto NOR-PIA all'ultimo giro).
 * Sprint: punti SOLO top 8 (8-7-6-5-4-3-2-1), niente sorpassi ne' DOTD.
 * grid_position = position per evitare sorpassi fantasma (convenzione sprint).
 * Ordine 9°/10° (GAS/OCO) incerto tra le fonti: irrilevante, entrambi a 0 pt.
 *
 * Uso:
 *   node scripts/publish_singapore_sprint_2026_results.js --dry
 *   node scripts/publish_singapore_sprint_2026_results.js
 */
require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const DRY = process.argv.includes('--dry');

const RACE_ID = '0f555106-6897-4953-9de9-adf00d135678'; // Sprint Singapore

const CLASSIFIED = ['VER', 'HAM', 'LEC', 'ANT', 'LAW', 'BEA', 'HUL', 'NOR',
                    'GAS', 'OCO', 'ALO', 'SAI', 'LIN'];
const DNF = ['RUS', 'PIA', 'STR', 'PER', 'HAD', 'COL', 'BOT', 'BOR', 'ALB'];

async function main() {
  const { data: pilots, error } = await sb.from('pilots').select('id, abbreviation, owner_team_id');
  if (error) throw error;
  const byAbbr = Object.fromEntries(pilots.map(p => [p.abbreviation, p]));
  const all = [...CLASSIFIED, ...DNF];
  if (all.length !== 22 || new Set(all).size !== 22) throw new Error('Servono 22 piloti distinti');
  for (const a of all) if (!byAbbr[a]) throw new Error(`Pilota mancante in DB: ${a}`);
  const { data: lu } = await sb.from('lineups').select('team_id, pilot_id, teams:team_id(name)').eq('race_id', RACE_ID);
  const owner = Object.fromEntries(pilots.map(p => [p.id, p.owner_team_id]));
  const bad = lu.filter(l => owner[l.pilot_id] !== l.team_id);
  if (bad.length) throw new Error(`Formazioni con piloti non in rosa: ${bad.map(b => b.teams.name).join(', ')}`);
  console.log(`✓ Validazione OK: 22 piloti, ${lu.length} righe formazione coerenti con le rose`);

  const rows = [
    ...CLASSIFIED.map((a, i) => ({ race_id: RACE_ID, pilot_id: byAbbr[a].id, grid_position: i + 1, position: i + 1, dotd_rank: null, dnf: false })),
    ...DNF.map(a => ({ race_id: RACE_ID, pilot_id: byAbbr[a].id, grid_position: null, position: null, dotd_rank: null, dnf: true })),
  ];
  if (DRY) { console.log('(--dry: nessuna scrittura)'); return; }
  const { error: eDel } = await sb.from('race_results').delete().eq('race_id', RACE_ID);
  if (eDel) throw eDel;
  const { error: eIns } = await sb.from('race_results').insert(rows);
  if (eIns) throw eIns;
  console.log(`✓ race_results Sprint Singapore inseriti: ${rows.length} righe`);
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
