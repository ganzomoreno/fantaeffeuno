import type { RaceResult, Lineup } from '@/types'

// Fonte di verità del regolamento: docs/REGOLAMENTO.md
// Se cambia una regola, aggiorna prima quel file e poi questo modulo.

// --- Gara (GP domenicale) ---

// Posizione di arrivo: 1° = 20 pt ... 20° = 1 pt
function positionPoints(position: number): number {
  if (position < 1 || position > 20) return 0
  return 21 - position
}

// Driver of the Day: 1°/2°/3° = 3/2/1 pt
function dotdPoints(dotdPosition: number | null): number {
  if (!dotdPosition) return 0
  if (dotdPosition === 1) return 3
  if (dotdPosition === 2) return 2
  if (dotdPosition === 3) return 1
  return 0
}

// --- Sprint ---

// Scala ridotta top-8: 1° = 8 pt ... 8° = 1 pt, dal 9° in poi 0.
// Nella Sprint non si assegnano bonus (niente DotD, giro veloce, pole, sorpassi).
const SPRINT_TOP_N = 8

function sprintPoints(position: number | null, dnf: boolean): number {
  if (dnf || position === null) return 0
  if (position < 1 || position > SPRINT_TOP_N) return 0
  return SPRINT_TOP_N + 1 - position
}

// Un pilota è "non classificato" nella gara: 0 punti gara e apre la
// sostituzione con il panchinaro.
function isUnclassified(result: RaceResult): boolean {
  return result.dnf || result.position === null
}

export function calculateDriverPoints(result: RaceResult): number {
  if (isUnclassified(result)) return 0

  let pts = 0
  pts += positionPoints(result.position!)
  pts += dotdPoints(result.dotd_position)
  if (result.fastest_lap) pts += 1
  if (result.pole_position) pts += 1
  pts += (result.overtakes || 0) * 0.5

  return pts
}

export type ScoreBreakdown = {
  driver_id: string
  sprint_pts: number
  position_pts: number
  dotd_pts: number
  fastest_lap_pts: number
  pole_pts: number
  overtake_pts: number
  total: number
  dnf: boolean
  /** valorizzato quando il panchinaro è subentrato a questo titolare */
  substituted_by?: string
}

const EMPTY_BREAKDOWN = {
  sprint_pts: 0,
  position_pts: 0,
  dotd_pts: 0,
  fastest_lap_pts: 0,
  pole_pts: 0,
  overtake_pts: 0,
}

/**
 * Punti di weekend di un singolo pilota.
 * Su weekend sprint il totale è punti_sprint (top-8) + punti_gara (scala piena
 * + bonus): un unico punteggio, non due.
 */
function scoreDriverWeekend(
  driverId: string,
  results: RaceResult[],
  isSprint: boolean
): ScoreBreakdown {
  const result = results.find(r => r.driver_id === driverId)
  if (!result) {
    return { driver_id: driverId, ...EMPTY_BREAKDOWN, total: 0, dnf: true }
  }

  const sprint_pts = isSprint
    ? sprintPoints(result.sprint_position ?? null, result.sprint_dnf ?? false)
    : 0

  // Non classificato in gara: restano solo gli eventuali punti sprint già
  // maturati sabato, che non si perdono.
  if (isUnclassified(result)) {
    return {
      driver_id: driverId,
      ...EMPTY_BREAKDOWN,
      sprint_pts,
      total: sprint_pts,
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
    sprint_pts,
    position_pts,
    dotd_pts,
    fastest_lap_pts,
    pole_pts,
    overtake_pts,
    total: sprint_pts + position_pts + dotd_pts + fastest_lap_pts + pole_pts + overtake_pts,
    dnf: false,
  }
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
  const starters = [lineup.driver1_id, lineup.driver2_id, lineup.driver3_id]
  const breakdown = starters.map(id => scoreDriverWeekend(id, results, isSprint))

  // Auto-sostituzione: il panchinaro subentra UNA SOLA VOLTA per weekend,
  // al primo titolare non classificato in ordine di schieramento.
  // Con più DNF gli altri restano ai loro punti (eventuale sprint + 0 gara).
  const firstDnf = breakdown.findIndex(b => b.dnf)
  if (firstDnf !== -1 && lineup.bench_driver_id) {
    const bench = scoreDriverWeekend(lineup.bench_driver_id, results, isSprint)
    // Subentra solo se migliora il punteggio del titolare sostituito.
    if (bench.total > breakdown[firstDnf].total) {
      breakdown[firstDnf] = {
        ...bench,
        driver_id: breakdown[firstDnf].driver_id,
        dnf: true,
        substituted_by: lineup.bench_driver_id,
      }
    }
  }

  const [d1, d2, d3] = breakdown

  return {
    driver1_points: d1.total,
    driver2_points: d2.total,
    driver3_points: d3.total,
    total_points: d1.total + d2.total + d3.total,
    breakdown,
  }
}

export { positionPoints, dotdPoints, sprintPoints }
