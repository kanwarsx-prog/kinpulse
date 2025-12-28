import React, { useEffect, useMemo, useState } from 'react';
import { useReactions } from '../../hooks/useReactions';
import ReactionButton from './ReactionButton';
import './ReactionButton.css';

const PulseReaction = ({ pulseId, profiles = {} }) => {
    const { reactions, hasUserReacted, reactionCount, toggleReaction, loading } = useReactions({ pulseId });
    const [showList, setShowList] = useState(false);

    const likedBy = useMemo(() => reactions.map((r) => {
        const p = profiles[r.user_id];
        if (!p) return 'Someone';
        return p.name || p.email?.split('@')[0] || 'Someone';
    }), [reactions, profiles]);

    useEffect(() => {
        if (reactionCount === 0) {
            setShowList(false);
        }
    }, [reactionCount]);

    const handleShortPress = () => {
        setShowList(true);
    };

    const handleLongPress = () => {
        toggleReaction();
        setShowList(true);
    };

    return (
        <div className="reaction-wrapper" onMouseLeave={() => setShowList(false)} onClick={(e) => e.stopPropagation()}>
            <ReactionButton
                hasReacted={hasUserReacted}
                count={reactionCount}
                onShortPress={handleShortPress}
                onLongPress={handleLongPress}
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
