-- Chess Game Schema for KinPulse
-- Player vs Player async chess for families

-- Chess games table
CREATE TABLE IF NOT EXISTS chess_games (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    family_id UUID NOT NULL,
    white_player_id UUID NOT NULL,
    black_player_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'checkmate', 'stalemate', 'draw', 'resigned')),
    current_turn TEXT NOT NULL DEFAULT 'white' CHECK (current_turn IN ('white', 'black')),
    winner_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chess moves table (move history)
CREATE TABLE IF NOT EXISTS chess_moves (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID REFERENCES chess_games(id) ON DELETE CASCADE NOT NULL,
    move_number INTEGER NOT NULL,
    player_id UUID NOT NULL,
    from_square TEXT NOT NULL,
    to_square TEXT NOT NULL,
    piece TEXT NOT NULL,
    captured_piece TEXT,
    is_check BOOLEAN DEFAULT FALSE,
    is_checkmate BOOLEAN DEFAULT FALSE,
    notation TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chess board state (current position)
CREATE TABLE IF NOT EXISTS chess_board_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id UUID REFERENCES chess_games(id) ON DELETE CASCADE NOT NULL,
    fen TEXT NOT NULL,
    move_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chess_games_family ON chess_games(family_id);
CREATE INDEX IF NOT EXISTS idx_chess_games_players ON chess_games(white_player_id, black_player_id);
CREATE INDEX IF NOT EXISTS idx_chess_moves_game ON chess_moves(game_id, move_number);
CREATE INDEX IF NOT EXISTS idx_chess_board_game ON chess_board_states(game_id);

-- RLS Policies
ALTER TABLE chess_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE chess_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE chess_board_states ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "chess_games_family_view" ON chess_games;
DROP POLICY IF EXISTS "chess_games_family_create" ON chess_games;
DROP POLICY IF EXISTS "chess_games_players_update" ON chess_games;
DROP POLICY IF EXISTS "chess_moves_view" ON chess_moves;
DROP POLICY IF EXISTS "chess_moves_create" ON chess_moves;
DROP POLICY IF EXISTS "chess_board_view" ON chess_board_states;
DROP POLICY IF EXISTS "chess_board_update" ON chess_board_states;

-- Games: Family members can view and create
CREATE POLICY "chess_games_family_view"
ON chess_games FOR SELECT
TO authenticated
USING (
    family_id IN (
        SELECT family_id FROM profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "chess_games_family_create"
ON chess_games FOR INSERT
TO authenticated
WITH CHECK (
    family_id IN (
        SELECT family_id FROM profiles WHERE id = auth.uid()
    )
);

CREATE POLICY "chess_games_players_update"
ON chess_games FOR UPDATE
TO authenticated
USING (
    white_player_id = auth.uid() OR black_player_id = auth.uid()
);

-- Moves: Players can view and create
CREATE POLICY "chess_moves_view"
ON chess_moves FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM chess_games 
        WHERE id = game_id 
        AND family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid())
    )
);

CREATE POLICY "chess_moves_create"
ON chess_moves FOR INSERT
TO authenticated
WITH CHECK (player_id = auth.uid());

-- Board states: Family can view, players can update
CREATE POLICY "chess_board_view"
ON chess_board_states FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM chess_games 
        WHERE id = game_id 
        AND family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid())
    )
);

CREATE POLICY "chess_board_update"
ON chess_board_states FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM chess_games 
        WHERE id = game_id 
        AND (white_player_id = auth.uid() OR black_player_id = auth.uid())
    )
);
