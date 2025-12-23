import { useEffect, useState } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

export const usePushNotifications = () => {
    const { supabase, user } = useSupabase();
    const [permission, setPermission] = useState(
        typeof Notification !== 'undefined' ? Notification.permission : 'default'
    );
    const [subscription, setSubscription] = useState(null);
    const [isSupported, setIsSupported] = useState(false);

    useEffect(() => {
        // Check if push notifications are supported
        const supported =
            'serviceWorker' in navigator &&
            'PushManager' in window &&
            'Notification' in window;

        setIsSupported(supported);

        if (supported && user) {
            // Register service worker
            navigator.serviceWorker.register('/sw.js')
                .then(registration => {
                    console.log('Service Worker registered:', registration);
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });

            // Check existing subscription
            checkSubscription();
        }
    }, [user]);

    const checkSubscription = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            const sub = await registration.pushManager.getSubscription();
            setSubscription(sub);
        } catch (error) {
            console.error('Error checking subscription:', error);
        }
    };

    const requestPermission = async () => {
        if (!isSupported) {
            alert('Push notifications are not supported in this browser');
            return;
        }

        if (!VAPID_PUBLIC_KEY) {
            console.error('VAPID public key not configured');
            alert('Push notifications are not configured. Please contact support.');
            return;
        }

        try {
            const result = await Notification.requestPermission();
            setPermission(result);

            if (result === 'granted') {
                await subscribeToPush();
            }
        } catch (error) {
            console.error('Permission request error:', error);
        }
    };

    const subscribeToPush = async () => {
        try {
            const registration = await navigator.serviceWorker.ready;

            const sub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            // Save subscription to database
            const subscriptionData = {
                user_id: user.id,
                endpoint: sub.endpoint,
                p256dh: arrayBufferToBase64(sub.getKey('p256dh')),
                auth: arrayBufferToBase64(sub.getKey('auth'))
            };

            const { error } = await supabase
                .from('push_subscriptions')
                .upsert(subscriptionData, {
                    onConflict: 'user_id,endpoint'
                });

            if (error) {
                console.error('Error saving subscription:', error);
            } else {
                setSubscription(sub);
                console.log('Push subscription saved');
            }
        } catch (error) {
            console.error('Push subscription error:', error);
        }
    };

    const unsubscribe = async () => {
        if (!subscription) return;

        try {
            await subscription.unsubscribe();

            await supabase
                .from('push_subscriptions')
                .delete()
                .eq('user_id', user.id)
                .eq('endpoint', subscription.endpoint);

            setSubscription(null);
            console.log('Unsubscribed from push notifications');
        } catch (error) {
            console.error('Unsubscribe error:', error);
        }
    };

    return {
        permission,
        subscription,
        isSupported,
        requestPermission,
        unsubscribe
    };
};

// Helper functions
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}
