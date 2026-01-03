import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import './JoinFamily.css';

export default function JoinFamily() {
    const { inviteCode } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [invitation, setInvitation] = useState(null);
    const [groupName, setGroupName] = useState('');
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        validateInvitation();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inviteCode]);

    const validateInvitation = async () => {
        console.log('[JoinFamily] Starting validation for code:', inviteCode);
        setLoading(true);
        setError('');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            console.log('[JoinFamily] User check:', user ? 'Logged in' : 'Not logged in');
            if (!user) {
                console.log('[JoinFamily] Redirecting to auth with code:', inviteCode);
                navigate(`/auth?redirect=/join/${inviteCode}`);
                return;
            }

            // Get the invitation
            console.log('[JoinFamily] Querying group_invitations for code:', inviteCode.toUpperCase());
            const { data: invite, error: inviteError } = await supabase
                .from('group_invitations')
                .select(`
                    *,
                    groups (
                        id,
                        name,
                        icon
                    )
                `)
                .eq('invite_code', inviteCode.toUpperCase())
                .not('invite_code', 'is', null)
                .eq('is_active', true)
                .maybeSingle();

            console.log('[JoinFamily] Query result:', {
                invite,
                inviteError,
                hasInvite: !!invite,
                inviteGroupId: invite?.group_id,
                inviteGroupName: invite?.groups?.name
            });

            if (inviteError) {
                console.error('[JoinFamily] Database error:', inviteError);
                setError('Error looking up invitation code.');
                setLoading(false);
                return;
            }

            if (!invite) {
                console.error('[JoinFamily] No invitation found for code:', inviteCode.toUpperCase());
                setError('Invalid or expired invitation code.');
                setLoading(false);
                return;
            }

            // Check if user is already a member of this specific group
            const { data: existingMembership } = await supabase
                .from('group_members')
                .select('id')
                .eq('group_id', invite.group_id)
                .eq('user_id', user.id)
                .maybeSingle();

            if (existingMembership) {
                setError('You are already a member of this group.');
                setLoading(false);
                return;
            }

            // Check expiration
            if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
                setError('This invitation has expired.');
                setLoading(false);
                return;
            }

            // Check max uses
            if (invite.max_uses && invite.use_count >= invite.max_uses) {
                setError('This invitation has reached its maximum number of uses.');
                setLoading(false);
                return;
            }

            setInvitation(invite);
            setGroupName(invite.groups?.name || 'this group');
            setLoading(false);
        } catch (err) {
            console.error('Error validating invitation:', err);
            setError('An error occurred while validating the invitation.');
            setLoading(false);
        }
    };

    const handleJoinGroup = async () => {
        setJoining(true);
        setError('');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Add user to group_members
            const { error: memberError } = await supabase
                .from('group_members')
                .insert({
                    group_id: invitation.group_id,
                    user_id: user.id,
                    role: 'member'
                });

            if (memberError) throw memberError;

            // Increment use count if it exists
            if (invitation.use_count !== undefined) {
                const { error: incrementError } = await supabase
                    .from('group_invitations')
                    .update({ use_count: invitation.use_count + 1 })
                    .eq('id', invitation.id);

                if (incrementError) console.error('Error updating use count:', incrementError);
            }

            navigate('/');
        } catch (err) {
            console.error('Error joining group:', err);
            setError('Failed to join group. Please try again.');
            setJoining(false);
        }
    };

    if (loading) {
        return (
            <div className="join-family-container">
                <div className="join-family-card">
                    <div className="join-family-loading">
                        <div className="spinner"></div>
                        <p>Validating invitation...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="join-family-container">
                <div className="join-family-card">
                    <div className="join-family-error">
                        <div className="error-icon">🚫</div>
                        <h2>Invitation Error</h2>
                        <p>{error}</p>
                        <button className="back-button" onClick={() => navigate('/')}>
                            Go to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="join-family-container">
            <div className="join-family-card">
                <div className="join-family-content">
                    <div className="welcome-icon">{invitation.groups?.icon || '🎉'}</div>
                    <h1>You're Invited!</h1>
                    <p className="join-description">
                        You've been invited to join <strong>{groupName}</strong> on KinPulse.
                    </p>

                    <div className="join-info">
                        <p>By joining, you'll be able to:</p>
                        <ul>
                            <li>Share daily pulses with the group</li>
                            <li>Chat and share photos</li>
                            <li>Stay connected in real-time</li>
                        </ul>
                    </div>

                    <button className="join-button" onClick={handleJoinGroup} disabled={joining}>
                        {joining ? 'Joining...' : 'Join Group'}
                    </button>

                    <button className="cancel-button" onClick={() => navigate('/')} disabled={joining}>
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
}

