-- Il GP di Spagna 2026 del 13/09 si corre a MADRID (circuito Madring, IFEMA),
-- non a Valencia: il calendario iniziale riportava un nome errato.
-- Barcellona (14/06) resta una gara a se': dal 2026 si chiama Barcelona-Catalunya GP.
UPDATE calendar_events
SET location = 'Spagna (Madrid)'
WHERE location = 'Spagna (Valencia)';
