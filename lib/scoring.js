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
 * @returns {Object} { teamId: totalScore }
 */
export function calculateTeamScores(teams, pilots, races, lineups) {
  const scores = {};
  teams.forEach(t => { scores[t.id] = 0; });

  // Build pilot → owner map
  const pilotOwner = {};
  pilots.forEach(p => { if (p.owner) pilotOwner[p.id] = p.owner; });

  races.forEach(race => {
    if (!race.results) return;

    const raceKey = `race_${race.calendarIndex}`;
    const raceLineups = lineups[raceKey] || {};

    race.results.forEach(result => {
      const ownerTeamId = pilotOwner[result.pilotId];
      if (!ownerTeamId) return;

      // Check if this pilot was actually in the lineup
      const teamLineup = raceLineups[ownerTeamId] || [];
      if (!teamLineup.includes(result.pilotId)) return;

      const ptsBreakdown = calculatePilotPoints(result);
      scores[ownerTeamId] = (scores[ownerTeamId] || 0) + ptsBreakdown.total;
    });
  });

  return scores;
}

/**
 * Calculate points for a single team in a single race.
 * @param {Object} race - { calendarIndex, results }
 * @param {Object} lineups - { "race_0": { "t1": ["p1","p2","p3"] } }
 * @param {Array} pilots
 * @param {string} teamId
 * @returns {number}
 */
export function calculateRaceTeamScore(race, lineups, pilots, teamId) {
  const raceKey = `race_${race.calendarIndex}`;
  const teamLineup = (lineups[raceKey] || {})[teamId] || [];
  let total = 0;
  (race.results || []).forEach(result => {
    if (teamLineup.includes(result.pilotId)) {
      total += calculatePilotPoints(result).total;
    }
  });
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
