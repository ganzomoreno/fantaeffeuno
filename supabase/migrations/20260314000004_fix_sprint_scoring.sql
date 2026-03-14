-- ================================================================
-- PATCH: Forza is_sprint=TRUE sulla Race Sprint Cina + ricalcola punti
-- Da eseguire DOPO 20260314000002_add_sprints.sql
-- ================================================================

-- 1. Imposta is_sprint=TRUE su TUTTE le races collegate a eventi sprint
UPDATE races r
SET is_sprint = TRUE
FROM calendar_events ce
WHERE r.calendar_event_id = ce.id
  AND ce.is_sprint = TRUE
  AND r.is_sprint = FALSE;

-- 2. Ricalcola i punti per tutti i race_results delle race Sprint
--    (il trigger trg_set_race_result_points ora riceve is_sprint=TRUE → scoring 8→1)
UPDATE race_results rr
SET id = rr.id
FROM races r
WHERE rr.race_id = r.id
  AND r.is_sprint = TRUE;

-- 3. Verifica risultato
SELECT
  ce.location,
  ce.event_date,
  ce.is_sprint AS cal_sprint,
  r.is_sprint AS race_sprint,
  COUNT(rr.id) AS n_risultati,
  SUM(rr.points_scored) AS tot_punti_db
FROM calendar_events ce
JOIN races r ON r.calendar_event_id = ce.id
LEFT JOIN race_results rr ON rr.race_id = r.id
WHERE ce.is_sprint = TRUE OR r.is_sprint = TRUE
GROUP BY ce.location, ce.event_date, ce.is_sprint, r.is_sprint
ORDER BY ce.event_date;
