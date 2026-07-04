const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwY2h1dXF3a25sZHFland4dGF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjAwMDkxNCwiZXhwIjoyMDg3NTc2OTE0fQ.kyBXfpPY0xvbqNDxpvZLfi75m0abEcSNpx3k39qH60I';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, SERVICE_ROLE_KEY);

// Risultati gara secondo immagine, con HAM 2° e VER 3°
// DOTD: HAM=1, ANT=2, VER=3
const RESULTS_BY_ABBR = {
  ANT: { pos: 1, dotd: 2 },
  HAM: { pos: 2, dotd: 1 },
  VER: { pos: 3, dotd: 3 },
  LEC: { pos: 4 },
  HAD: { pos: 5 },
  COL: { pos: 6 },
  LAW: { pos: 7 },
  GAS: { pos: 8 },
  SAI: { pos: 9 },
  BEA: { pos: 10 },
  HUL: { pos: 11 },
  BOR: { pos: 12 },
  PIA: { pos: 13 },
  OCO: { pos: 14 },
  STR: { pos: 15 },
  BOT: { pos: 16 },
  PER: { pos: 17 },
  NOR: { dnf: true },
  RUS: { dnf: true },
  ALO: { dnf: true },
  ALB: { dnf: true },
  LIN: { dnf: true },
};

const POINTS_TABLE = { 1:25,2:22,3:20,4:18,5:16,6:15,7:14,8:13,9:12,10:11,11:10,12:9,13:8,14:7,15:6,16:5,17:4,18:3,19:2,20:1,21:0,22:0 };
const DOTD_POINTS = { 1: 3, 2: 2, 3: 1 };

function pilotPoints(r) {
  if (r.dnf) return 0;
  let pts = POINTS_TABLE[r.pos] || 0;
  if (r.dotd) pts += DOTD_POINTS[r.dotd];
  return pts;
}

async function main() {
  // Trova la gara più recente (status open/draft/closed più recente)
  const { data: races, error: rerr } = await supabase
    .from('races')
    .select('id, is_sprint, calendar_event_id, calendar_events(location, event_date, sort_order, is_completed)')
    .order('calendar_event_id');
  if (rerr) { console.error('races err:', rerr); return; }

  // Prendi l'ultima gara con lineups inseriti
  const { data: lineupsAll, error: lupErr } = await supabase
    .from('lineups')
    .select('race_id, team_id, pilot_id, is_reserve, teams(name), pilots!lineups_pilot_id_fkey(abbreviation,name)');
  if (lupErr) { console.error('lineups err:', lupErr); return; }
  if (!lineupsAll) { console.error('lineupsAll is null'); return; }

  // Trova la race_id con più lineups recenti (= la prossima/corrente)
  const counts = {};
  lineupsAll.forEach(l => { counts[l.race_id] = (counts[l.race_id]||0)+1; });
  const raceIds = Object.keys(counts).filter(rid => counts[rid] >= 18);
  // Prendi la race più recente per data
  let target = null;
  for (const rid of raceIds) {
    const race = races.find(r => r.id === rid);
    if (!race) continue;
    if (!target || (race.calendar_events?.sort_order || 0) > (target.calendar_events?.sort_order || 0)) {
      target = race;
    }
  }
  if (!target) { console.log('No race with lineups found'); return; }

  console.log(`\n=== TARGET RACE: ${target.calendar_events?.location} ${target.calendar_events?.event_date} (id=${target.id}) ===\n`);

  const teamLineups = {};
  lineupsAll.filter(l => l.race_id === target.id).forEach(l => {
    const tname = l.teams.name;
    if (!teamLineups[tname]) teamLineups[tname] = { starters: [], reserve: null };
    if (l.is_reserve) teamLineups[tname].reserve = l.pilots.abbreviation;
    else teamLineups[tname].starters.push(l.pilots.abbreviation);
  });

  // Stampa lineup + calcolo punti
  console.log('SCENARIO: ANT 1° | HAM 2° | VER 3° | DOTD: HAM=1, ANT=2, VER=3\n');
  const table = [];
  for (const tname in teamLineups) {
    const { starters, reserve } = teamLineups[tname];
    let total = 0;
    const detail = [];
    starters.forEach(ab => {
      const r = RESULTS_BY_ABBR[ab] || {};
      const pts = pilotPoints(r);
      total += pts;
      const note = r.dnf ? 'DNF' : `P${r.pos}${r.dotd ? ` +DOTD${r.dotd}` : ''}`;
      detail.push(`${ab}(${note})=${pts}`);
    });
    table.push({ team: tname, total, starters: starters.join('/'), reserve, detail: detail.join(' | ') });
  }
  table.sort((a,b)=>b.total-a.total);
  table.forEach((t,i)=>{
    console.log(`${i+1}. ${t.team.padEnd(28)} ${String(t.total).padStart(5)} pt | Titolari: ${t.starters} | Risv: ${t.reserve||'-'}`);
    console.log(`     ${t.detail}\n`);
  });
}

main().catch(console.error);
