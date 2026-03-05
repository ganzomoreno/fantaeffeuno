const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
const envContent = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
const url = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/);
const key = keyMatch ? keyMatch[1].trim() : envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const supabase = createClient(url, key);

async function simulate() {
    console.log('--- GP AUSTRALIA SIMULATION (FULL GRID) ---');

    const { data: melbourneEvent } = await supabase.from('calendar_events').select('*').eq('sort_order', 0).single();

    let { data: race } = await supabase.from('races').select('*').eq('calendar_event_id', melbourneEvent.id).maybeSingle();
    if (!race) {
        const res = await supabase.from('races').insert({ calendar_event_id: melbourneEvent.id, is_sprint: false }).select().single();
        race = res.data;
    }

    const { data: pilotsWithOwners } = await supabase.from('v_pilots_with_owners').select('*');

    console.log('1. Inserting lineups (all 3 drivers starting for each team)...');
    await supabase.from('lineups').delete().eq('race_id', race.id);
    const lineupsToInsert = pilotsWithOwners.filter(p => p.owner_team_id).map(p => ({
        race_id: race.id, team_id: p.owner_team_id, pilot_id: p.id, is_reserve: false
    }));
    if (lineupsToInsert.length > 0) await supabase.from('lineups').insert(lineupsToInsert);

    // Result simulation with 22 drivers.
    // We specify grid position, end position, dotd. Overtakes are calculated automatically by the DB trigger if we omit it or just pass 0 and let it be overwritten (not optimal if we pass explicit overtakes, but the trigger does:
    // IF NEW.grid_position IS NOT NULL AND NEW.position IS NOT NULL AND NOT NEW.dnf THEN NEW.overtakes = GREATEST(0, grid - pos).

    const results = [
        { name: 'Charles Leclerc', grid: 1, pos: 1, dotd: 1, dnf: false }, // 25 + 0(ovt) + 3(dotd) = 28
        { name: 'Lando Norris', grid: 4, pos: 2, dotd: 2, dnf: false }, // 22 + 1(ovt x 0.5) + 2(dotd) = 25
        { name: 'Max Verstappen', grid: 3, pos: 3, dotd: null, dnf: false }, // 20
        { name: 'Oscar Piastri', grid: 5, pos: 4, dotd: 3, dnf: false }, // 18 + 0.5(ovt) + 1(dotd) = 19.5
        { name: 'Carlos Sainz', grid: 9, pos: 5, dotd: null, dnf: false }, // 16 + 2(ovt) = 18
        { name: 'George Russell', grid: 6, pos: 6, dotd: null, dnf: false }, // 15
        { name: 'Fernando Alonso', grid: 10, pos: 7, dotd: null, dnf: false }, // 14 + 1.5(ovt) = 15.5
        { name: 'Andrea Kimi Antonelli', grid: 15, pos: 8, dotd: null, dnf: false }, // 13 + 3.0(ovt MAX) = 16
        { name: 'Nico Hülkenberg', grid: 9, pos: 9, dotd: null, dnf: false }, // 12
        { name: 'Alexander Albon', grid: 11, pos: 10, dotd: null, dnf: false }, // 11 + 0.5 = 11.5
        { name: 'Gabriel Bortoleto', grid: 13, pos: 11, dotd: null, dnf: false }, // 10 + 1 = 11
        { name: 'Esteban Ocon', grid: 12, pos: 12, dotd: null, dnf: false }, // 9
        { name: 'Pierre Gasly', grid: 14, pos: 13, dotd: null, dnf: false }, // 8 + 0.5 = 8.5
        { name: 'Liam Lawson', grid: 18, pos: 14, dotd: null, dnf: false }, // 7 + 2 = 9
        { name: 'Oliver Bearman', grid: 15, pos: 15, dotd: null, dnf: false }, // 6
        { name: 'Valtteri Bottas', grid: 19, pos: 16, dotd: null, dnf: false }, // 5 + 1.5 = 6.5
        { name: 'Arvid Lindblad', grid: 17, pos: 17, dotd: null, dnf: false }, // 4
        { name: 'Isack Hadjar', grid: 20, pos: 18, dotd: null, dnf: false }, // 3 + 1 = 4
        { name: 'Franco Colapinto', grid: 19, pos: 19, dotd: null, dnf: false }, // 2
        { name: 'Lance Stroll', grid: 22, pos: 20, dotd: null, dnf: false }, // 1 + 1 = 2
        { name: 'Lewis Hamilton', grid: 2, pos: null, dotd: null, dnf: true }, // DNF
        { name: 'Sergio Pérez', grid: 21, pos: null, dotd: null, dnf: true }  // DNF
    ];

    console.log('2. Inserting race results...');
    await supabase.from('race_results').delete().eq('race_id', race.id);
    const rr = [];
    for (const r of results) {
        const p = pilotsWithOwners.find(x => x.name === r.name);
        if (p) {
            rr.push({
                race_id: race.id,
                pilot_id: p.id,
                grid_position: r.grid,
                position: r.pos,
                dotd_rank: r.dotd,
                dnf: r.dnf
            });
        } else {
            console.warn('Scusa, pilota non trovato:', r.name);
        }
    }
    if (rr.length > 0) {
        const { error } = await supabase.from('race_results').insert(rr);
        if (error) console.error('Error inserting results:', error);
    }

    console.log('3. Recomputing team scores via pgSQL RPC func...');
    await supabase.rpc('recompute_team_race_scores', { p_race_id: race.id });

    console.log('\\n--- 🏆 TOP 10 PILOTI ---');
    const { data: dbRes } = await supabase.from('race_results').select('*, pilots(name)').eq('race_id', race.id).order('points_scored', { ascending: false }).limit(10);
    for (let i = 0; i < dbRes.length; i++) {
        const r = dbRes[i];
        console.log(`${i + 1}. ${r.pilots.name.padEnd(25)} | Grid: P${r.grid_position} -> Arrivo: P${r.position} | Ovt: ${r.overtakes} | Punti: ${r.points_scored}`);
    }

    console.log('\\n--- 🏎️ CLASSIFICA FANTA F1 ---');
    const { data: teamsLB } = await supabase.from('v_leaderboard').select('*').order('total_points', { ascending: false });
    for (let i = 0; i < teamsLB.length; i++) console.log((i + 1) + '. ' + teamsLB[i].team_name.padEnd(25) + ' | Totale: ' + teamsLB[i].total_points + ' pt');

}
simulate().catch(console.error);
