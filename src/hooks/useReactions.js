import { useEffect, useMemo, useState } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';

export const useReactions = ({ messageId, pulseId }) => {
    const { supabase, user } = useSupabase();
    const [reactions, setReactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!messageId && !pulseId) return;

        fetchReactions();
        const unsubscribe = subscribeToReactions();
        return () => unsubscribe?.();
    }, [messageId, pulseId]);

    const fetchReactions = async () => {
        try {
            const query = supabase
                .from('reactions')
                .select('id, user_id, reaction_type, created_at');

            if (messageId) {
                query.eq('message_id', messageId);
            } else if (pulseId) {
                query.eq('pulse_id', pulseId);
            }

            const { data, error } = await query;

            if (error) throw error;
            setReactions(data || []);
        } catch (error) {
            console.error('Error fetching reactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const subscribeToReactions = () => {
        const channel = supabase
            .channel(`reactions-${messageId || pulseId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'reactions',
                    filter: messageId
                        ? `message_id=eq.${messageId}`
                        : `pulse_id=eq.${pulseId}`
                },
                () => {
                    fetchReactions();
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    };

    const toggleReaction = async (reactionType = '❤️') => {
        if (!user) return;

        const existing = reactions.find((r) => r.user_id === user.id);

        try {
            if (existing && existing.reaction_type === reactionType) {
                // Remove reaction
                await supabase.from('reactions').delete().eq('id', existing.id);
            } else if (existing) {
                // Update to new emoji
                await supabase.from('reactions').update({ reaction_type: reactionType }).eq('id', existing.id);
            } else {
                // Add reaction
                await supabase.from('reactions').insert([
                    {
                        user_id: user.id,
                        family_id: user.family_id,
                        message_id: messageId || null,
                        pulse_id: pulseId || null,
                        reaction_type: reactionType
                    }
                ]);
            }

            // Optimistic update
            fetchReactions();
        } catch (error) {
            console.error('Error toggling reaction:', error);
        }
    };

    const hasUserReacted = reactions.some((r) => r.user_id === user?.id);
    const reactionCount = reactions.length;
    const userReactionType = reactions.find((r) => r.user_id === user?.id)?.reaction_type || null;

    const groupedReactions = useMemo(() => {
        const map = new Map();
        reactions.forEach((r) => {
            const current = map.get(r.reaction_type) || { type: r.reaction_type, count: 0, reacted: false };
            current.count += 1;
            if (r.user_id === user?.id) current.reacted = true;
            map.set(r.reaction_type, current);
        });
        return Array.from(map.values()).sort((a, b) => b.count - a.count);
    }, [reactions, user?.id]);

    return {
        reactions,
        hasUserReacted,
        reactionCount,
        userReactionType,
        groupedReactions,
        toggleReaction,
        loading
    };
};
