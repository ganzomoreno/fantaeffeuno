import { POINTS_TABLE, OVERTAKE_BONUS, MAX_OVERTAKE_POINTS, FASTEST_LAP_BONUS, DOTD_POINTS } from './data';

/**
 * Calculate points for a single pilot result in a race.
 * @param {Object} result - { pilotId, position, dnf, overtakes, fastestLap, dotdRank }
 * @returns {number} Total points for this result
 */
export function calculatePilotPoints(result) {
  if (result.dnf) return 0;

  let pts = POINTS_TABLE[result.position] || 0;

  // Overtake bonus: +0.5 per overtake, max 3 points
  if (result.overtakes > 0) {
    pts += Math.min(result.overtakes * OVERTAKE_BONUS, MAX_OVERTAKE_POINTS);
  }

  // Fastest lap
  if (result.fastestLap) {
    pts += FASTEST_LAP_BONUS;
  }

  // Driver of the Day (rank 1-3)
  if (result.dotdRank && DOTD_POINTS[result.dotdRank]) {
    pts += DOTD_POINTS[result.dotdRank];
  }

  return pts;
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

      const pts = calculatePilotPoints(result);
      scores[ownerTeamId] = (scores[ownerTeamId] || 0) + pts;
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
      total += calculatePilotPoints(result);
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
      const pts = calculatePilotPoints(result);

      return {
        pilotId: result.pilotId,
        pilotName: pilot?.name || '?',
        f1Team: pilot?.team || '?',
        position: result.position,
        points: pts,
        dnf: result.dnf,
        overtakes: result.overtakes || 0,
        fastestLap: result.fastestLap || false,
        dotdRank: result.dotdRank || 0,
      };
    });
}
