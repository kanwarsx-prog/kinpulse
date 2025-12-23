import React, { createContext, useContext, useState } from 'react';
import './Toast.css';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const showToast = (message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    };

    const success = (message) => showToast(message, 'success');
    const error = (message) => showToast(message, 'error');
    const info = (message) => showToast(message, 'info');

    return (
        <ToastContext.Provider value={{ success, error, info }}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast toast-${toast.type}`}>
                        {toast.type === 'success' && <span className="toast-icon">✓</span>}
                        {toast.type === 'error' && <span className="toast-icon">✕</span>}
                        {toast.type === 'info' && <span className="toast-icon">ℹ</span>}
                        <span className="toast-message">{toast.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
