-- Il GP del Bahrain, cancellato ad aprile, e' stato recuperato il 04/10/2026
-- sul circuito di Sepang (Malesia) come "Gulf Air Bahrain Grand Prix in Malaysia".
-- Resta allo stesso sort_order (indice calendario invariato), cambiano data e nome.
UPDATE calendar_events
SET event_date = '2026-10-04', location = 'Bahrain (Sepang)'
WHERE location = 'Bahrain' AND event_date = '2026-04-12';
