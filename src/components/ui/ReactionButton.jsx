import React from 'react';
import './ReactionButton.css';

const ReactionButton = ({ hasReacted, count, onToggle, disabled = false }) => {
    const handleClick = (e) => {
        e.stopPropagation();
        if (disabled) return;
        onToggle?.();
    };

    return (
        <button
            className={`reaction-button ${hasReacted ? 'reacted' : ''}`}
            onClick={handleClick}
            disabled={disabled}
            aria-label={hasReacted ? 'Unlike' : 'Like'}
        >
            <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={hasReacted ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {count > 0 && <span className="reaction-count">{count}</span>}
        </button>
    );
};

export default ReactionButton;
