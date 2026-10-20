-- Aste ogni 2 gare per il finale di stagione:
--   Asta 10 (20/10) -> USA, Messico
--   Asta 11 (04/11) -> Brasile, Las Vegas
--   Asta 12 (25/11) -> Qatar, Abu Dhabi
-- Cambiano solo le date (sort_order invariati: l'app calcola la prossima asta per data).
UPDATE calendar_events SET event_date = '2026-10-20' WHERE event_type = 'auction' AND location = 'Asta 10';
UPDATE calendar_events SET event_date = '2026-11-04' WHERE event_type = 'auction' AND location = 'Asta 11';
UPDATE calendar_events SET event_date = '2026-11-25' WHERE event_type = 'auction' AND location = 'Asta 12';
