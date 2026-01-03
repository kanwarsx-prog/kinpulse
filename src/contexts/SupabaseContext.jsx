import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const SupabaseContext = createContext({});

export const useSupabase = () => useContext(SupabaseContext);

export const SupabaseProvider = ({ children }) => {
    const [session, setSession] = useState(null);
    const [user, setUser] = useState(null);
    const [currentGroup, setCurrentGroup] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            if (session?.user) {
                fetchUserProfile(session.user.id, session.user.email);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (session?.user) {
                fetchUserProfile(session.user.id, session.user.email);
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchUserProfile = async (userId, userEmail) => {
        console.log('[SupabaseContext] Fetching user profile for:', userId);
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('[SupabaseContext] Profile query error:', error);
                // If query fails, create a minimal user object
                setUser({
                    id: userId,
                    email: userEmail,
                    name: null,
                    family_id: null
                });
                setLoading(false);
                return;
            }

            if (!profile) {
                console.log('[SupabaseContext] Profile not found, creating new profile');
                // Profile doesn't exist, create it
                const { data: newProfile, error: insertError } = await supabase
                    .from('profiles')
                    .insert([{
                        id: userId,
                        email: userEmail
                    }])
                    .select()
                    .maybeSingle();

                if (insertError) {
                    console.error('[SupabaseContext] Profile creation error:', insertError);
                    // Fallback to minimal user
                    setUser({
                        id: userId,
                        email: userEmail,
                        name: null,
                        family_id: null
                    });
                } else {
                    console.log('[SupabaseContext] New profile created:', newProfile);
                    setUser(newProfile);
                }
            } else {
                console.log('[SupabaseContext] Profile loaded:', profile);
                setUser(profile);
                // Load current group
                if (profile.current_group_id) {
                    console.log('[SupabaseContext] Loading current group:', profile.current_group_id);
                    loadCurrentGroup(profile.current_group_id);
                } else {
                    console.log('[SupabaseContext] No current_group_id set');
                }
            }
        } catch (err) {
            console.error('[SupabaseContext] Profile fetch error:', err);
            // Fallback to minimal user object
            setUser({
                id: userId,
                email: userEmail,
                name: null,
                family_id: null
            });
        } finally {
            console.log('[SupabaseContext] Setting loading to false');
            setLoading(false);
        }
    };

    const refreshUser = async () => {
        if (session?.user) {
            await fetchUserProfile(session.user.id, session.user.email);
        }
    };

    const loadCurrentGroup = async (groupId) => {
        try {
            const { data: group } = await supabase
                .from('groups')
                .select('*')
                .eq('id', groupId)
                .single();

            setCurrentGroup(group);
        } catch (error) {
            console.error('Error loading current group:', error);
        }
    };

    const signUp = async (email, password) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin,
            }
        });
        return { data, error };
    };

    const signIn = async (email, password) => {
        return await supabase.auth.signInWithPassword({ email, password });
    };

    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setUser(null);
        setCurrentGroup(null);
    };

    const resetPassword = async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
    };

    const updatePassword = async (newPassword) => {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });
        if (error) throw error;
    };

    const switchGroup = async (groupId) => {
        try {
            // Update user's current_group_id in the database
            const { error } = await supabase
                .from('profiles')
                .update({ current_group_id: groupId })
                .eq('id', user.id);

            if (error) throw error;

            // Load the new group
            await loadCurrentGroup(groupId);

            // Refresh user profile to get updated current_group_id
            await refreshUser();
        } catch (error) {
            console.error('[SupabaseContext] Error switching group:', error);
            throw error;
        }
    };

    return (
        <SupabaseContext.Provider value={{
            supabase,
            session,
            user,
            currentGroup,
            loading,
            signUp,
            signIn,
            signOut,
            refreshUser,
            switchGroup,
            resetPassword,
            updatePassword
        }}>
            {children}
        </SupabaseContext.Provider>
    );
};
