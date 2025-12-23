import React from 'react';

const RitualCard = ({ ritual, onClick }) => {
    const isExpired = new Date(ritual.expiresAt) < new Date();

    return (
        <div
            className="ritual-card"
            onClick={() => onClick(ritual)}
            style={{
                padding: 'var(--space-md)',
                background: 'white',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)',
                marginBottom: 'var(--space-md)',
                borderLeft: `4px solid ${isExpired ? 'hsl(var(--color-text-secondary))' : 'hsl(var(--color-accent))'}`,
                opacity: isExpired ? 0.7 : 1
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'hsl(var(--color-text-secondary))', fontWeight: 600 }}>
                    {ritual.frequency}
                </span>
                <span style={{ fontSize: '10px', color: 'hsl(var(--color-text-secondary))' }}>
                    {isExpired ? 'Closed' : 'Active'}
                </span>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '4px', color: 'hsl(var(--color-text-primary))' }}>
                {ritual.title}
            </h3>

            <p style={{ fontSize: '14px', color: 'hsl(var(--color-text-secondary))' }}>
                {ritual.prompt}
            </p>

            {!isExpired && (
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: '12px', color: 'hsl(var(--color-accent))', fontWeight: 500 }}>
                        Participate →
                    </span>
                </div>
            )}
        </div>
    );
};

export default RitualCard;
