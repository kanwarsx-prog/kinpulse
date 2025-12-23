import React from 'react';

const RitualCard = ({ ritual, onClick }) => {
    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = (now - date) / (1000 * 60 * 60);

        if (diffInHours < 24) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else if (diffInHours < 48) {
            return 'Yesterday';
        } else {
            return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
        }
    };

    return (
        <div
            className="ritual-card"
            onClick={() => onClick(ritual)}
            style={{
                padding: '20px',
                background: 'white',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '16px',
                borderLeft: '4px solid #6366f1',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: '#1a1a1a', flex: 1 }}>
                    {ritual.name}
                </h3>
                <span style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap', marginLeft: '12px' }}>
                    {formatDate(ritual.created_at)}
                </span>
            </div>

            <p style={{ fontSize: '14px', color: '#6b7280', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                {ritual.prompt}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '13px', color: '#6366f1', fontWeight: 500 }}>
                    Tap to respond →
                </span>
            </div>
        </div>
    );
};

export default RitualCard;
