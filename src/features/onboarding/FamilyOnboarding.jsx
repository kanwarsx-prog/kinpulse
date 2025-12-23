import React, { useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useNavigate } from 'react-router-dom';
import './FamilyOnboarding.css';

const FamilyOnboarding = () => {
    const { supabase, session, refreshUser } = useSupabase();
    const navigate = useNavigate();

    const [mode, setMode] = useState('menu'); // 'menu', 'create', 'join'
    const [familyName, setFamilyName] = useState('');
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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

    const handleJoin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // 1. Find Family by Code
            const { data: family, error: famError } = await supabase
                .from('families')
                .select('id, name')
                .eq('invite_code', inviteCode.toUpperCase())
                .single();

            if (famError || !family) throw new Error("Invalid invite code");

            // 2. Update Profile
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ family_id: family.id })
                .eq('id', session.user.id);

            if (profileError) throw profileError;

            window.location.reload();

        } catch (err) {
            console.error('Family join error:', err);
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
