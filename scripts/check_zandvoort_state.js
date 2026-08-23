/**
 * check_zandvoort_state.js — Stato DB per il weekend di Zandvoort (Olanda 2026).
 * Sola lettura: calendario, races, formazioni, risultati esistenti.
 * Uso: node scripts/check_zandvoort_state.js
 */
const fs = require('fs');
for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: events, error: e1 } = await sb.from('calendar_events').select('*').order('sort_order');
  if (e1) throw e1;
  console.log('=== CALENDAR EVENTS ===');
  events.forEach(ev => console.log(
    ` ${String(ev.sort_order).padStart(3)} | ${(ev.location || '').padEnd(16)} | ${ev.event_type || ''} | ${ev.event_date || ev.date || ''} | id:${ev.id}`
  ));
  const { data: races, error: e2 } = await sb.from('races').select('*');
  if (e2) throw e2;
  console.log('\n=== RACES ===');
  races.forEach(r => console.log(` race ${r.id} | event:${r.calendar_event_id} | sprint:${r.is_sprint}`));
  const { data: lineups } = await sb.from('lineups').select('race_id');
  const byRace = {};
  (lineups || []).forEach(l => { byRace[l.race_id] = (byRace[l.race_id] || 0) + 1; });
  console.log('\n=== LINEUPS per race ===');
  Object.entries(byRace).forEach(([rid, n]) => console.log(` ${rid}: ${n} righe`));
  const { data: results } = await sb.from('race_results').select('race_id');
  const resByRace = {};
  (results || []).forEach(r => { resByRace[r.race_id] = (resByRace[r.race_id] || 0) + 1; });
  console.log('\n=== RACE_RESULTS per race ===');
  Object.entries(resByRace).forEach(([rid, n]) => console.log(` ${rid}: ${n} righe`));
}
main().catch(e => { console.error('ERRORE:', e.message || e); process.exit(1); });
