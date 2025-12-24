import React from 'react';
import { useReactions } from '../../hooks/useReactions';
import ReactionButton from './ReactionButton';

const MessageReaction = ({ messageId }) => {
    const { hasUserReacted, reactionCount, toggleReaction, loading } = useReactions({ messageId });

    return (
        <ReactionButton
            hasReacted={hasUserReacted}
            count={reactionCount}
            onToggle={toggleReaction}
            disabled={loading}
        />
    );
};

export default MessageReaction;
