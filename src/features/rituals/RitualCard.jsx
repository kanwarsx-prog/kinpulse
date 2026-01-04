import React from 'react';

const RitualCard = ({ ritual, onClick, participants = 0, familyCount = 0, joined = false, onJoin, isOwner = false, onDelete }) => {
    // ... formatDate logic same as before ...
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

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    <strong style={{ color: '#111827' }}>{participants}</strong>
                    {familyCount ? ` / ${familyCount}` : ''} joined
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    {isOwner && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete?.(ritual.id);
                            }}
                            style={{
                                padding: '6px 10px',
                                borderRadius: '10px',
                                border: '1px solid #fee2e2',
                                background: '#fef2f2',
                                color: '#dc2626',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Delete
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onJoin?.(ritual.id);
                        }}
                        style={{
                            padding: '6px 10px',
                            borderRadius: '10px',
                            border: joined ? '1px solid #d1d5db' : '1px solid #6366f1',
                            background: joined ? '#f3f4f6' : '#eef2ff',
                            color: joined ? '#374151' : '#4338ca',
                            fontWeight: 700,
                            cursor: 'pointer'
                        }}
                    >
                        {joined ? 'Joined' : 'Join'}
                    </button>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onClick(ritual);
                        }}
                        style={{
                            padding: '6px 10px',
                            borderRadius: '10px',
                            border: '1px solid #e5e7eb',
                            background: '#fff',
                            color: '#111827',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        View
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RitualCard;
