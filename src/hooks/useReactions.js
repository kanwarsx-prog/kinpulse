import { useEffect, useState } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';

export const useReactions = ({ messageId, pulseId }) => {
    const { supabase, user } = useSupabase();
    const [reactions, setReactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const validMessageId = messageId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(messageId);

    useEffect(() => {
        if (!messageId && !pulseId) return;
        if (messageId && !validMessageId) {
            setLoading(false);
            return;
        }

        fetchReactions();
        subscribeToReactions();

        return () => {
            // Cleanup subscription
        };
    }, [messageId, pulseId, validMessageId]);

    const fetchReactions = async () => {
        try {
            if (messageId && !validMessageId) {
                setLoading(false);
                return;
            }
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

    const toggleReaction = async () => {
        if (!user || (messageId && !validMessageId)) return;

        const hasReacted = reactions.some(r => r.user_id === user.id);

        try {
            if (hasReacted) {
                // Remove reaction
                const reaction = reactions.find(r => r.user_id === user.id);
                await supabase
                    .from('reactions')
                    .delete()
                    .eq('id', reaction.id);
            } else {
                // Add reaction
                await supabase
                    .from('reactions')
                    .insert([{
                        user_id: user.id,
                        family_id: user.family_id,
                        message_id: messageId || null,
                        pulse_id: pulseId || null,
                        reaction_type: 'heart'
                    }]);
            }

            // Optimistic update
            fetchReactions();
        } catch (error) {
            console.error('Error toggling reaction:', error);
        }
    };

    const hasUserReacted = reactions.some(r => r.user_id === user?.id);
    const reactionCount = reactions.length;

    return {
        reactions,
        hasUserReacted,
        reactionCount,
        toggleReaction,
        loading
    };
};
