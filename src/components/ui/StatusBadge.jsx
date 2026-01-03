import React from 'react';

const STATUS_CONFIG = {
    great: {
        emoji: '😊',
        label: 'Great',
        gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
        shadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
    },
    good: {
        emoji: '🙂',
        label: 'Good',
        gradient: 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
        shadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
    },
    okay: {
        emoji: '😐',
        label: 'Okay',
        gradient: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
        shadow: '0 4px 12px rgba(139, 92, 246, 0.3)'
    },
    stressed: {
        emoji: '😰',
        label: 'Stressed',
        gradient: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
        shadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
    },
    sad: {
        emoji: '😢',
        label: 'Sad',
        gradient: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
        shadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
    },
    overwhelmed: {
        emoji: '😵',
        label: 'Overwhelmed',
        gradient: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
        shadow: '0 4px 12px rgba(220, 38, 38, 0.3)'
    },
    none: {
        emoji: '⚪',
        label: 'No Update',
        gradient: 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
        shadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
    }
};

const StatusBadge = ({ status = 'none', showLabel = true, size = 'md' }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.none;

    const sizeStyles = {
        sm: { fontSize: '12px', padding: '3px 8px' },
        md: { fontSize: '14px', padding: '5px 12px' },
        lg: { fontSize: '18px', padding: '8px 16px' }
    };

    return (
        <div
            className="status-badge"
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: config.gradient,
                border: 'none',
                borderRadius: 'var(--radius-pill)',
                color: 'white',
                fontWeight: 600,
                boxShadow: config.shadow,
                transition: 'all 0.3s ease',
                ...sizeStyles[size]
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)';
                e.currentTarget.style.boxShadow = config.shadow.replace('12px', '16px');
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)';
                e.currentTarget.style.boxShadow = config.shadow;
            }}
        >
            <span role="img" aria-label={config.label} style={{ fontSize: '1.2em' }}>
                {config.emoji}
            </span>
            {showLabel && <span style={{ fontWeight: 600 }}>{config.label}</span>}
        </div>
    );
};

export default StatusBadge;
export { STATUS_CONFIG };

