import React, { useEffect, useMemo, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import './PokerLobby.css';

const PokerLobby = () => {
    const { supabase, user } = useSupabase();
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('Poker night');
    const [selected, setSelected] = useState(null);
    const [seats, setSeats] = useState([]);
    const [handState, setHandState] = useState(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');

    const mySeat = useMemo(() => seats.find((s) => s.user_id === user?.id), [seats, user?.id]);
    const isMyTurn = handState?.hand && mySeat && handState.hand.turn_seat_no === mySeat.seat_no && handState.hand.status !== 'complete';

    useEffect(() => {
        if (user?.family_id) {
            loadTables();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.family_id]);

    const loadTables = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('poker_tables')
            .select('*')
            .eq('family_id', user.family_id)
            .order('created_at', { ascending: false });
        if (!error) setTables(data || []);
        setLoading(false);
    };

    const loadSeats = async (tableId) => {
        const { data } = await supabase
            .from('poker_seats')
            .select('id,user_id,seat_no,chips,status')
            .eq('table_id', tableId)
            .order('seat_no');
        setSeats(data || []);
        return data || [];
    };

    const handleSelect = async (table) => {
        setSelected(table);
        const seatsData = await loadSeats(table.id);
        const seat = seatsData.find((s) => s.user_id === user.id);
        await fetchState(table.id, seat?.id);
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        const { data, error } = await supabase
            .from('poker_tables')
            .insert({
                family_id: user.family_id,
                name: newName.trim(),
                created_by: user.id,
            })
            .select()
            .single();
        if (!error && data) {
            setTables([data, ...tables]);
            setNewName('Poker night');
        } else {
            setMessage(error?.message || 'Could not create table');
        }
        setCreating(false);
    };

    const handleJoin = async (table) => {
        if (busy) return;
        setBusy(true);
        const { data: seatsForTable } = await supabase
            .from('poker_seats')
            .select('seat_no')
            .eq('table_id', table.id);
        const nextSeat = seatsForTable?.length ? Math.max(...seatsForTable.map((s) => s.seat_no)) + 1 : 1;
        const { error } = await supabase.from('poker_seats').insert({
            table_id: table.id,
            user_id: user.id,
            seat_no: nextSeat,
            chips: table.starting_chips,
        });
        if (error) setMessage(error.message);
        const seatsData = await loadSeats(table.id);
        const seat = seatsData.find((s) => s.user_id === user.id);
        await fetchState(table.id, seat?.id);
        setBusy(false);
    };

    const handleCloseTable = async () => {
        if (!selected || busy || selected.created_by !== user.id) return;
        setBusy(true);
        const { error } = await supabase
            .from('poker_tables')
            .update({ status: 'finished', updated_at: new Date().toISOString() })
            .eq('id', selected.id);
        if (error) setMessage(error.message);
        await loadTables();
        setSelected(null);
        setSeats([]);
        setHandState(null);
        setBusy(false);
    };

    const fetchState = async (tableId, seatIdOverride) => {
        const { data, error } = await supabase.functions.invoke('poker-engine', {
            body: { op: 'state', table_id: tableId, seat_id: seatIdOverride || mySeat?.id },
        });
        if (!error) {
            setHandState(data);
        }
    };

    const startHand = async () => {
        if (!selected) return;
        setBusy(true);
        const { error } = await supabase.functions.invoke('poker-engine', {
            body: { op: 'start_hand', table_id: selected.id },
        });
        if (error) setMessage(error.message);
        await fetchState(selected.id, mySeat?.id);
        setBusy(false);
    };

    const act = async (action, amount = 0) => {
        if (!handState?.hand || !mySeat) return;
        setBusy(true);
        const { error } = await supabase.functions.invoke('poker-engine', {
            body: { op: 'act', hand_id: handState.hand.id, seat_id: mySeat.id, action, amount },
        });
        if (error) setMessage(error.message);
        await fetchState(handState.hand.table_id);
        setBusy(false);
    };

    const currentBoard = handState?.hand?.board_cards || [];
    const myCards = handState?.hole_cards || [];
    const street = handState?.hand?.street || 'preflop';
    const status = handState?.hand?.status || 'dealing';
    const pot = handState?.hand?.pot || 0;

    return (
        <div className="poker-page fade-in">
            <header className="poker-header">
                <div>
                    <p className="eyebrow">Family game</p>
                    <h1>Poker Night (beta)</h1>
                    <p className="subtle">Async, low-stakes Hold’em for the family.</p>
                </div>
            </header>

            <section className="poker-create">
                <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Table name"
                />
                <button onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create table'}</button>
            </section>

            {message && <div className="poker-message">{message}</div>}

            <section className="poker-grid">
                {loading && <div className="muted">Loading tables…</div>}
                {!loading && !tables.length && <div className="muted">No tables yet. Create one!</div>}
                {tables.map((table) => {
                    const isMine = seats.find((s) => s.user_id === user.id && s.table_id === table.id);
                    return (
                        <div key={table.id} className={`poker-card ${selected?.id === table.id ? 'active' : ''}`}>
                            <div className="card-head">
                                <div>
                                    <div className="card-title">{table.name}</div>
                                    <div className="card-meta">{table.status}</div>
                                </div>
                                <span className="pill">{table.variant}</span>
                            </div>
                            <div className="card-actions">
                                <button onClick={() => handleSelect(table)}>Open</button>
                                {!isMine && <button onClick={() => handleJoin(table)} disabled={busy}>Join</button>}
                            </div>
                        </div>
                    );
                })}
            </section>

            {selected && (
                <section className="table-panel">
                    <div className="panel-head">
                        <div>
                            <p className="eyebrow">Table</p>
                            <h3>{selected.name}</h3>
                        </div>
                        <div className="panel-actions">
                            <button onClick={startHand} disabled={busy || status === 'betting' || selected.status === 'finished'}>Start hand</button>
                            {selected.created_by === user.id && (
                                <button className="ghost" onClick={handleCloseTable} disabled={busy}>Close table</button>
                            )}
                        </div>
                    </div>

                    <div className="seats-row ring">
                        {seats.map((s) => (
                            <div key={s.id} className={`seat ${s.user_id === user.id ? 'mine' : ''} ${handState?.hand?.turn_seat_no === s.seat_no ? 'turn' : ''}`}>
                                <div className="seat-name">Seat {s.seat_no}</div>
                                <div className="seat-chips">{s.chips} chips</div>
                                {handState?.hand?.turn_seat_no === s.seat_no && <div className="badge">Your turn</div>}
                            </div>
                        ))}
                    </div>

                    <div className="hand-state">
                        <div className="board">
                            <div className="label">Board • {street} • Pot {pot}</div>
                            <div className="card-row">
                                {currentBoard.length ? currentBoard.map((c, i) => <span key={i} className="card">{c}</span>) : <span className="muted">No cards yet</span>}
                            </div>
                        </div>

                        {mySeat && (
                            <div className="hand-meta">
                                <div>
                                    <div className="label">Your cards</div>
                                    <div className="card-row">
                                        {myCards.length ? myCards.map((c, i) => <span key={i} className="card mine">{c}</span>) : <span className="muted">Waiting for deal</span>}
                                    </div>
                                </div>
                                <div className="actions">
                                    <button onClick={() => act('check')} disabled={busy || !isMyTurn}>Check/Call</button>
                                    <button onClick={() => act('bet', Math.max(10, Math.floor((handState?.hand?.pot || 0) / 2)))} disabled={busy || !isMyTurn}>Half-pot</button>
                                    <button onClick={() => act('fold')} disabled={busy || !isMyTurn} className="ghost">Fold</button>
                                </div>
                            </div>
                        )}
                        {status === 'complete' && (
                            <div className="hand-complete">
                                <div>Hand complete. Start the next hand.</div>
                                <button onClick={startHand} disabled={busy}>Start next hand</button>
                            </div>
                        )}
                    </div>
                </section>
            )}
        </div>
    );
};

export default PokerLobby;
