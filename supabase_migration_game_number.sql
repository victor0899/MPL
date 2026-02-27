-- Migration: Add game_number to games table
-- This adds sequential game numbers within each group

-- Step 1: Add the game_number column
ALTER TABLE games
ADD COLUMN IF NOT EXISTS game_number INTEGER;

-- Step 2: Create function to get next game number for a group
CREATE OR REPLACE FUNCTION get_next_game_number(p_group_id UUID)
RETURNS INTEGER AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(game_number), 0) + 1
  INTO next_number
  FROM games
  WHERE group_id = p_group_id;

  RETURN next_number;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger function to auto-assign game_number on insert
CREATE OR REPLACE FUNCTION assign_game_number()
RETURNS TRIGGER AS $$
BEGIN
  -- Only assign if game_number is not already set
  IF NEW.game_number IS NULL THEN
    NEW.game_number := get_next_game_number(NEW.group_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger (drop first if exists to avoid errors)
DROP TRIGGER IF EXISTS trigger_assign_game_number ON games;

CREATE TRIGGER trigger_assign_game_number
  BEFORE INSERT ON games
  FOR EACH ROW
  EXECUTE FUNCTION assign_game_number();

-- Step 5: Backfill existing games with sequential numbers
-- This assigns numbers to existing games based on their creation date
WITH numbered_games AS (
  SELECT
    id,
    group_id,
    ROW_NUMBER() OVER (PARTITION BY group_id ORDER BY created_at ASC) AS game_num
  FROM games
  WHERE game_number IS NULL
)
UPDATE games
SET game_number = numbered_games.game_num
FROM numbered_games
WHERE games.id = numbered_games.id;

-- Step 6: Make game_number NOT NULL after backfill
ALTER TABLE games
ALTER COLUMN game_number SET NOT NULL;

-- Step 7: Add unique constraint to ensure game_number is unique within each group
ALTER TABLE games
DROP CONSTRAINT IF EXISTS unique_game_number_per_group;

ALTER TABLE games
ADD CONSTRAINT unique_game_number_per_group
UNIQUE (group_id, game_number);

-- Verification query (optional - you can run this to check)
-- SELECT
--   g.name as group_name,
--   ga.game_number,
--   ga.id,
--   ga.created_at
-- FROM games ga
-- JOIN groups g ON ga.group_id = g.id
-- ORDER BY g.name, ga.game_number;
