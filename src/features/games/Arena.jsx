import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Arena.css';

const games = [
  {
    name: 'Poker Night (beta)',
    tag: 'Strategy',
    status: 'Active tables: 1',
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
];

const mockOngoing = [
  { title: 'Poker with Sam', turn: 'Your turn', game: 'Poker Night', accent: 'poker' },
  { title: 'Dad vs Me', turn: 'Their turn', game: 'Chess Clash', accent: 'chess' }
];

const Arena = () => {
  const navigate = useNavigate();

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
          </div>
        ))}
      </section>

      <section className="ongoing-strip glass">
        <div className="strip-head">
          <p className="eyebrow">Ongoing games</p>
          <span className="muted">Jump back in</span>
        </div>
        <div className="ongoing-row">
          {mockOngoing.map((o, i) => (
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
