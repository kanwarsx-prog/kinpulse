-- Add missing last_aggressor_seat_no column to poker_hands
-- This column is needed to track the last player who bet/raised in a betting round

ALTER TABLE poker_hands 
ADD COLUMN IF NOT EXISTS last_aggressor_seat_no INTEGER;

-- Add comment for documentation
COMMENT ON COLUMN poker_hands.last_aggressor_seat_no IS 'Seat number of the last player who bet or raised in the current betting round';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'poker_hands' 
AND column_name = 'last_aggressor_seat_no';
