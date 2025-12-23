import React, { useState } from 'react';
import { STATUS_CONFIG } from '../../components/ui/StatusBadge';
import './PulseInput.css';

const PulseInput = ({ onSubmit }) => {
    const [selected, setSelected] = useState(null);

    const handleSelect = (key) => {
        setSelected(key);
        // Simulate submission after brief delay or confirmation
        // For MVP, just select.
    };

    const handleSubmit = () => {
        if (selected) {
            onSubmit({ state: selected, note: '', timestamp: new Date() });
        }
    };

    return (
        <div className="pulse-input-container">
            <h2 className="pulse-question">How are you feeling right now?</h2>

            <div className="status-grid">
                {Object.entries(STATUS_CONFIG).filter(([key]) => key !== 'none').map(([key, config]) => (
                    <button
                        key={key}
                        className={`status-option ${selected === key ? 'selected' : ''}`}
                        onClick={() => handleSelect(key)}
                        style={{ '--status-color': config.color }}
                    >
                        <span className="emoji">{config.emoji}</span>
                        <span className="label">{config.label}</span>
                    </button>
                ))}
            </div>

            <div className="action-area">
                <button
                    className="submit-btn"
                    disabled={!selected}
                    onClick={handleSubmit}
                >
                    Share Pulse
                </button>
            </div>
        </div>
    );
};

export default PulseInput;
