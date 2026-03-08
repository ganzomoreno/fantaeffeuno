import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const MOCK_RESULTS = [
    { abbr: "NOR", grid: 1, end: 1, dnf: false, dotdRank: 1 },
    { abbr: "PIA", grid: 2, end: 9, dnf: false, dotdRank: null },
    { abbr: "VER", grid: 3, end: 2, dnf: false, dotdRank: 2 },
    { abbr: "RUS", grid: 4, end: 3, dnf: false, dotdRank: null },
    { abbr: "TSU", grid: 5, end: 12, dnf: false, dotdRank: null },
    { abbr: "ALB", grid: 6, end: 5, dnf: false, dotdRank: 3 },
    { abbr: "LEC", grid: 7, end: 8, dnf: false, dotdRank: null },
    { abbr: "HAM", grid: 8, end: 10, dnf: false, dotdRank: null },
    { abbr: "GAS", grid: 9, end: 11, dnf: false, dotdRank: null },
    { abbr: "SAI", grid: 10, end: null, dnf: true, dotdRank: null },
    { abbr: "HAD", grid: 11, end: null, dnf: true, dotdRank: null },
    { abbr: "ALO", grid: 12, end: null, dnf: true, dotdRank: null },
    { abbr: "STR", grid: 13, end: 6, dnf: false, dotdRank: null },
    { abbr: "COL", grid: 14, end: null, dnf: true, dotdRank: null },
    { abbr: "BOR", grid: 15, end: null, dnf: true, dotdRank: null },
    { abbr: "LIN", grid: 16, end: 4, dnf: false, dotdRank: null },
    { abbr: "HUL", grid: 17, end: 7, dnf: false, dotdRank: null },
    { abbr: "LAW", grid: 18, end: 15, dnf: false, dotdRank: null },
    { abbr: "OCO", grid: 19, end: 13, dnf: false, dotdRank: null },
    { abbr: "BEA", grid: 20, end: 14, dnf: false, dotdRank: null },
    { abbr: "BOT", grid: 21, end: 16, dnf: false, dotdRank: null },
    { abbr: "PER", grid: 22, end: 17, dnf: false, dotdRank: null }
];

async function run() {
    const { data: pilots } = await supabase.from('pilots').select('id, abbreviation');
    const pilotMap = {};
    pilots.forEach(p => pilotMap[p.abbreviation] = p.id);

    const { data: r } = await supabase.from('races').select('id')
        .eq('calendar_event_id', (await supabase.from('calendar_events').select('id').eq('sort_order', 0).single()).data.id)
        .single();
    const raceId = r.id;

    await supabase.from('race_results').delete().eq('race_id', raceId);

    const inserts = MOCK_RESULTS.filter(m => {
        if (!pilotMap[m.abbr]) {
            console.log(`Skipping pilot ${m.abbr} (not in DB)`);
            return false;
        }
        return true;
    }).map(m => ({
        race_id: raceId,
        pilot_id: pilotMap[m.abbr],
        grid_position: m.grid,
        position: m.end,
        dnf: m.dnf,
        dotd_rank: m.dotdRank,
    }));

    const { error } = await supabase.from('race_results').insert(inserts);
    if (error) {
        console.error('Error inserting results:', error);
    } else {
        console.log('Melbourne 2025 actual results inserted successfully.');
        await supabase.from('races').update({ status: 'completed' }).eq('id', raceId);
    }
}

run();
