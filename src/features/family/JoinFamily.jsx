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
    const [familyName, setFamilyName] = useState('');
    const [joining, setJoining] = useState(false);

    useEffect(() => {
        validateInvitation();
    }, [inviteCode]);

    const validateInvitation = async () => {
        setLoading(true);
        setError('');

        try {
            // Check if user is authenticated
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                // Redirect to auth with return URL
                navigate(`/auth?redirect=/join/${inviteCode}`);
                return;
            }

            // Check if user already has a family
            const { data: profile } = await supabase
                .from('profiles')
                .select('family_id')
                .eq('id', user.id)
                .single();

            if (profile?.family_id) {
                setError('You are already part of a family. Please leave your current family first.');
                setLoading(false);
                return;
            }

            // Validate invitation code
            const { data: invite, error: inviteError } = await supabase
                .from('family_invitations')
                .select(`
          *,
          families (
            id,
            name
          )
        `)
                .eq('invite_code', inviteCode.toUpperCase())
                .eq('is_active', true)
                .single();

            if (inviteError || !invite) {
                setError('Invalid or expired invitation code.');
                setLoading(false);
                return;
            }

            // Check expiration
            if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
                setError('This invitation has expired.');
                setLoading(false);
                return;
            }

            // Check usage limit
            if (invite.max_uses && invite.use_count >= invite.max_uses) {
                setError('This invitation has reached its maximum number of uses.');
                setLoading(false);
                return;
            }

            setInvitation(invite);
            setFamilyName(invite.families?.name || 'this family');
            setLoading(false);
        } catch (err) {
            console.error('Error validating invitation:', err);
            setError('An error occurred while validating the invitation.');
            setLoading(false);
        }
    };

    const handleJoinFamily = async () => {
        setJoining(true);
        setError('');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Update user's family_id
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ family_id: invitation.family_id })
                .eq('id', user.id);

            if (updateError) throw updateError;

            // Increment invitation use count
            const { error: incrementError } = await supabase
                .from('family_invitations')
                .update({ use_count: invitation.use_count + 1 })
                .eq('id', invitation.id);

            if (incrementError) console.error('Error updating use count:', incrementError);

            // Redirect to dashboard
            navigate('/');
        } catch (err) {
            console.error('Error joining family:', err);
            setError('Failed to join family. Please try again.');
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
                        <div className="error-icon">⚠️</div>
                        <h2>Invitation Error</h2>
                        <p>{error}</p>
                        <button
                            className="back-button"
                            onClick={() => navigate('/')}
                        >
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
                    <div className="welcome-icon">👨‍👩‍👧‍👦</div>
                    <h1>You're Invited!</h1>
                    <p className="join-description">
                        You've been invited to join <strong>{familyName}</strong> on KinPulse.
                    </p>

                    <div className="join-info">
                        <p>By joining, you'll be able to:</p>
                        <ul>
                            <li>Share daily pulses with your family</li>
                            <li>Chat and share photos</li>
                            <li>Stay connected in real-time</li>
                        </ul>
                    </div>

                    <button
                        className="join-button"
                        onClick={handleJoinFamily}
                        disabled={joining}
                    >
                        {joining ? 'Joining...' : 'Join Family'}
                    </button>

                    <button
                        className="cancel-button"
                        onClick={() => navigate('/')}
                        disabled={joining}
                    >
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
}
