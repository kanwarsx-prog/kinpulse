-- Add winning hand information columns to poker_hands table
-- Stores the name and description of the winning hand for display to players

ALTER TABLE poker_hands 
ADD COLUMN IF NOT EXISTS winning_hand_name TEXT,
ADD COLUMN IF NOT EXISTS winning_hand_descr TEXT;

-- Add comments explaining the columns
COMMENT ON COLUMN poker_hands.winning_hand_name IS 
'Name of the winning poker hand (e.g., "Full House", "Flush", "Royal Flush"). Populated by pokersolver library at showdown.';

COMMENT ON COLUMN poker_hands.winning_hand_descr IS 
'Detailed description of the winning hand (e.g., "Full House, Aces over Kings", "Flush, Ace High"). Populated by pokersolver library at showdown.';
