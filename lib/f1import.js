/**
 * f1import.js — Import automatico risultati gara dalla Jolpica F1 API
 * (Ergast-compatibile, JSON pubblico con CORS aperto → usabile lato client).
 *
 * Recupera: griglia di partenza, posizione d'arrivo, DNF.
 * I SORPASSI li calcola il trigger DB (overtakes = max(0, grid - pos), cap +3pt).
 * Il DRIVER OF THE DAY non è in nessuna API: resta da impostare/confermare a mano.
 *
 * Funzioni pure + fetch, nessuna dipendenza da React/Supabase.
 */

const DEFAULT_BASE = 'https://api.jolpi.ca/ergast/f1';

/** "DD/MM/YYYY" → "YYYY-MM-DD" */
export function calDateToISO(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split('/');
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** Parsing data calendario italiano "DD/MM/YYYY" → Date (mezzanotte UTC) */
export function parseCalDate(ddmmyyyy) {
  return new Date(calDateToISO(ddmmyyyy) + 'T00:00:00Z');
}

/**
 * Trova l'indice (calendarIndex == sort_order) dell'ultima gara da importare:
 * la più recente gara passata (type 'race', non cancellata), preferendo quelle
 * senza risultati salvati; in mancanza, la più recente comunque (re-import).
 * @param {Array} calendar  CALENDAR da lib/data.js
 * @param {Array} racesWithResults  output di db.fetchRaces() (hanno calendarIndex)
 * @param {Date}  today
 * @returns {{index:number, entry:object, alreadyHasResults:boolean}|null}
 */
export function findLatestRaceToImport(calendar, racesWithResults, today = new Date()) {
  const done = new Set((racesWithResults || []).map(r => r.calendarIndex));
  const t = new Date(today); t.setHours(0, 0, 0, 0);

  const candidates = calendar
    .map((ev, i) => ({ ...ev, index: i }))
    .filter(ev => ev.type === 'race' && !ev.cancelled && parseCalDate(ev.date) <= t)
    .sort((a, b) => parseCalDate(b.date) - parseCalDate(a.date)); // più recente prima

  if (candidates.length === 0) return null;
  const fresh = candidates.find(ev => !done.has(ev.index));
  const entry = fresh || candidates[0];
  return { index: entry.index, entry, alreadyHasResults: done.has(entry.index) };
}

/** Calendario stagione: [{round, dateISO, raceName, circuit}] */
export async function fetchSeasonSchedule(season = 2026, baseUrl = DEFAULT_BASE) {
  const res = await fetch(`${baseUrl}/${season}.json`);
  if (!res.ok) throw new Error(`Jolpica schedule HTTP ${res.status}`);
  const data = await res.json();
  const races = data?.MRData?.RaceTable?.Races || [];
  return races.map(r => ({
    round: parseInt(r.round, 10),
    dateISO: r.date,
    raceName: r.raceName,
    circuit: r.Circuit?.circuitName || '',
  }));
}

/** Round la cui data combacia con targetISO entro `tol` giorni (più vicino); null se nessuno. */
export function matchRoundByDate(targetISO, schedule, tol = 1) {
  const target = new Date(targetISO + 'T00:00:00Z').getTime();
  let best = null, bestDiff = Infinity;
  for (const r of schedule) {
    const diff = Math.abs(new Date(r.dateISO + 'T00:00:00Z').getTime() - target) / 86400000;
    if (diff <= tol && diff < bestDiff) { best = r.round; bestDiff = diff; }
  }
  return best;
}

/** Risultati di un round: [{code, grid, position, dnf, status}] */
export async function fetchRoundResults(season, round, baseUrl = DEFAULT_BASE) {
  const res = await fetch(`${baseUrl}/${season}/${round}/results.json`);
  if (!res.ok) throw new Error(`Jolpica results HTTP ${res.status}`);
  const data = await res.json();
  const race = data?.MRData?.RaceTable?.Races?.[0];
  const results = race?.Results || [];
  return results.map(r => {
    const status = r.status || '';
    const classified = status === 'Finished' || /^\+\d+\s*Lap/.test(status);
    const grid = parseInt(r.grid, 10);
    const pos = parseInt(r.positionText, 10);
    return {
      code: r.Driver?.code || '',
      grid: Number.isFinite(grid) ? grid : null,
      position: classified && Number.isFinite(pos) ? pos : null,
      dnf: !classified,
      status,
    };
  });
}

/**
 * Mappa i risultati API sulla lista piloti (match per `abbreviation` → pilotId UUID).
 * Costruisce l'array nel formato del grid di AdminPanel.
 * @returns {{results:Array, unmatchedCodes:string[], missingPilots:string[]}}
 */
export function mapApiToResults(apiResults, pilots) {
  const byAbbr = {};
  pilots.forEach(p => { if (p.abbreviation) byAbbr[p.abbreviation.toUpperCase()] = p; });

  const results = pilots.map(p => ({
    pilotId: p.id, position: 0, dnf: false,
    overtakes: 0, fastestLap: false, dotdRank: 0, gridPosition: null,
  }));
  const byPilotId = Object.fromEntries(results.map(r => [r.pilotId, r]));

  const used = new Set();
  const unmatchedCodes = [];
  for (const ar of apiResults) {
    const pilot = byAbbr[(ar.code || '').toUpperCase()];
    if (!pilot) { if (ar.code) unmatchedCodes.push(ar.code); continue; }
    used.add(pilot.abbreviation.toUpperCase());
    const row = byPilotId[pilot.id];
    row.dnf = ar.dnf;
    row.position = ar.dnf ? 0 : (ar.position || 0);
    // grid 0 = partenza dalla pit-lane → null (evita sorpassi netti fasulli)
    row.gridPosition = ar.grid && ar.grid > 0 ? ar.grid : null;
  }

  const missingPilots = pilots
    .filter(p => p.abbreviation && !used.has(p.abbreviation.toUpperCase()))
    .map(p => p.abbreviation);

  return { results, unmatchedCodes, missingPilots };
}

/**
 * Orchestratore: dato l'evento calendario {date, location} + i piloti,
 * recupera e mappa i risultati Jolpica.
 * @returns {{results, unmatchedCodes, missingPilots, round, raceName}}
 */
export async function importRaceFromJolpica(calEntry, pilots, season = 2026, baseUrl = DEFAULT_BASE) {
  const targetISO = calDateToISO(calEntry.date);
  const schedule = await fetchSeasonSchedule(season, baseUrl);
  const round = matchRoundByDate(targetISO, schedule);
  if (!round) {
    const e = new Error(`Nessuna gara trovata su Jolpica per la data ${calEntry.date}.`);
    e.code = 'NO_ROUND'; throw e;
  }
  const apiResults = await fetchRoundResults(season, round, baseUrl);
  if (!apiResults.length) {
    const e = new Error('Risultati non ancora disponibili su Jolpica per questa gara.');
    e.code = 'NO_RESULTS'; throw e;
  }
  const mapped = mapApiToResults(apiResults, pilots);
  const sched = schedule.find(s => s.round === round);
  return { ...mapped, round, raceName: sched?.raceName || calEntry.location };
}
