import React, { useEffect, useMemo, useState } from 'react';
import { useReactions } from '../../hooks/useReactions';
import ReactionButton from './ReactionButton';
import './ReactionButton.css';

const PulseReaction = ({ pulseId, profiles = {} }) => {
    const { groupedReactions, hasUserReacted, reactionCount, toggleReaction, userReactionType, loading } = useReactions({ pulseId });
    const [showPicker, setShowPicker] = useState(false);
    const [showList, setShowList] = useState(false);

    const likedBy = useMemo(
        () =>
            groupedReactions.flatMap((gr) =>
                (gr.reacted && profiles[pulseId]?.name) ? [profiles[pulseId].name] : []
            ),
        [groupedReactions, profiles, pulseId]
    );

    useEffect(() => {
        if (reactionCount === 0) setShowList(false);
    }, [reactionCount]);

    const emojiOptions = ['❤️','👍','😂','🎉','😢','😮','😡','🙏','👏','🔥','😊','🤔','💤','🤯','🥳','🙌','🍕','☕','🫶','👀','🎯','🌟'];

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
                    {emojiOptions.map((emoji) => (
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
            <ReactionButton
                hasReacted={hasUserReacted}
                count={reactionCount}
                onShortPress={() => {
                    toggleReaction(userReactionType || '❤️');
                    setShowList(true);
                }}
                onLongPress={() => {
                    toggleReaction(userReactionType || '❤️');
                    setShowList(true);
                }}
                disabled={loading}
            />
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
