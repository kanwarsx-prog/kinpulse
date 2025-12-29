import React, { useEffect, useMemo, useState } from 'react';
import { useReactions } from '../../hooks/useReactions';
import './ReactionButton.css';

const emojiPalette = [
    '\u2764\uFE0F', // heart
    '\u{1F44D}', // thumbs up
    '\u{1F602}', // laugh
    '\u{1F389}', // party
    '\u{1F622}', // sad
    '\u{1F62E}', // wow
    '\u{1F64F}', // pray
    '\u{1F44F}', // clap
    '\u{1F525}', // fire
    '\u{1F929}', // star-struck
    '\u{1F440}', // eyes
    '\u2B50' // star
];

const PulseReaction = ({ pulseId, profiles = {} }) => {
    const { groupedReactions, reactionCount, toggleReaction, userReactionType, loading } = useReactions({ pulseId });
    const [showPicker, setShowPicker] = useState(false);
    const [showList, setShowList] = useState(false);

    const likedBy = useMemo(() => {
        const names = [];
        groupedReactions.forEach((gr) => {
            gr.reacted && profiles[pulseId]?.name && names.push(profiles[pulseId].name);
        });
        return names;
    }, [groupedReactions, profiles, pulseId]);

    useEffect(() => {
        if (reactionCount === 0) setShowList(false);
    }, [reactionCount]);

    return (
        <div className="reaction-wrapper" onMouseLeave={() => setShowList(false)} onClick={(e) => e.stopPropagation()}>
            <div className="reaction-pills">
                {groupedReactions.map((r) => (
                    <button
                        key={r.type}
                        className={`reaction-pill ${r.reacted ? 'active' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleReaction(r.type);
                            setShowList(true);
                        }}
                        disabled={loading}
                        aria-label={`React with ${r.type}`}
                    >
                        <span className="emoji">{r.type}</span>
                        <span className="count">{r.count}</span>
                    </button>
                ))}
                <button
                    className="reaction-pill add"
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowPicker((s) => !s);
                    }}
                    disabled={loading}
                    aria-label="Add reaction"
                >
                    <span className="emoji">{userReactionType || '＋'}</span>
                </button>
            </div>
            {showPicker && (
                <div className="reaction-picker" onMouseLeave={() => setShowPicker(false)}>
                    {emojiPalette.map((emoji) => (
                        <button
                            key={emoji}
                            className="reaction-option"
                            onClick={(e) => {
                                e.stopPropagation();
                                toggleReaction(emoji);
                                setShowPicker(false);
                                setShowList(true);
                            }}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
            {showList && reactionCount > 0 && (
                <div className="reaction-popover">
                    <p className="reaction-popover-title">Liked by</p>
                    <div className="reaction-popover-list">
                        {likedBy.map((name, idx) => (
                            <span key={`${name}-${idx}`} className="reaction-popover-pill">{name}</span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PulseReaction;
