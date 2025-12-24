import React from 'react';
import './UnreadBadge.css';

const UnreadBadge = ({ count, size = 'small' }) => {
    if (!count || count === 0) return null;

    const displayCount = count > 9 ? '9+' : count;

    return (
        <div className={`unread-badge ${size}`}>
            {displayCount}
        </div>
    );
};

export default UnreadBadge;
