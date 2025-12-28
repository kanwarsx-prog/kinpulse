import React from 'react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useSupabase } from '../../contexts/SupabaseContext';
import './NotificationSettings.css';

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const NotificationSettings = () => {
    const { permission, subscription, isSupported, requestPermission, unsubscribe } = usePushNotifications();
    const { supabase, user } = useSupabase();

    const testNotification = async () => {
        if (!user) return;
        try {
            // Functions gateway expects the project anon key as bearer; keep it consistent
            const anon = SUPABASE_ANON_KEY;

            const { error } = await supabase.functions.invoke('send-push-notification', {
                body: {
                    user_id: user.id,
                    title: 'KinPulse Test',
                    body: 'Push notifications are working!',
                    url: '/'
                },
                headers: {
                    ...(anon ? { Authorization: `Bearer ${anon}`, apikey: anon } : {})
                }
            });
            if (error) {
                console.error('Test notification error:', error);
                alert('Failed to send test notification');
            } else {
                alert('Test notification sent. Check your device.');
            }
        } catch (err) {
            console.error('Test notification error:', err);
            alert('Failed to send test notification');
        }
    };

    const handleEnableClick = () => {
        if (!isSupported) {
            alert(
                'Push notifications are not supported on iOS Safari yet. Please try using Chrome or Firefox on desktop, or wait for Apple to add support in a future iOS update.'
            );
            return;
        }
        requestPermission();
    };

    const showEnableButton = !subscription;
    const showEnabledState = subscription && permission === 'granted';

    return (
        <div className="notification-settings">
            <h3>Push Notifications</h3>
            <p className="description">Get notified about new messages, pulses, and family activity</p>

            {showEnableButton && (
                <button className="enable-btn" onClick={handleEnableClick}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    Enable Notifications
                </button>
            )}

            {showEnabledState && (
                <div className="enabled-state">
                    <div className="status">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                        <span>Notifications enabled</span>
                    </div>
                    <div className="actions">
                        <button className="test-btn" onClick={testNotification}>
                            Test
                        </button>
                        <button className="disable-btn" onClick={unsubscribe}>
                            Disable
                        </button>
                    </div>
                </div>
            )}

            {permission === 'denied' && !subscription && (
                <div className="denied-state">
                    <p>Notifications are blocked</p>
                    <p className="help-text">To enable, go to your browser settings and allow notifications for this site.</p>
                </div>
            )}
        </div>
    );
};

export default NotificationSettings;
