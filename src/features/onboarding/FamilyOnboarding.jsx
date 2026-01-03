import React, { useState, useEffect } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './FamilyOnboarding.css';

const FamilyOnboarding = () => {
    const { supabase, session, refreshUser } = useSupabase();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const [mode, setMode] = useState('menu'); // 'menu', 'create', 'join'
    const [familyName, setFamilyName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Auto-join if there's an invite code in the redirect URL
    useEffect(() => {
        console.log('[FamilyOnboarding] Checking for redirect parameter');
        const redirect = searchParams.get('redirect');
        console.log('[FamilyOnboarding] Redirect value:', redirect);
        if (redirect && redirect.includes('/join/')) {
            const code = redirect.split('/join/')[1];
            console.log('[FamilyOnboarding] Extracted invite code:', code);
            if (code) {
                // Auto-join with the code
                setInviteCode(code);
                setMode('join');
                console.log('[FamilyOnboarding] Triggering auto-join in 100ms');
                // Trigger auto-join
                setTimeout(() => {
                    console.log('[FamilyOnboarding] Executing auto-join');
                    handleJoin(null, code);
                }, 100);
            }
        } else {
            console.log('[FamilyOnboarding] No redirect or no invite code in redirect');
        }
    }, [searchParams]);

    const handleCreate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Generate random 6-char code
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();

        try {
            // 1. Create Family
            const { data: family, error: famError } = await supabase
                .from('families')
                .insert([{
                    name: familyName,
                    invite_code: code,
                    created_by: session.user.id
                }])
                .select()
                .single();

            if (famError) throw famError;

            // 2. Update Profile with Family ID
            const { data: updatedProfile, error: profileError } = await supabase
                .from('profiles')
                .update({ family_id: family.id })
                .eq('id', session.user.id)
                .select()
                .single();

            if (profileError) throw profileError;

            console.log('Family created successfully:', family);
            console.log('Profile updated:', updatedProfile);

            // Refresh user context to get updated profile
            await refreshUser();

            // Navigate to home
            navigate('/');

        } catch (err) {
            console.error('Family creation error:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    const handleJoin = async (e, autoCode = null) => {
        if (e) e.preventDefault();
        const codeToUse = autoCode || inviteCode;
        console.log('[FamilyOnboarding handleJoin] Starting with code:', codeToUse);
        setLoading(true);
        setError(null);

        try {
            // 1. Find Group by Invite Code
            console.log('[FamilyOnboarding handleJoin] Querying for code:', codeToUse.toUpperCase());
            const { data: invite, error: inviteError } = await supabase
                .from('group_invitations')
                .select('group_id, groups(id, name)')
                .eq('invite_code', codeToUse.toUpperCase())
                .not('invite_code', 'is', null)
                .eq('is_active', true)
                .maybeSingle();

            console.log('[FamilyOnboarding handleJoin] Query result:', {
                invite,
                inviteError,
                hasInvite: !!invite,
                groupId: invite?.group_id
            });

            if (inviteError || !invite) {
                console.error('[FamilyOnboarding handleJoin] Error or no invite:', inviteError);
                throw new Error("Invalid invite code");
            }

            console.log('[FamilyOnboarding handleJoin] Adding user to group:', invite.group_id);

            // 2. Add user to group_members
            const { error: memberError } = await supabase
                .from('group_members')
                .insert({
                    group_id: invite.group_id,
                    user_id: session.user.id,
                    role: 'member'
                });

            if (memberError) {
                console.error('[FamilyOnboarding handleJoin] Member insert error:', memberError);
                throw memberError;
            }

            // 3. Update profile's current_group_id
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ current_group_id: invite.group_id })
                .eq('id', session.user.id);

            if (profileError) {
                console.error('[FamilyOnboarding handleJoin] Profile update error:', profileError);
                throw profileError;
            }

            console.log('[FamilyOnboarding handleJoin] Success! Reloading...');
            window.location.reload();

        } catch (err) {
            console.error('Group join error:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    if (mode === 'menu') {
        return (
            <div className="onboarding-screen">
                <div className="onboarding-card">
                    <h1>Welcome Home</h1>
                    <p>Let's get you settled.</p>
                    <button onClick={() => setMode('create')}>Create New Family</button>
                    <button onClick={() => setMode('join')}>Join Existing Family</button>
                </div>
            </div>
        );
    }

    if (mode === 'create') {
        return (
            <div className="onboarding-screen">
                <div className="onboarding-card">
                    <h2>Create Your Family</h2>
                    <form onSubmit={handleCreate}>
                        <input
                            type="text"
                            placeholder="Family Name"
                            value={familyName}
                            onChange={(e) => setFamilyName(e.target.value)}
                            required
                        />
                        <button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Family'}
                        </button>
                        <button type="button" onClick={() => setMode('menu')}>
                            Cancel
                        </button>
                    </form>
                    {error && <p className="error">{error}</p>}
                </div>
            </div>
        );
    }

    if (mode === 'join') {
        return (
            <div className="onboarding-screen">
                <div className="onboarding-card">
                    <h2>Join a Family</h2>
                    <form onSubmit={handleJoin}>
                        <input
                            type="text"
                            placeholder="Invite Code"
                            value={inviteCode}
                            onChange={(e) => setInviteCode(e.target.value)}
                            required
                        />
                        <button type="submit" disabled={loading}>
                            {loading ? 'Joining...' : 'Join Family'}
                        </button>
                        <button type="button" onClick={() => setMode('menu')}>
                            Cancel
                        </button>
                    </form>
                    {error && <p className="error">{error}</p>}
                </div>
            </div>
        );
    }
};

export default FamilyOnboarding;
