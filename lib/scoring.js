import { POINTS_TABLE, OVERTAKE_BONUS, MAX_OVERTAKE_POINTS, FASTEST_LAP_BONUS, DOTD_POINTS } from './data';

/**
 * Calculate points for a single pilot result in a race.
 * @param {Object} result - { pilotId, position, dnf, overtakes, fastestLap, dotdRank }
 * @returns {Object} { total, base, overtakes, fastestLap, dotd }
 */
export function calculatePilotPoints(result) {
  const breakdown = { total: 0, base: 0, overtakes: 0, fastestLap: 0, dotd: 0 };

  if (result.dnf) return breakdown;

  breakdown.base = POINTS_TABLE[result.position] || 0;
  breakdown.total += breakdown.base;

  // Overtake bonus: +0.5 per overtake, max 3 points
  if (result.overtakes > 0) {
    breakdown.overtakes = Math.min(result.overtakes * OVERTAKE_BONUS, MAX_OVERTAKE_POINTS);
    breakdown.total += breakdown.overtakes;
  }

  // Driver of the Day (rank 1-3)
  if (result.dotdRank && DOTD_POINTS[result.dotdRank]) {
    breakdown.dotd = DOTD_POINTS[result.dotdRank];
    breakdown.total += breakdown.dotd;
  }

  return breakdown;
}

/**
 * Calculate total scores for all teams across all races.
 * Only counts pilots that were in the team's lineup for that race.
 * 
 * @param {Array} teams
 * @param {Array} pilots
 * @param {Array} races - [{ calendarIndex, results: [{ pilotId, position, ... }] }]
 * @param {Object} lineups - { "race_0": { "t1": ["p1","p2","p3"], ... } }
 * @param {Object} reserves - { "race_0": { "t1": "p4", ... } }
 * @returns {Object} { teamId: totalScore }
 */
export function calculateTeamScores(teams, pilots, races, lineups, reserves = {}) {
  const scores = {};
  teams.forEach(t => {
    scores[t.id] = 0;
    races.forEach(race => {
      if (!race.results) return;
      scores[t.id] += calculateRaceTeamScore(race, lineups, reserves, pilots, t.id);
    });
  });
  return scores;
}

/**
 * Calculate points for a single team in a single race.
 * Includes DNF substitution logic.
 */
export function calculateRaceTeamScore(race, lineups, reserves, pilots, teamId) {
  const raceKey = `race_${race.calendarIndex}`;
  const teamLineup = (lineups[raceKey] || {})[teamId] || [];
  const teamReserve = (reserves[raceKey] || {})[teamId];

  // Penalty for missing lineup
  if (teamLineup.length < 3) return -5;

  let total = 0;
  let dnfCount = 0;

  // Process starters
  teamLineup.forEach(pilotId => {
    const result = race.results.find(r => r.pilotId === pilotId);
    if (!result) return;

    if (result.dnf) {
      dnfCount++;
    } else {
      total += calculatePilotPoints(result).total;
    }
  });

  // If there's at least one DNF and we have a reserve, sub them in (once)
  if (dnfCount > 0 && teamReserve) {
    const resResult = race.results.find(r => r.pilotId === teamReserve);
    if (resResult && !resResult.dnf) {
      total += calculatePilotPoints(resResult).total;
    }
  }

  return total;
}

/**
 * Get detailed points breakdown for a race.
 * @returns {Array} [{ pilotId, pilotName, team, position, points, breakdown }]
 */
export function getRaceBreakdown(race, pilots) {
  if (!race?.results) return [];

  return race.results
    .filter(r => r.position > 0)
    .sort((a, b) => a.position - b.position)
    .map(result => {
      const pilot = pilots.find(p => p.id === result.pilotId);
      const breakdownObj = calculatePilotPoints(result);

      return {
        pilotId: result.pilotId,
        pilotName: pilot?.name || '?',
        f1Team: pilot?.team || '?',
        gridPosition: result.gridPosition || null,
        position: result.position,
        points: breakdownObj.total,
        dnf: result.dnf,
        overtakes: result.overtakes || 0,
        dotdRank: result.dotdRank || 0,
        breakdown: breakdownObj,
      };
    });
}
