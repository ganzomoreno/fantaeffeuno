import type { RaceResult, Lineup } from '@/types'

// Points for finishing position 1-20
function positionPoints(position: number): number {
  if (position < 1 || position > 20) return 0
  return 21 - position // 1st = 20pts, 2nd = 19pts, ..., 20th = 1pt
}

// Points for Driver of the Day ranking
function dotdPoints(dotdPosition: number | null): number {
  if (!dotdPosition) return 0
  if (dotdPosition === 1) return 3
  if (dotdPosition === 2) return 2
  if (dotdPosition === 3) return 1
  return 0
}

export function calculateDriverPoints(result: RaceResult): number {
  if (result.dnf || result.position === null) return 0

  let pts = 0
  pts += positionPoints(result.position)
  pts += dotdPoints(result.dotd_position)
  if (result.fastest_lap) pts += 1
  if (result.pole_position) pts += 1
  pts += (result.overtakes || 0) * 0.5

  return pts
}

export type ScoreBreakdown = {
  driver_id: string
  position_pts: number
  dotd_pts: number
  fastest_lap_pts: number
  pole_pts: number
  overtake_pts: number
  total: number
  dnf: boolean
}

export function calculateTeamScore(
  lineup: Lineup,
  results: RaceResult[],
  isSprint: boolean
): {
  driver1_points: number
  driver2_points: number
  driver3_points: number
  total_points: number
  breakdown: ScoreBreakdown[]
} {
  const startDriverIds = [lineup.driver1_id, lineup.driver2_id, lineup.driver3_id]
  const benchId = lineup.bench_driver_id

  const scoreDriver = (driverId: string): ScoreBreakdown => {
    const result = results.find(r => r.driver_id === driverId)
    if (!result) {
      return {
        driver_id: driverId,
        position_pts: 0,
        dotd_pts: 0,
        fastest_lap_pts: 0,
        pole_pts: 0,
        overtake_pts: 0,
        total: 0,
        dnf: false,
      }
    }

    const dnf = result.dnf || result.position === null
    if (dnf) {
      // If bench driver substitutes (auto-sub on DNF)
      const benchResult = results.find(r => r.driver_id === benchId)
      const benchTotal = benchResult ? calculateDriverPoints(benchResult) : 0

      return {
        driver_id: driverId,
        position_pts: 0,
        dotd_pts: 0,
        fastest_lap_pts: 0,
        pole_pts: 0,
        overtake_pts: 0,
        total: benchTotal,
        dnf: true,
      }
    }

    const position_pts = positionPoints(result.position!)
    const dotd_pts = dotdPoints(result.dotd_position)
    const fastest_lap_pts = result.fastest_lap ? 1 : 0
    const pole_pts = result.pole_position ? 1 : 0
    const overtake_pts = (result.overtakes || 0) * 0.5

    return {
      driver_id: driverId,
      position_pts,
      dotd_pts,
      fastest_lap_pts,
      pole_pts,
      overtake_pts,
      total: position_pts + dotd_pts + fastest_lap_pts + pole_pts + overtake_pts,
      dnf: false,
    }
  }

  const d1 = scoreDriver(startDriverIds[0])
  const d2 = scoreDriver(startDriverIds[1])
  const d3 = scoreDriver(startDriverIds[2])

  return {
    driver1_points: d1.total,
    driver2_points: d2.total,
    driver3_points: d3.total,
    total_points: d1.total + d2.total + d3.total,
    breakdown: [d1, d2, d3],
  }
}

export { positionPoints, dotdPoints }
