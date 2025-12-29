import React, { useMemo, useState } from 'react';
import Avatar from '../../components/ui/Avatar';
import StatusBadge from '../../components/ui/StatusBadge';
import './StoryCarousel.css';

const StoryCarousel = ({ pulses, profiles, onClose, onReply }) => {
    const stories = useMemo(
        () =>
            pulses
                .filter((p) => p.state || p.note || p.photo_url)
                .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)),
        [pulses]
    );
    const [index, setIndex] = useState(0);
    if (!stories.length) return null;
    const story = stories[index];
    const profile = profiles[story.user_id] || {};
    const timeText = story.created_at
        ? new Date(story.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '';

    const next = () => setIndex((i) => (i + 1) % stories.length);
    const prev = () => setIndex((i) => (i - 1 + stories.length) % stories.length);

    return (
        <div className="story-backdrop" onClick={onClose}>
            <div className="story-body" onClick={(e) => e.stopPropagation()}>
                <button className="story-close" onClick={onClose} aria-label="Close">×</button>
                <div className="story-top">
                    <Avatar name={profile.name} email={profile.email} />
                    <div className="story-meta">
                        <p className="story-name">{profile.name || profile.email || 'Family'}</p>
                        <p className="story-time">{timeText}</p>
                    </div>
                    {story.state && <StatusBadge status={story.state} />}
                </div>
                {story.photo_url && (
                    <div className="story-media">
                        <img src={story.photo_url} alt="Story" />
                    </div>
                )}
                {story.note && <p className="story-note">{story.note}</p>}
                <div className="story-actions">
                    <button onClick={prev} aria-label="Previous">{'<'} </button>
                    <div className="story-dots">
                        {stories.map((_, i) => (
                            <span key={i} className={`dot ${i === index ? 'active' : ''}`} />
                        ))}
                    </div>
                    <button onClick={next} aria-label="Next">{'>'}</button>
                </div>
                <div className="story-footer">
                    <button className="story-reply" onClick={() => onReply?.(story.user_id)}>Reply in chat</button>
                </div>
            </div>
        </div>
    );
};

export default StoryCarousel;
