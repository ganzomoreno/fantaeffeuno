-- 20260305030000_add_pilots_sort_order.sql

-- Aggiungo la colonna sort_order alla tabella pilots
ALTER TABLE public.pilots ADD COLUMN sort_order INTEGER;

-- Imposto un sort_order basato sulla classifica costruttori o un ordine logico
DO $$
BEGIN
  -- McLaren
  UPDATE pilots SET sort_order = 1 WHERE name = 'Lando Norris';
  UPDATE pilots SET sort_order = 2 WHERE name = 'Oscar Piastri';
  
  -- Ferrari
  UPDATE pilots SET sort_order = 3 WHERE name = 'Charles Leclerc';
  UPDATE pilots SET sort_order = 4 WHERE name = 'Lewis Hamilton';
  
  -- Red Bull
  UPDATE pilots SET sort_order = 5 WHERE name = 'Max Verstappen';
  UPDATE pilots SET sort_order = 6 WHERE name = 'Isack Hadjar';
  
  -- Mercedes
  UPDATE pilots SET sort_order = 7 WHERE name = 'George Russell';
  UPDATE pilots SET sort_order = 8 WHERE name = 'Andrea Kimi Antonelli';
  
  -- Aston Martin
  UPDATE pilots SET sort_order = 9 WHERE name = 'Fernando Alonso';
  UPDATE pilots SET sort_order = 10 WHERE name = 'Lance Stroll';
  
  -- Alpine
  UPDATE pilots SET sort_order = 11 WHERE name = 'Pierre Gasly';
  UPDATE pilots SET sort_order = 12 WHERE name = 'Franco Colapinto';
  
  -- Williams
  UPDATE pilots SET sort_order = 13 WHERE name = 'Alexander Albon';
  UPDATE pilots SET sort_order = 14 WHERE name = 'Carlos Sainz';
  
  -- Racing Bulls
  UPDATE pilots SET sort_order = 15 WHERE name = 'Arvid Lindblad';
  UPDATE pilots SET sort_order = 16 WHERE name = 'Liam Lawson';
  
  -- Haas
  UPDATE pilots SET sort_order = 17 WHERE name = 'Esteban Ocon';
  UPDATE pilots SET sort_order = 18 WHERE name = 'Oliver Bearman';
  
  -- Audi (Sauber)
  UPDATE pilots SET sort_order = 19 WHERE name = 'Nico Hülkenberg';
  UPDATE pilots SET sort_order = 20 WHERE name = 'Gabriel Bortoleto';
  
  -- Cadillac
  UPDATE pilots SET sort_order = 21 WHERE name = 'Sergio Pérez';
  UPDATE pilots SET sort_order = 22 WHERE name = 'Valtteri Bottas';

  -- Imposta un default per eventuali nuovi record
  UPDATE pilots SET sort_order = 99 WHERE sort_order IS NULL;
END $$;
