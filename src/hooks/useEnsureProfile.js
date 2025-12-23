import { useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';

export const useEnsureProfile = () => {
    const { supabase, user } = useSupabase();

    useEffect(() => {
        const ensureProfile = async () => {
            if (!user) return;

            // Check if profile exists
            const { data } = await supabase.from('profiles').select('id').eq('id', user.id).single();

            if (!data) {
                // Create basic profile
                const { error } = await supabase.from('profiles').insert({
                    id: user.id,
                    username: user.email?.split('@')[0] || 'Member',
                    avatar_url: null
                });

                if (error) console.error("Error creating profile:", error);
            }
        };

        ensureProfile();
    }, [user, supabase]);
};
