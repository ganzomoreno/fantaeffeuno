-- ============================================================
--  Migration 001 — Aggiungi colonna abbreviation a pilots
--  Esegui nell'SQL Editor di Supabase
-- ============================================================

-- 1. Aggiungi la colonna (nullable inizialmente per non rompere righe esistenti)
ALTER TABLE pilots
  ADD COLUMN IF NOT EXISTS abbreviation CHAR(3);

-- 2. Popola le abbreviazioni per tutti i piloti della griglia 2026
UPDATE pilots SET abbreviation = 'NOR' WHERE name = 'Lando Norris';
UPDATE pilots SET abbreviation = 'PIA' WHERE name = 'Oscar Piastri';
UPDATE pilots SET abbreviation = 'RUS' WHERE name = 'George Russell';
UPDATE pilots SET abbreviation = 'ANT' WHERE name = 'Andrea Kimi Antonelli';
UPDATE pilots SET abbreviation = 'VER' WHERE name = 'Max Verstappen';
UPDATE pilots SET abbreviation = 'HAD' WHERE name = 'Isack Hadjar';
UPDATE pilots SET abbreviation = 'LEC' WHERE name = 'Charles Leclerc';
UPDATE pilots SET abbreviation = 'HAM' WHERE name = 'Lewis Hamilton';
UPDATE pilots SET abbreviation = 'ALB' WHERE name = 'Alexander Albon';
UPDATE pilots SET abbreviation = 'SAI' WHERE name = 'Carlos Sainz';
UPDATE pilots SET abbreviation = 'LIN' WHERE name = 'Arvid Lindblad';
UPDATE pilots SET abbreviation = 'LAW' WHERE name = 'Liam Lawson';
UPDATE pilots SET abbreviation = 'ALO' WHERE name = 'Fernando Alonso';
UPDATE pilots SET abbreviation = 'STR' WHERE name = 'Lance Stroll';
UPDATE pilots SET abbreviation = 'OCO' WHERE name = 'Esteban Ocon';
UPDATE pilots SET abbreviation = 'BEA' WHERE name = 'Oliver Bearman';
UPDATE pilots SET abbreviation = 'HUL' WHERE name = 'Nico Hülkenberg';
UPDATE pilots SET abbreviation = 'BOR' WHERE name = 'Gabriel Bortoleto';
UPDATE pilots SET abbreviation = 'GAS' WHERE name = 'Pierre Gasly';
UPDATE pilots SET abbreviation = 'COL' WHERE name = 'Franco Colapinto';
UPDATE pilots SET abbreviation = 'PER' WHERE name = 'Sergio Pérez';
UPDATE pilots SET abbreviation = 'BOT' WHERE name = 'Valtteri Bottas';

-- 3. Imposta NOT NULL ora che tutte le righe hanno un valore
ALTER TABLE pilots
  ALTER COLUMN abbreviation SET NOT NULL;

-- Verifica
SELECT id, name, abbreviation FROM pilots ORDER BY name;
