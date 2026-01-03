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
        try {
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('Profile query error:', error);
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
                    console.error('Profile creation error:', insertError);
                    // Fallback to minimal user
                    setUser({
                        id: userId,
                        email: userEmail,
                        name: null,
                        family_id: null
                    });
                } else {
                    setUser(newProfile);
                }
            } else {
                setUser(profile);
                // Load current group
                if (profile.current_group_id) {
                    loadCurrentGroup(profile.current_group_id);
                }
            }
        } catch (err) {
            console.error('Profile fetch error:', err);
            // Fallback to minimal user object
            setUser({
                id: userId,
                email: userEmail,
                name: null,
                family_id: null
            });
        } finally {
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

    const signOut = () => supabase.auth.signOut();

    const value = {
        supabase,
        session,
        user,
        currentGroup,
        setCurrentGroup,
        loadCurrentGroup,
        loading,
        signUp,
        signIn,
        signOut,
        refreshUser,
    };

    return (
        <SupabaseContext.Provider value={value}>
            {children}
        </SupabaseContext.Provider>
    );
};
