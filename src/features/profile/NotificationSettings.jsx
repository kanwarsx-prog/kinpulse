import React from 'react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import './NotificationSettings.css';

const NotificationSettings = () => {
    const { permission, subscription, isSupported, requestPermission, unsubscribe } = usePushNotifications();

    if (!isSupported) {
        return (
            <div className="notification-settings">
                <h3>Push Notifications</h3>
                <p className="not-supported">
                    Push notifications are not supported in this browser.
                </p>
            </div>
        );
    }

    return (
        <div className="notification-settings">
            <h3>Push Notifications</h3>
            <p className="description">
                Get notified about new messages, pulses, and family activity
            </p>

            {permission === 'default' && (
                <button className="enable-btn" onClick={requestPermission}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    Enable Notifications
                </button>
            )}

            {permission === 'granted' && subscription && (
                <div className="enabled-state">
                    <div className="status">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span>Notifications enabled</span>
                    </div>
                    <button className="disable-btn" onClick={unsubscribe}>
                        Disable
                    </button>
                </div>
            )}

            {permission === 'denied' && (
                <div className="denied-state">
                    <p>⚠️ Notifications are blocked</p>
                    <p className="help-text">
                        To enable, go to your browser settings and allow notifications for this site.
                    </p>
                </div>
            )}
        </div>
    );
};

export default NotificationSettings;
