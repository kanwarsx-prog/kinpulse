import { useEffect, useState } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';

export const useUnreadCounts = () => {
    const { supabase, user } = useSupabase();
    const [groupChatUnread, setGroupChatUnread] = useState(0);
    const [dmUnreadCounts, setDmUnreadCounts] = useState({}); // { userId: count }
    const [totalUnread, setTotalUnread] = useState(0);

    useEffect(() => {
        if (!user?.family_id) return;

        // Initial fetch
        fetchUnreadCounts();

        // Subscribe to real-time updates
        const subscription = supabase
            .channel('unread-messages')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'messages',
                    filter: `family_id=eq.${user.family_id}`
                },
                () => {
                    fetchUnreadCounts();
                }
            )
            .subscribe();

        return () => {
            subscription.unsubscribe();
        };
    }, [user?.family_id]);

    const fetchUnreadCounts = async () => {
        if (!user?.family_id) return;

        try {
            // Fetch group chat unread count
            const { count: groupCount } = await supabase
                .from('messages')
                .select('*', { count: 'exact', head: true })
                .eq('family_id', user.family_id)
                .is('recipient_id', null)
                .neq('sender_id', user.id)
                .eq('is_read', false);

            setGroupChatUnread(groupCount || 0);

            // Fetch DM unread counts per user
            const { data: dmMessages } = await supabase
                .from('messages')
                .select('sender_id')
                .eq('family_id', user.family_id)
                .eq('recipient_id', user.id)
                .eq('is_read', false);

            // Count messages per sender
            const counts = {};
            (dmMessages || []).forEach(msg => {
                counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
            });

            setDmUnreadCounts(counts);

            // Calculate total
            const dmTotal = Object.values(counts).reduce((sum, count) => sum + count, 0);
            setTotalUnread((groupCount || 0) + dmTotal);

        } catch (error) {
            console.error('Error fetching unread counts:', error);
        }
    };

    const getUnreadForUser = (userId) => {
        return dmUnreadCounts[userId] || 0;
    };

    const markAsRead = async (senderId = null) => {
        if (!user?.family_id) return;

        try {
            if (senderId) {
                // Mark DMs from specific user as read
                await supabase
                    .from('messages')
                    .update({ is_read: true })
                    .eq('family_id', user.family_id)
                    .eq('recipient_id', user.id)
                    .eq('sender_id', senderId)
                    .eq('is_read', false);
            } else {
                // Mark group chat as read
                await supabase
                    .from('messages')
                    .update({ is_read: true })
                    .eq('family_id', user.family_id)
                    .is('recipient_id', null)
                    .neq('sender_id', user.id)
                    .eq('is_read', false);
            }

            // Refresh counts
            fetchUnreadCounts();
        } catch (error) {
            console.error('Error marking messages as read:', error);
        }
    };

    return {
        groupChatUnread,
        dmUnreadCounts,
        totalUnread,
        getUnreadForUser,
        markAsRead,
        refresh: fetchUnreadCounts
    };
};
