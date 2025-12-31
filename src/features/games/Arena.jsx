import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../../contexts/SupabaseContext';
import './Arena.css';

const Arena = () => {
  const navigate = useNavigate();
  const { supabase, user } = useSupabase();
  const [pokerTables, setPokerTables] = useState([]);
  const [loadingPoker, setLoadingPoker] = useState(true);
  const [creatingPoker, setCreatingPoker] = useState(false);
  const [newPokerName, setNewPokerName] = useState('Poker night');

  const games = useMemo(() => ([
    {
      name: 'Poker Night (beta)',
      tag: 'Strategy',
      status: loadingPoker ? 'Loading...' : `Active tables: ${pokerTables.length}`,
      description: 'Turn-based Hold’em · 2–6 players · ~10 mins/hand',
      action: '/poker',
      accent: 'poker'
    },
    {
      name: 'Chess Clash',
      tag: 'Strategy',
      status: 'Coming soon',
      description: 'Async chess · 2 players · daily moves',
      action: null,
      accent: 'chess'
    },
    {
      name: 'Ludo Dash',
      tag: 'Casual',
      status: 'Coming soon',
      description: 'Casual · 2–4 players · quick turns',
      action: null,
      accent: 'ludo'
    },
    {
      name: 'Trivia Rally',
      tag: 'Quick',
      status: 'Coming soon',
      description: 'Family topics · 3+ players · 5-question rounds',
      action: null,
      accent: 'trivia'
    }
  ]), [loadingPoker, pokerTables.length]);

  useEffect(() => {
    const loadPoker = async () => {
      if (!user?.family_id) return;
      setLoadingPoker(true);
      const { data, error } = await supabase
        .from('poker_tables')
        .select('id, name, status, created_at')
        .eq('family_id', user.family_id)
        .order('created_at', { ascending: false });
      if (!error) setPokerTables(data || []);
      setLoadingPoker(false);
    };
    loadPoker();
  }, [supabase, user?.family_id]);

  const ongoingPoker = pokerTables.slice(0, 6).map((t) => ({
    title: t.name,
    turn: t.status === 'active' ? 'In play' : 'Open',
    game: 'Poker Night',
    accent: 'poker',
    tableId: t.id
  }));

  const handleQuickPoker = async () => {
    if (!user?.family_id || creatingPoker) return;
    setCreatingPoker(true);
    await supabase
      .from('poker_tables')
      .insert({
        family_id: user.family_id,
        name: newPokerName || 'Poker night',
        variant: 'holdem',
        small_blind: 10,
        starting_chips: 200,
        created_by: user.id
      });
    setNewPokerName('Poker night');
    setCreatingPoker(false);
    const { data } = await supabase
      .from('poker_tables')
      .select('id, name, status, created_at')
      .eq('family_id', user.family_id)
      .order('created_at', { ascending: false });
    setPokerTables(data || []);
  };

  return (
    <div className="arena-page fade-in">
      <section className="arena-hero glass">
        <div>
          <p className="eyebrow">Family Arena</p>
          <h1>Pick a game, invite the fam, and play async.</h1>
          <p className="muted">Quick-start tables, turn alerts, and friendly leaderboards.</p>
          <div className="cta-row">
            <button className="primary" onClick={() => navigate('/poker')}>Start a game</button>
            <button className="ghost" onClick={() => navigate('/join')}>Invite family</button>
          </div>
        </div>
        <div className="hero-art">
          <div className="stage">
            <div className="chip-stack" />
            <div className="avatar-bubble">🎉</div>
            <div className="avatar-bubble b2">♟️</div>
            <div className="avatar-bubble b3">🧠</div>
          </div>
        </div>
      </section>

      <section className="game-grid">
        {games.map((g) => (
          <div key={g.name} className={`game-card glass ${g.accent}`}>
            <div className="game-top">
              <span className="pill">{g.tag}</span>
              <span className="pill subtle">{g.status}</span>
            </div>
            <h3>{g.name}</h3>
            <p className="muted">{g.description}</p>
            <div className="card-actions">
              <button
                className="primary"
                disabled={!g.action}
                onClick={() => g.action && navigate(g.action)}
              >
                {g.action ? 'Play' : 'Coming soon'}
              </button>
              <button
                className="ghost"
                disabled={!g.action}
                onClick={() => g.action && navigate(g.action)}
              >
                {g.action ? 'View tables' : 'Notify me'}
              </button>
            </div>
            {g.accent === 'poker' && (
              <div className="poker-quick">
                <input
                  value={newPokerName}
                  onChange={(e) => setNewPokerName(e.target.value)}
                  placeholder="Table name"
                />
                <button onClick={handleQuickPoker} disabled={creatingPoker}>
                  {creatingPoker ? 'Creating...' : 'Quick create'}
                </button>
              </div>
            )}
          </div>
        ))}
      </section>

      <section className="ongoing-strip glass">
        <div className="strip-head">
          <p className="eyebrow">Ongoing games</p>
          <span className="muted">Jump back in</span>
        </div>
        <div className="ongoing-row">
          {ongoingPoker.length === 0 && <div className="muted">No games yet. Start one!</div>}
          {ongoingPoker.map((o, i) => (
            <div key={i} className={`ongoing-card ${o.accent}`}>
              <div className="title">{o.title}</div>
              <div className="sub">{o.game}</div>
              <div className="turn">{o.turn}</div>
              <button className="ghost" onClick={() => navigate('/poker')}>Open</button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Arena;
