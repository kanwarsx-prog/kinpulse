import React, { useEffect, useMemo, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import './PokerLobby.css';
import './PokerTable.css';

const PokerLobby = () => {
    const { supabase, user } = useSupabase();
    const [tables, setTables] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('Poker night');
    const [selected, setSelected] = useState(null);
    const [seats, setSeats] = useState([]);
    const [profilesMap, setProfilesMap] = useState({});
    const [handState, setHandState] = useState(null);
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [fullView, setFullView] = useState(false);

    const mySeat = useMemo(() => seats.find((s) => s.user_id === user?.id), [seats, user?.id]);
    const isMyTurn = handState?.hand && mySeat && handState.hand.turn_seat_no === mySeat.seat_no && handState.hand.status !== 'complete';

    useEffect(() => {
        if (user?.family_id) {
            loadTables();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.family_id]);

    useEffect(() => {
        if (!selected) return undefined;
        const interval = setInterval(() => {
            fetchState(selected.id, mySeat?.id);
        }, 3000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selected?.id, mySeat?.id]);

    const loadTables = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('poker_tables')
            .select('*')
            .eq('family_id', user.family_id)
            .in('status', ['open', 'active'])
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
        if (data?.length) {
            const ids = [...new Set(data.map((s) => s.user_id))];
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, name, email')
                .in('id', ids);
            const map = {};
            (profiles || []).forEach((p) => {
                map[p.id] = p;
            });
            setProfilesMap(map);
        }
        return data || [];
    };

    const handleSelect = async (table) => {
        setSelected(table);
        setFullView(true);
        const seatsData = await loadSeats(table.id);
        const seat = seatsData.find((s) => s.user_id === user.id);
        await fetchState(table.id, seat?.id);
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;
        setCreating(true);
        // Close existing open/active tables for this family
        await supabase
            .from('poker_tables')
            .update({ status: 'finished', updated_at: new Date().toISOString() })
            .eq('family_id', user.family_id)
            .neq('status', 'finished');

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
        const { data: seatsForTable, error: seatsErr } = await supabase
            .from('poker_seats')
            .select('id, seat_no, user_id, chips')
            .eq('table_id', table.id);
        if (seatsErr) {
            setMessage(seatsErr.message);
            setBusy(false);
            return;
        }

        const existingSeat = seatsForTable?.find((s) => s.user_id === user.id);
        if (existingSeat) {
            setSelected(table);
            await fetchState(table.id, existingSeat.id);
            setBusy(false);
            return;
        }

        const nextSeat = seatsForTable?.length ? Math.max(...seatsForTable.map((s) => s.seat_no)) + 1 : 1;
        const { error } = await supabase.from('poker_seats').insert({
            table_id: table.id,
            user_id: user.id,
            seat_no: nextSeat,
            chips: table.starting_chips,
        });
        if (error) {
            if (error.code === '23505') {
                const refreshedSeats = await loadSeats(table.id);
                const seat = refreshedSeats.find((s) => s.user_id === user.id);
                if (seat) {
                    setSelected(table);
                    await fetchState(table.id, seat.id);
                    setBusy(false);
                    return;
                }
            }
            setMessage(error.message);
        }
        const seatsData = await loadSeats(table.id);
        if ((seatsData?.length || 0) >= 2 && table.status !== 'active') {
            await supabase.from('poker_tables').update({ status: 'active', updated_at: new Date().toISOString() }).eq('id', table.id);
            await loadTables();
        }
        const seat = seatsData.find((s) => s.user_id === user.id);
        setSelected(table);
        await fetchState(table.id, seat?.id);
        setMessage('');
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
            if (data?.seats) setSeats(data.seats);
            if (data?.seats?.length) {
                const ids = [...new Set(data.seats.map((s) => s.user_id))];
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, name, email')
                    .in('id', ids);
                const map = {};
                (profiles || []).forEach((p) => { map[p.id] = p; });
                setProfilesMap(map);
            }
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
        if (!handState?.hand || !mySeat) {
            console.error('Cannot act - missing hand or seat:', { handState, mySeat });
            setMessage('Cannot act - missing hand or seat');
            return;
        }
        setBusy(true);

        const requestBody = {
            op: 'act',
            hand_id: handState.hand.id,
            seat_id: mySeat.id,
            action,
            amount
        };

        console.log('Poker action request:', requestBody);
        console.log('Hand state:', handState);
        console.log('My seat:', mySeat);

        try {
            // Use direct fetch to get error response body
            const response = await fetch(`${supabase.supabaseUrl}/functions/v1/poker-engine`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                    'apikey': supabase.supabaseKey
                },
                body: JSON.stringify(requestBody)
            });

            const data = await response.json();

            console.log('Full response:', response);
            console.log('Response status:', response.status);
            console.log('Response data:', data);

            if (!response.ok) {
                const errorMsg = data.error || `HTTP ${response.status}`;
                console.error('Poker action error:', errorMsg);
                setMessage(`Error: ${errorMsg}`);
            } else {
                console.log('Action successful:', data);
                setMessage('');
            }
        } catch (err) {
            console.error('Exception during poker action:', err);
            setMessage(`Exception: ${err.message}`);
        }

        await fetchState(handState.hand.table_id);
        setBusy(false);
    };

    const currentBoard = handState?.hand?.board_cards || [];
    const myCards = handState?.hole_cards || [];
    const street = handState?.hand?.street || 'preflop';
    const status = handState?.hand?.status || 'dealing';
    const pot = handState?.hand?.pot || 0;
    const currentBet = handState?.hand?.current_bet || 0;
    const turnSeatNo = handState?.hand?.turn_seat_no;
    const turnSeatName = turnSeatNo ? seats.find((s) => s.seat_no === turnSeatNo)?.seat_no : null;

    const exitTable = () => {
        setSelected(null);
        setSeats([]);
        setHandState(null);
        setMessage('');
    };

    const CardFace = ({ value, mine }) => {
        if (!value) return null;
        const rank = value.slice(0, -1).toUpperCase();
        const suitCode = value.slice(-1).toLowerCase();
        const suitMap = { h: '\u2665', d: '\u2666', c: '\u2663', s: '\u2660' };
        const isRed = suitCode === 'h' || suitCode === 'd';
        return (
            <div className={`card-face ${mine ? 'mine' : ''} ${isRed ? 'red' : ''}`}>
                <div className="rank">{rank}</div>
                <div className="suit">{suitMap[suitCode] || '?'}</div>
            </div>
        );
    };

    return (
        <div className={`poker-shell ${fullView ? 'full' : ''}`}>
            {!selected && (
                <section className="poker-create">
                    <input
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Table name"
                    />
                    <button onClick={handleCreate} disabled={creating}>{creating ? 'Creating...' : 'Create table'}</button>
                </section>
            )}

            {message && <div className="poker-message">{message}</div>}

            {!selected && (
                <section className="poker-grid">
                    {loading && <div className="muted">Loading tables...</div>}
                    {!loading && !tables.length && <div className="muted">No tables yet. Create one!</div>}
                    {tables.map((table) => {
                        const isMine = seats.find((s) => s.user_id === user.id && s.table_id === table.id);
                        return (
                            <div
                                key={table.id}
                                className={`poker-card ${selected?.id === table.id ? 'active' : ''}`}
                                onClick={() => handleSelect(table)}
                            >
                                <div className="card-head">
                                    <div>
                                        <div className="card-title">{table.name}</div>
                                        <div className="card-meta">{table.status}</div>
                                    </div>
                                    <span className="pill">{table.variant}</span>
                                </div>
                                <div className="card-actions">
                                    {!isMine && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleJoin(table);
                                            }}
                                            disabled={busy}
                                        >
                                            Join
                                        </button>
                                    )}
                                    {isMine && <span className="pill subtle">Joined</span>}
                                </div>
                            </div>
                        );
                    })}
                </section>
            )}

            {selected && (
                <section className="table-panel">
                    <div className="felt-top-bar">
                        <button className="ghost exit-btn" onClick={exitTable}>Exit</button>
                        <div className="felt-title">
                            <div className="card-title">{selected.name}</div>
                            <div className="card-meta">Pot {pot} • {street}</div>
                        </div>
                        <div className="panel-actions compact">
                            <button className="ghost" onClick={() => setFullView((v) => !v)} disabled={busy}>{fullView ? 'Exit full screen' : 'Full screen'}</button>
                            <button onClick={startHand} disabled={busy || status === 'betting' || selected.status === 'finished'}>Start</button>
                            {selected.created_by === user.id && (
                                <button className="ghost" onClick={handleCloseTable} disabled={busy}>Close</button>
                            )}
                        </div>
                    </div>

                    <div className="seats-row ring">
                        <div className="table-felt">
                            <div className="pot-badge">Pot {pot}</div>
                            <div className="board-row">
                                <div className="board label">Board</div>
                                <div className="card-row board-cards">
                                    {currentBoard.length
                                        ? currentBoard.map((c, i) => <CardFace key={i} value={c} />)
                                        : <span className="muted">No cards yet</span>}
                                </div>
                            </div>
                            <div className="seat-ring">
                                {seats.map((s) => {
                                    const profile = profilesMap[s.user_id];
                                    const displayName =
                                        profile?.name ||
                                        profile?.email?.split('@')[0] ||
                                        `Player ${s.seat_no}`;
                                    const nameParts = displayName.split(' ').filter(Boolean);
                                    const initials = nameParts.length
                                        ? nameParts.map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                                        : String(s.seat_no);
                                    const isTurn = handState?.hand?.turn_seat_no === s.seat_no;
                                    return (
                                        <div
                                            key={s.id}
                                            className={`seat ${s.user_id === user.id ? 'mine' : ''} ${isTurn ? 'turn' : ''}`}
                                        >
                                            <div className="seat-avatar">{initials}</div>
                                            <div className="seat-name">{displayName}</div>
                                            <div className="seat-chip">{s.chips}</div>
                                            {isTurn && <div className="badge">{s.user_id === user.id ? 'Your turn' : 'Their turn'}</div>}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="my-cards">
                                <div className="label">Your cards</div>
                                <div className="card-row">
                                    {myCards.length ? myCards.map((c, i) => <CardFace key={i} value={c} mine />) : <span className="muted">Waiting for deal</span>}
                                </div>
                            </div>
                        </div>
                    </div>

                    {mySeat ? (
                        <div className="actions action-bar">
                            {(() => {
                                const currentBet = handState?.hand?.current_bet || 0;
                                const myCommitted = handState?.hand?.committed?.[mySeat.id]?.amount || 0;
                                const needToCall = currentBet - myCommitted;
                                const canCheck = needToCall <= 0;

                                return (
                                    <>
                                        <button
                                            onClick={() => act(canCheck ? 'check' : 'call')}
                                            disabled={busy || !isMyTurn}
                                        >
                                            {canCheck ? 'Check' : `Call ${needToCall}`}
                                        </button>
                                        <button onClick={() => act('bet', Math.max(10, Math.floor((handState?.hand?.pot || 0) / 2)))} disabled={busy || !isMyTurn}>Half-pot</button>
                                        <button onClick={() => act('fold')} disabled={busy || !isMyTurn} className="ghost">Fold</button>
                                    </>
                                );
                            })()}
                        </div>
                    ) : (
                        <div className="actions action-bar">
                            <span className="muted">Join the table to act</span>
                        </div>
                    )}
                    {status === 'complete' && (
                        <div className="hand-complete">
                            <div>Hand complete. Start the next hand.</div>
                            <button onClick={startHand} disabled={busy}>Start next hand</button>
                        </div>
                    )}
                </section>
            )}
        </div>
    );
};

export default PokerLobby;




