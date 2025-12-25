import React, { useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import './ActivityFeed.css';

const TYPE_LABELS = {
  pulse: 'Pulse',
  message: 'Message',
  photo: 'Photo'
};

const FILTERS = ['all', 'pulse', 'message', 'photo'];

const ActivityFeed = ({ isOpen, onClose }) => {
  const { supabase, user } = useSupabase();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (isOpen) {
      fetchFeed();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, filter]);

  const fetchFeed = async () => {
    if (!user?.family_id) return;
    setLoading(true);

    try {
      const [{ data: pulseData }, { data: messageData }] = await Promise.all([
        supabase
          .from('pulses')
          .select('id, state, note, created_at, user_id, photo_url')
          .eq('family_id', user.family_id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('messages')
          .select('id, content, photo_url, created_at, user_id, recipient_id')
          .eq('family_id', user.family_id)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      const mappedPulses = (pulseData || []).map((p) => ({
        id: `pulse-${p.id}`,
        type: 'pulse',
        created_at: p.created_at,
        title: 'Family pulse',
        body: p.note || p.state,
        photo_url: p.photo_url
      }));

      const mappedMessages = (messageData || []).map((m) => ({
        id: `msg-${m.id}`,
        type: m.photo_url ? 'photo' : 'message',
        created_at: m.created_at,
        title: m.recipient_id ? 'Direct message' : 'Family chat',
        body: m.content || (m.photo_url ? 'Photo shared' : ''),
        photo_url: m.photo_url
      }));

      const combined = [...mappedPulses, ...mappedMessages]
        .filter((item) => filter === 'all' || item.type === filter)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 30);

      setItems(combined);
    } catch (err) {
      console.error('Activity feed error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="activity-overlay" onClick={onClose}>
      <div className="activity-panel" onClick={(e) => e.stopPropagation()}>
        <div className="activity-header">
          <div>
            <p className="activity-eyebrow">Activity</p>
            <h3>Recent updates</h3>
          </div>
          <button className="close-btn" onClick={onClose} aria-label="Close activity feed">
            ×
          </button>
        </div>

        <div className="activity-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`activity-filter ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : TYPE_LABELS[f]}
            </button>
          ))}
        </div>

        <div className="activity-body">
          {loading ? (
            <p className="activity-hint">Loading...</p>
          ) : items.length === 0 ? (
            <p className="activity-hint">No recent updates</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="activity-item">
                <div className={`activity-type activity-${item.type}`}>{TYPE_LABELS[item.type]}</div>
                <div className="activity-text">
                  <p className="activity-title">{item.title}</p>
                  {item.body && <p className="activity-body">{item.body}</p>}
                  <p className="activity-time">
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {item.photo_url && (
                  <img
                    src={item.photo_url}
                    alt="Activity"
                    className="activity-thumb"
                    onClick={() => window.open(item.photo_url, '_blank')}
                  />
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityFeed;
