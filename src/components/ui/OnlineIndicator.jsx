import React from 'react';
import './OnlineIndicator.css';

const OnlineIndicator = ({ isOnline, size = 'sm' }) => {
    return (
        <div className={`online-indicator ${size} ${isOnline ? 'online' : 'offline'}`}>
            <div className="dot"></div>
        </div>
    );
};

export default OnlineIndicator;
