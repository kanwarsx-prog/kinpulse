import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../../contexts/SupabaseContext';
import './SplashHighlight.css';

const DISMISS_PREFIX = 'splash_hide_';
const SNOOZE_PREFIX = 'splash_snooze_';
const formatCountdown = (target) => {
  const diff = new Date(target) - new Date();
  if (diff <= 0) return 'Happening now';
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const parts = [];
  if (days) parts.push(`${days}d`);
  parts.push(`${hours.toString().padStart(2, '0')}h`);
  parts.push(`${minutes.toString().padStart(2, '0')}m`);
  parts.push(`${seconds.toString().padStart(2, '0')}s`);
  return parts.join(' ');
};

const SplashHighlight = () => {
  const { supabase, user } = useSupabase();
  const navigate = useNavigate();
  const [featured, setFeatured] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [hidden, setHidden] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isDismissed = useMemo(() => {
    if (!featured?.id) return false;
    return localStorage.getItem(`${DISMISS_PREFIX}${featured.id}`) === 'true';
  }, [featured?.id]);

  const snoozedUntil = useMemo(() => {
    if (!featured?.id) return null;
    const val = localStorage.getItem(`${SNOOZE_PREFIX}${featured.id}`);
    return val ? new Date(val) : null;
  }, [featured?.id]);

  useEffect(() => {
    if (!user?.family_id) return;
    const load = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('events')
          .select('id,title,start_time,event_type,description,show_on_splash')
          .eq('family_id', user.family_id)
          .eq('show_on_splash', true)
          .gte('start_time', new Date().toISOString())
          .order('start_time', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          setFeatured(data);
          setHidden(false);
          setDrawerOpen(false);
        } else {
          setFeatured(null);
        }
      } catch (err) {
        console.error('Error loading splash highlight', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [supabase, user?.family_id]);

  useEffect(() => {
    if (!featured?.start_time || hidden || isDismissed) return;
    if (snoozedUntil && snoozedUntil > new Date()) return;
    setCountdown(formatCountdown(featured.start_time));
    const id = setInterval(() => setCountdown(formatCountdown(featured.start_time)), 1000);
    return () => clearInterval(id);
  }, [featured?.start_time, hidden, isDismissed, snoozedUntil]);

  if (loading || hidden || isDismissed || !featured) return null;
  if (snoozedUntil && snoozedUntil > new Date()) return null;

  const handleDismiss = () => {
    if (featured?.id) {
      localStorage.setItem(`${DISMISS_PREFIX}${featured.id}`, 'true');
    }
    setHidden(true);
  };

  const handleSnooze = (days) => {
    if (!featured?.id) return;
    const until = new Date();
    until.setDate(until.getDate() + days);
    localStorage.setItem(`${SNOOZE_PREFIX}${featured.id}`, until.toISOString());
    setHidden(true);
  };

  const handleView = () => setDrawerOpen(true);

  const handleCloseDrawer = () => setDrawerOpen(false);

  const handleAddCalendar = () => {
    if (!featured?.start_time) return;
    const start = new Date(featured.start_time);
    const end = new Date(featured.start_time);
    end.setHours(end.getHours() + 1);
    const fmt = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
    };
    const url = [
      'https://calendar.google.com/calendar/render?action=TEMPLATE',
      `text=${encodeURIComponent(featured.title)}`,
      `details=${encodeURIComponent(featured.description || '')}`,
      `dates=${fmt(start)}/${fmt(end)}`
    ].join('&');
    window.open(url, '_blank', 'noopener');
  };

  const handleOpenCalendar = () => navigate('/calendar');

  return (
    <>
      <div className="splash-highlight">
        <div className="splash-ribbon">
          <div className="splash-ribbon-text">
            <span className="splash-dot" />
            <div>
              <div className="splash-ribbon-title">{featured.title}</div>
              <div className="splash-ribbon-sub">
                {countdown} • {new Date(featured.start_time).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
          <div className="splash-ribbon-actions">
            <button className="splash-ribbon-btn" onClick={handleView}>Get ready</button>
            <button className="splash-ribbon-icon" onClick={handleDismiss} aria-label="Hide this event">×</button>
          </div>
        </div>
      </div>

      {drawerOpen && (
        <div className="splash-drawer">
          <div className="splash-drawer-card">
            <div className="splash-drawer-header">
              <div>
                <div className="splash-badge">Coming up</div>
                <h3 className="splash-title">{featured.title}</h3>
              </div>
              <button className="splash-btn ghost close" onClick={handleCloseDrawer}>Close</button>
            </div>
            <p className="splash-meta">
              {new Date(featured.start_time).toLocaleString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            <p className="splash-countdown">{countdown}</p>
            {featured.description && <p className="splash-desc">{featured.description}</p>}

            <div className="splash-actions">
              <button className="splash-btn primary" onClick={handleAddCalendar}>Add to calendar</button>
              <button className="splash-btn ghost" onClick={() => handleSnooze(3)}>Snooze 3d</button>
              <button className="splash-btn ghost" onClick={() => handleSnooze(30)}>Skip this event</button>
            </div><div className="splash-checklist-items">
                {tasks.map((task, idx) => (
                  <label key={idx} className={`splash-task ${task.done ? 'done' : ''}`}>
                    <input type="checkbox" checked={task.done} onChange={() => toggleTask(idx)} />
                    <span>{task.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SplashHighlight;

