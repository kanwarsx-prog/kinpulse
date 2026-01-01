-- Add last_aggressor_seat_no column to poker_hands table
-- This tracks which player last bet or raised in the current betting round

ALTER TABLE poker_hands 
ADD COLUMN IF NOT EXISTS last_aggressor_seat_no INTEGER;

-- Add comment explaining the column
COMMENT ON COLUMN poker_hands.last_aggressor_seat_no IS 
'Seat number of the last player to bet or raise in current betting round. NULL if no bets/raises yet (all checks). Used to determine when betting round is complete - round ends when action returns to this player.';
