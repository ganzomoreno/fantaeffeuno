-- ================================================
-- SPRINT GP OLANDA 2026 — Zandvoort, sabato 22 agosto
-- Precarica le posizioni Sprint nella riga risultati del weekend.
-- Stasera dopo il GP resta solo da inserire le posizioni gara e premere
-- "Pubblica risultati e calcola punteggi": il punteggio è unico di weekend
-- (sprint + gara), come da docs/REGOLAMENTO.md.
--
-- PREREQUISITO: esegui prima migrations_2026_08_23_olanda.sql
-- (sistema data/flag sprint di Olanda e crea le colonne sprint_*).
-- ================================================

WITH gara AS (
  SELECT id FROM races WHERE season = 2026 AND name = 'Olanda'
),
sprint(pilota, pos) AS (VALUES
  -- Zona punti: questi 8 sono gli unici che muovono il punteggio (scala top-8)
  ('George Russell',        1),   -- 8 pt · vittoria dalla pole sprint, in testa dal via
  ('Charles Leclerc',       2),   -- 7 pt · passa Norris al giro 18
  ('Lando Norris',          3),   -- 6 pt
  ('Andrea Kimi Antonelli', 4),   -- 5 pt
  ('Oscar Piastri',         5),   -- 4 pt
  ('Max Verstappen',        6),   -- 3 pt
  ('Lewis Hamilton',        7),   -- 2 pt
  ('Pierre Gasly',          8),   -- 1 pt · ultimo punto, resiste a Bortoleto
  -- Fuori zona punti: 0 pt, inseriti solo per completezza di archivio
  ('Gabriel Bortoleto',     9),
  ('Arvid Lindblad',       10),
  ('Liam Lawson',          11),
  ('Franco Colapinto',     12),
  ('Esteban Ocon',         14),
  ('Oliver Bearman',       15),
  ('Alexander Albon',      16),
  ('Lance Stroll',         17),
  ('Fernando Alonso',      18)
  -- P13 e le posizioni di coda (Hadjar, Hulkenberg, Sainz, Perez, Bottas)
  -- non sono state confermate da fonte affidabile. Sono tutte fuori dalla
  -- zona punti: NON incidono di un solo punto sul fanta. Completale a mano
  -- da /admin se vuoi l'archivio pieno.
)
INSERT INTO race_results (race_id, driver_id, sprint_position, sprint_dnf)
SELECT gara.id, d.id, sprint.pos, false
FROM sprint
JOIN drivers d ON d.name = sprint.pilota
CROSS JOIN gara
ON CONFLICT (race_id, driver_id) DO UPDATE
  SET sprint_position = EXCLUDED.sprint_position,
      sprint_dnf      = EXCLUDED.sprint_dnf;

-- Nico Hulkenberg: ritirato durante la Sprint, poi rientrato in pista.
-- Non classificato ai fini sprint -> 0 pt.
UPDATE race_results
SET sprint_dnf = true, sprint_position = NULL
WHERE race_id = (SELECT id FROM races WHERE season = 2026 AND name = 'Olanda')
  AND driver_id = (SELECT id FROM drivers WHERE name = 'Nico Hulkenberg');

-- Controllo: punti sprint attesi per pilota (scala top-8)
SELECT d.name,
       rr.sprint_position AS pos,
       CASE WHEN rr.sprint_dnf OR rr.sprint_position IS NULL OR rr.sprint_position > 8
            THEN 0 ELSE 9 - rr.sprint_position END AS punti_sprint
FROM race_results rr
JOIN drivers d ON d.id = rr.driver_id
WHERE rr.race_id = (SELECT id FROM races WHERE season = 2026 AND name = 'Olanda')
ORDER BY punti_sprint DESC, rr.sprint_position NULLS LAST;
