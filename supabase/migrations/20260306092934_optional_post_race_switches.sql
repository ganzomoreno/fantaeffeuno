-- Add optional manual switch tracking to lineups
ALTER TABLE lineups
ADD COLUMN subbed_in_manually BOOLEAN DEFAULT false,
ADD COLUMN subbed_out_for UUID REFERENCES pilots(id) DEFAULT null;
