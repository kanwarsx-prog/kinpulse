import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Chess } from 'chess.js';
import { useSupabase } from '../../contexts/SupabaseContext';
import './ChessBoard.css';

const ChessBoard = () => {
    const { gameId } = useParams();
    const navigate = useNavigate();
    const { supabase, user } = useSupabase();

    const [chess] = useState(new Chess());
    const [position, setPosition] = useState(chess.fen());
    const [game, setGame] = useState(null);
    const [moves, setMoves] = useState([]);
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [legalMoves, setLegalMoves] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (gameId) {
            loadGame();
        }
    }, [gameId]);

    useEffect(() => {
        if (!gameId) return;

        // Subscribe to board state changes
        const subscription = supabase
            .channel(`chess:${gameId}`)
            .on('postgres_changes', {
                event: 'UPDATE',
                schema: 'public',
                table: 'chess_board_states',
                filter: `game_id=eq.${gameId}`
            }, (payload) => {
                chess.load(payload.new.fen);
                setPosition(chess.fen());
                loadMoves();
                loadGame();
            })
            .subscribe();

        return () => subscription.unsubscribe();
    }, [gameId]);

    const loadGame = async () => {
        const { data: gameData } = await supabase
            .from('chess_games')
            .select(`
                *,
                white_player:white_player_id(name),
                black_player:black_player_id(name)
            `)
            .eq('id', gameId)
            .single();

        if (gameData) {
            setGame(gameData);

            // Load board state
            const { data: boardState } = await supabase
                .from('chess_board_states')
                .select('*')
                .eq('game_id', gameId)
                .single();

            if (boardState) {
                chess.load(boardState.fen);
                setPosition(chess.fen());
            }

            await loadMoves();
        }

        setLoading(false);
    };

    const loadMoves = async () => {
        const { data } = await supabase
            .from('chess_moves')
            .select('*')
            .eq('game_id', gameId)
            .order('move_number', { ascending: true });

        setMoves(data || []);
    };

    const handleSquareClick = (square) => {
        if (!isPlayer() || !isMyTurn()) return;

        if (selectedSquare) {
            // Try to make move
            makeMove(selectedSquare, square);
            setSelectedSquare(null);
            setLegalMoves([]);
        } else {
            // Select piece
            const piece = chess.get(square);
            if (piece && piece.color === (game.current_turn === 'white' ? 'w' : 'b')) {
                setSelectedSquare(square);
                const moves = chess.moves({ square, verbose: true });
                setLegalMoves(moves.map(m => m.to));
            }
        }
    };

    const makeMove = async (from, to) => {
        const move = chess.move({
            from,
            to,
            promotion: 'q' // Always promote to queen for simplicity
        });

        if (!move) {
            return; // Illegal move
        }

        // Save move
        await supabase
            .from('chess_moves')
            .insert({
                game_id: gameId,
                move_number: chess.history().length,
                player_id: user.id,
                from_square: from,
                to_square: to,
                piece: move.piece,
                captured_piece: move.captured || null,
                is_check: chess.inCheck(),
                is_checkmate: chess.isCheckmate(),
                notation: move.san
            });

        // Update board state
        await supabase
            .from('chess_board_states')
            .update({
                fen: chess.fen(),
                move_count: chess.history().length,
                updated_at: new Date().toISOString()
            })
            .eq('game_id', gameId);

        // Update game
        await supabase
            .from('chess_games')
            .update({
                current_turn: chess.turn() === 'w' ? 'white' : 'black',
                status: chess.isCheckmate() ? 'checkmate' :
                    chess.isStalemate() ? 'stalemate' :
                        chess.isDraw() ? 'draw' : 'active',
                winner_id: chess.isCheckmate() ? user.id : null,
                updated_at: new Date().toISOString()
            })
            .eq('id', gameId);

        setPosition(chess.fen());
        await loadMoves();
        await loadGame();
    };

    const handleResign = async () => {
        if (!confirm('Are you sure you want to resign?')) return;

        const opponentId = game.white_player_id === user.id ?
            game.black_player_id : game.white_player_id;

        await supabase
            .from('chess_games')
            .update({
                status: 'resigned',
                winner_id: opponentId,
                updated_at: new Date().toISOString()
            })
            .eq('id', gameId);

        navigate('/games/chess');
    };

    const isMyTurn = () => {
        if (!game) return false;
        return (
            (game.current_turn === 'white' && game.white_player_id === user.id) ||
            (game.current_turn === 'black' && game.black_player_id === user.id)
        );
    };

    const isPlayer = () => {
        if (!game) return false;
        return game.white_player_id === user.id || game.black_player_id === user.id;
    };

    const renderBoard = () => {
        const board = [];
        const squares = chess.board();

        // Determine if we should flip the board (black player sees board from their perspective)
        const isBlackPlayer = game && game.black_player_id === user.id;

        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                // Flip the board for black player
                const displayRow = isBlackPlayer ? 7 - row : row;
                const displayCol = isBlackPlayer ? 7 - col : col;

                const square = String.fromCharCode(97 + displayCol) + (8 - displayRow);
                const piece = squares[displayRow][displayCol];
                const isLight = (row + col) % 2 === 0;
                const isSelected = selectedSquare === square;
                const isLegalMove = legalMoves.includes(square);

                board.push(
                    <div
                        key={square}
                        className={`chess-square ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''} ${isLegalMove ? 'legal-move' : ''}`}
                        onClick={() => handleSquareClick(square)}
                    >
                        {piece && renderPiece(piece)}
                    </div>
                );
            }
        }

        return board;
    };

    const renderPiece = (piece) => {
        const pieces = {
            'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚',
            'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔'
        };
        const symbol = pieces[piece.type.toUpperCase()];
        return (
            <span className={`piece ${piece.color === 'w' ? 'white' : 'black'}`}>
                {piece.color === 'w' ? symbol.toUpperCase() : symbol}
            </span>
        );
    };

    if (loading) {
        return <div className="loading">Loading game...</div>;
    }

    if (!game) {
        return <div className="loading">Game not found</div>;
    }

    const gameOver = game.status !== 'active';

    return (
        <div className="chess-game">
            <header className="game-header">
                <button onClick={() => navigate('/games/chess')} className="back-btn">
                    ← Back
                </button>
                <div className="game-info">
                    <h2>
                        {game.white_player?.full_name} (White) vs {game.black_player?.full_name} (Black)
                    </h2>
                    {!gameOver && (
                        <p className="turn-indicator">
                            {isMyTurn() ? "Your turn" : "Opponent's turn"}
                        </p>
                    )}
                    {gameOver && (
                        <p className="game-over">
                            Game Over - {game.status}
                            {game.winner_id && ` - Winner: ${game.winner_id === game.white_player_id ? game.white_player?.full_name : game.black_player?.full_name}`}
                        </p>
                    )}
                </div>
            </header>

            <div className="chess-container">
                <div className="chess-board-wrapper">
                    <div className="chess-board">
                        {renderBoard()}
                    </div>
                </div>

                <div className="chess-sidebar">
                    <div className="move-history">
                        <h3>Move History</h3>
                        <div className="moves-list">
                            {moves.length === 0 && <p className="muted">No moves yet</p>}
                            {moves.map((move, index) => (
                                <div key={move.id} className="move-item">
                                    {index + 1}. {move.notation}
                                </div>
                            ))}
                        </div>
                    </div>

                    {!gameOver && isPlayer() && (
                        <div className="game-actions">
                            <button onClick={handleResign} className="resign-btn">
                                Resign
                            </button>
                        </div>
                    )}
                    {!isPlayer() && (
                        <div className="muted">
                            Spectating
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ChessBoard;
