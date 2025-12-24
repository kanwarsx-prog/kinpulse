import React from 'react';
import { useReactions } from '../../hooks/useReactions';
import ReactionButton from './ReactionButton';

const PulseReaction = ({ pulseId }) => {
    const { hasUserReacted, reactionCount, toggleReaction, loading } = useReactions({ pulseId });

    return (
        <ReactionButton
            hasReacted={hasUserReacted}
            count={reactionCount}
            onToggle={toggleReaction}
            disabled={loading}
        />
    );
};

export default PulseReaction;
