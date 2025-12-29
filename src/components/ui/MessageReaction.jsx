import React from 'react';
import { useReactions } from '../../hooks/useReactions';
import { useState } from 'react';
import ReactionButton from './ReactionButton';

const MessageReaction = ({ messageId }) => {
    const { hasUserReacted, reactionCount, toggleReaction, groupedReactions, userReactionType, loading } = useReactions({ messageId });
    const [showPicker, setShowPicker] = useState(false);

    const emojiOptions = ['❤️','👍','😂','🎉','😢','😮','😡','🙏','👏','🔥','😊','🤔','💤','🤯','🥳','🙌','🍕','☕','🫶','👀','🎯','🌟'];

    return (
        <div className="reaction-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="reaction-pills">
                {groupedReactions.map((r) => (
                    <button
                        key={r.type}
                        className={`reaction-pill ${r.reacted ? 'active' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleReaction(r.type);
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
                            }}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MessageReaction;
