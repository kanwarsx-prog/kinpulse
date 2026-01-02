import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useNavigate } from 'react-router-dom';
import './ChessLobby.css';

const ChessLobby = () => {
    const { supabase, user, currentGroup } = useSupabase();
    const navigate = useNavigate();
    const [games, setGames] = useState([]);
    const [groupMembers, setGroupMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [selectedOpponent, setSelectedOpponent] = useState(null);

    useEffect(() => {
        if (currentGroup?.id) {
            loadGames();
            loadGroupMembers();
        }
    }, [currentGroup?.id]);

    const loadGames = async () => {
        if (!currentGroup?.id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('chess_games')
            .select(`
                *,
                white_player:white_player_id(name),
                black_player:black_player_id(name)
            `)
            .eq('group_id', currentGroup.id)
            .in('status', ['active'])
            .order('updated_at', { ascending: false });

        if (!error) setGames(data || []);
        setLoading(false);
    };

    const loadGroupMembers = async () => {
        if (!currentGroup?.id) return;
        console.log('Loading group members for group_id:', currentGroup.id);

        // Get user IDs from group_members
        const { data: memberData, error: memberError } = await supabase
            .from('group_members')
            .select('user_id')
            .eq('group_id', currentGroup.id)
            .neq('user_id', user.id);

        if (memberError || !memberData) {
            console.log('Group members error:', memberError);
            setGroupMembers([]);
            return;
        }

        const userIds = memberData.map(m => m.user_id);
        if (userIds.length === 0) {
            setGroupMembers([]);
            return;
        }

        // Get profiles for those users
        const { data, error } = await supabase
            .from('profiles')
            .select('id, name')
            .in('id', userIds);

        console.log('Group members result:', { data, error });
        setGroupMembers(data || []);
    };

    const handleCreateGame = async () => {
        if (!selectedOpponent) {
            alert('Please select an opponent');
            return;
        }

        if (!currentGroup?.id) {
            alert('Please select a group first');
            return;
        }

        setCreating(true);

        // Create game
        const { data: game, error: gameError } = await supabase
            .from('chess_games')
            .insert({
                group_id: currentGroup.id,
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
                    {groupMembers.map((member) => (
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
