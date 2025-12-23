import { useEffect, useState } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';

export const usePresence = () => {
    const { supabase, user } = useSupabase();
    const [onlineUsers, setOnlineUsers] = useState([]);
    const [channel, setChannel] = useState(null);

    useEffect(() => {
        if (!user?.family_id) return;

        const familyChannel = supabase.channel(`family:${user.family_id}`, {
            config: { presence: { key: user.id } }
        });

        // Track presence
        familyChannel
            .on('presence', { event: 'sync' }, () => {
                const state = familyChannel.presenceState();
                const users = Object.keys(state).map(userId => ({
                    id: userId,
                    ...state[userId][0]
                }));
                setOnlineUsers(users);
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await familyChannel.track({
                        user_id: user.id,
                        online_at: new Date().toISOString()
                    });
                }
            });

        setChannel(familyChannel);

        return () => {
            familyChannel.unsubscribe();
        };
    }, [user?.family_id]);

    const isOnline = (userId) => {
        return onlineUsers.some(u => u.id === userId);
    };

    const onlineCount = onlineUsers.length;

    return { onlineUsers, isOnline, onlineCount };
};
