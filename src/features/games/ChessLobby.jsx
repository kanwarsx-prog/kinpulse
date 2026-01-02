import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useNavigate } from 'react-router-dom';
import './ChessLobby.css';

const ChessLobby = () => {
    const { supabase, user } = useSupabase();
    const navigate = useNavigate();
    const [games, setGames] = useState([]);
    const [familyMembers, setFamilyMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [selectedOpponent, setSelectedOpponent] = useState(null);

    useEffect(() => {
        if (user?.family_id) {
            loadGames();
            loadFamilyMembers();
        }
    }, [user?.family_id]);

    const loadGames = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('chess_games')
            .select(`
                *,
                white_player:white_player_id(name),
                black_player:black_player_id(name)
            `)
            .eq('family_id', user.family_id)
            .in('status', ['active'])
            .order('updated_at', { ascending: false });

        if (!error) setGames(data || []);
        setLoading(false);
    };

    const loadFamilyMembers = async () => {
        console.log('Loading family members for family_id:', user.family_id);
        const { data, error } = await supabase
            .from('profiles')
            .select('id, name')
            .eq('family_id', user.family_id)
            .neq('id', user.id);

        console.log('Family members result:', { data, error });
        setFamilyMembers(data || []);
    };

    const handleCreateGame = async () => {
        if (!selectedOpponent) {
            alert('Please select an opponent');
            return;
        }

        setCreating(true);

        // Create game
        const { data: game, error: gameError } = await supabase
            .from('chess_games')
            .insert({
                family_id: user.family_id,
                white_player_id: user.id,
                black_player_id: selectedOpponent,
                current_turn: 'white'
            })
            .select()
            .single();

        if (gameError) {
            alert('Failed to create game');
            setCreating(false);
            return;
        }

        // Initialize board state
        await supabase
            .from('chess_board_states')
            .insert({
                game_id: game.id,
                fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
                move_count: 0
            });

        setCreating(false);
        setSelectedOpponent(null);
        navigate(`/games/chess/${game.id}`);
    };

    const handleJoinGame = (gameId) => {
        navigate(`/games/chess/${gameId}`);
    };

    const getPlayerName = (game) => {
        const isWhite = game.white_player_id === user.id;
        const isBlack = game.black_player_id === user.id;

        if (isWhite) {
            return `vs ${game.black_player?.name || 'Opponent'}`;
        } else if (isBlack) {
            return `vs ${game.white_player?.name || 'Opponent'}`;
        } else {
            return `${game.white_player?.name} vs ${game.black_player?.name}`;
        }
    };

    const isMyTurn = (game) => {
        return (
            (game.current_turn === 'white' && game.white_player_id === user.id) ||
            (game.current_turn === 'black' && game.black_player_id === user.id)
        );
    };

    return (
        <div className="chess-lobby">
            <header className="chess-header">
                <div>
                    <p className="eyebrow">Family game</p>
                    <h1>♟️ Chess</h1>
                    <p className="subtle">Play chess with your family</p>
                </div>
            </header>

            <section className="chess-create">
                <h3>New Game</h3>
                <select
                    value={selectedOpponent || ''}
                    onChange={(e) => setSelectedOpponent(e.target.value)}
                    disabled={creating}
                >
                    <option value="">Select opponent...</option>
                    {familyMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                            {member.name || member.email || 'Unknown'}
                        </option>
                    ))}
                </select>
                <button onClick={handleCreateGame} disabled={creating || !selectedOpponent}>
                    {creating ? 'Creating...' : 'Create Game'}
                </button>
            </section>

            <section className="chess-games">
                <h3>Active Games</h3>
                {loading && <div className="muted">Loading games...</div>}
                {!loading && games.length === 0 && (
                    <div className="muted">No active games. Create one!</div>
                )}
                {games.map((game) => (
                    <div
                        key={game.id}
                        className={`chess-game-card ${isMyTurn(game) ? 'my-turn' : ''}`}
                        onClick={() => handleJoinGame(game.id)}
                    >
                        <div className="game-info">
                            <div className="game-title">{getPlayerName(game)}</div>
                            <div className="game-meta">
                                {isMyTurn(game) ? (
                                    <span className="turn-badge">Your turn</span>
                                ) : (
                                    <span className="muted">Waiting...</span>
                                )}
                            </div>
                        </div>
                        <div className="game-icon">♟️</div>
                    </div>
                ))}
            </section>
        </div>
    );
};

export default ChessLobby;
