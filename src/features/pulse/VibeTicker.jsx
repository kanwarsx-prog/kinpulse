import React, { useMemo, useState } from 'react';
import Avatar from '../../components/ui/Avatar';
import './VibeTicker.css';

const statusEmoji = {
  great: '😊',
  good: '🙂',
  okay: '😐',
  stressed: '😣',
  sad: '😢',
  overwhelmed: '🥵'
};

const VibeTicker = ({ pulses, profiles, onReply }) => {
  const [focus, setFocus] = useState(null);
  const vibes = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const base = (pulses || []).filter(
      (p) => p.created_at && new Date(p.created_at).getTime() >= cutoff && (p.state || p.note || p.photo_url)
    );
    if (!base.length) return [];
    return [...base, ...base]; // duplicate for seamless loop
  }, [pulses]);

  if (!vibes.length) return null;

  const [paused, setPaused] = useState(false);
  const duration = Math.max(12, vibes.length * 2);

  const renderCard = (vibe) => {
    const profile = profiles?.[vibe.user_id] || {};
    const label = profile.name || profile.email || 'Family';
    const time = vibe.created_at ? new Date(vibe.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const emoji = vibe.state ? statusEmoji[vibe.state] || '🙂' : '📷';
    const note = vibe.note || (vibe.photo_url ? 'Shared a photo' : 'Shared an update');
    return (
      <button
        key={`${vibe.id}-${time}`}
        className="vibe-card"
        onClick={() => setFocus(vibe)}
        aria-label={`Open ${label} update`}
      >
        <div className="vibe-avatar">
          <Avatar name={profile.name} email={profile.email} />
          <span className="vibe-emoji">{emoji}</span>
        </div>
        <div className="vibe-text">
          <div className="vibe-name">{label}</div>
          <div className="vibe-note">{note}</div>
          <div className="vibe-time">{time}</div>
        </div>
      </button>
    );
  };

  const renderDetail = () => {
    if (!focus) return null;
    const profile = profiles?.[focus.user_id] || {};
    const label = profile.name || profile.email || 'Family';
    const emoji = focus.state ? statusEmoji[focus.state] || '🙂' : '📷';
    const when = focus.created_at
      ? new Date(focus.created_at).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
      : '';

    return (
      <div className="vibe-detail-backdrop" onClick={() => setFocus(null)}>
        <div className="vibe-detail" onClick={(e) => e.stopPropagation()}>
          <button className="vibe-detail-close" onClick={() => setFocus(null)} aria-label="Close">
            ×
          </button>
          <div className="vibe-detail-head">
            <Avatar name={profile.name} email={profile.email} />
            <div>
              <div className="vibe-name">{label}</div>
              <div className="vibe-time">{when}</div>
            </div>
            <div className="vibe-pill">
              <span className="vibe-emoji">{emoji}</span>
              {focus.state && <span className="vibe-state">{focus.state}</span>}
            </div>
          </div>
          {focus.note && <p className="vibe-detail-note">{focus.note}</p>}
          {focus.photo_url && (
            <div className="vibe-detail-media">
              <img src={focus.photo_url} alt="Pulse" />
            </div>
          )}
          <div className="vibe-detail-actions">
            <button className="vibe-btn primary" onClick={() => onReply?.(focus.user_id)}>
              Reply in chat
            </button>
            <button className="vibe-btn ghost" onClick={() => setFocus(null)}>
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  };

  const marqueeStyle = paused ? { animationPlayState: 'paused' } : {};

  return (
    <>
      <div className="vibe-ticker">
        <div className="vibe-label">Today’s vibe</div>
        <div
          className="vibe-marquee"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          <div className="vibe-marquee-track" style={{ animationDuration: `${duration}s`, ...marqueeStyle }}>
            {vibes.map(renderCard)}
          </div>
        </div>
      </div>
      {renderDetail()}
    </>
  );
};

export default VibeTicker;
