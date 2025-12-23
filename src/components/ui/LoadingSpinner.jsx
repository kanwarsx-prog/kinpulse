import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ size = 'md', message = '' }) => {
    const sizeClasses = {
        sm: 'spinner-sm',
        md: 'spinner-md',
        lg: 'spinner-lg'
    };

    return (
        <div className="loading-container">
            <div className={`spinner ${sizeClasses[size]}`}>
                <div className="spinner-circle"></div>
            </div>
            {message && <p className="loading-message">{message}</p>}
        </div>
    );
};

export default LoadingSpinner;
