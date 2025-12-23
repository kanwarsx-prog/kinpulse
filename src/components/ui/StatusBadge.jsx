import React from 'react';

const STATUS_CONFIG = {
    great: { emoji: '😊', label: 'Great', color: '#22c55e' },
    good: { emoji: '🙂', label: 'Good', color: '#3b82f6' },
    okay: { emoji: '😐', label: 'Okay', color: '#eab308' },
    stressed: { emoji: '😰', label: 'Stressed', color: '#f97316' },
    sad: { emoji: '😢', label: 'Sad', color: '#8b5cf6' },
    overwhelmed: { emoji: '😵', label: 'Overwhelmed', color: '#ef4444' },
    none: { emoji: '⚪', label: 'No Update', color: '#94a3b8' }
};

const StatusBadge = ({ status = 'none', showLabel = true, size = 'md' }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.none;

    const sizeStyles = {
        sm: { fontSize: '12px', padding: '2px 6px' },
        md: { fontSize: '14px', padding: '4px 10px' },
        lg: { fontSize: '18px', padding: '6px 14px' }
    };

    return (
        <div
            className="status-badge"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'white',
                border: `1px solid ${config.color}`,
                borderRadius: 'var(--radius-pill)',
                color: 'var(--color-text-primary)',
                ...sizeStyles[size]
            }}
        >
            <span role="img" aria-label={config.label} style={{ fontSize: '1.2em' }}>
                {config.emoji}
            </span>
            {showLabel && <span style={{ fontWeight: 500 }}>{config.label}</span>}
        </div>
    );
};

export default StatusBadge;
export { STATUS_CONFIG };
