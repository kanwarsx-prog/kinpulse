import { useState, useEffect } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import './ShareInvite.css';

export default function ShareInvite({ isOpen, onClose }) {
    const { supabase, user, currentGroup } = useSupabase();
    const [inviteCode, setInviteCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && currentGroup?.id) {
            loadOrCreateInvite();
        }
    }, [isOpen, currentGroup?.id]);

    const generateInviteCode = () => {
        // Generate a random 8-character code
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    };

    const loadOrCreateInvite = async () => {
        setLoading(true);
        setError('');

        try {
            if (!user?.id) throw new Error('Not authenticated');
            if (!currentGroup?.id) throw new Error('No group selected');

            // Check for existing active invitation for this group
            const { data: existingInvite } = await supabase
                .from('group_invitations')
                .select('invite_code')
                .eq('group_id', currentGroup.id)
                .eq('is_active', true)
                .not('invite_code', 'is', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (existingInvite && existingInvite.invite_code) {
                setInviteCode(existingInvite.invite_code);
            } else {
                // Create new invitation
                const newCode = generateInviteCode();
                const { error: insertError } = await supabase
                    .from('group_invitations')
                    .insert({
                        group_id: currentGroup.id,
                        invite_code: newCode,
                        inviter_id: user.id,
                        expires_at: null, // No expiration
                        max_uses: null, // Unlimited uses
                        is_active: true
                    });

                if (insertError) throw insertError;
                setInviteCode(newCode);
            }
        } catch (err) {
            console.error('Error loading invite:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getInviteLink = () => {
        const baseUrl = window.location.origin;
        return `${baseUrl}/join/${inviteCode}`;
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(getInviteLink());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const shareViaWhatsApp = () => {
        const groupName = currentGroup?.name || 'our group';
        const message = encodeURIComponent(
            `Join ${groupName} on KinPulse! ${getInviteLink()}`
        );
        window.open(`https://wa.me/?text=${message}`, '_blank');
    };

    const shareViaSMS = () => {
        const groupName = currentGroup?.name || 'our group';
        const message = encodeURIComponent(
            `Join ${groupName} on KinPulse! ${getInviteLink()}`
        );
        window.location.href = `sms:?body=${message}`;
    };

    const shareViaEmail = () => {
        const groupName = currentGroup?.name || 'our group';
        const subject = encodeURIComponent(`Join ${groupName} on KinPulse`);
        const body = encodeURIComponent(
            `You've been invited to join ${groupName} on KinPulse!\n\nClick this link to join: ${getInviteLink()}`
        );
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
    };

    return !isOpen ? null : (
        <div className="share-invite-overlay" onClick={onClose}>
            <div className="share-invite-modal" onClick={(e) => e.stopPropagation()}>
                <div className="share-invite-header">
                    <h2>Invite to {currentGroup?.icon} {currentGroup?.name || 'Group'}</h2>
                    <button className="close-button" onClick={onClose}>×</button>
                </div>

                {loading ? (
                    <div className="share-invite-loading">Loading...</div>
                ) : error ? (
                    <div className="share-invite-error">{error}</div>
                ) : (
                    <div className="share-invite-content">
                        <p className="share-invite-description">
                            Share this link to invite people to join {currentGroup?.name || 'this group'} on KinPulse.
                        </p>

                        <div className="invite-code-display">
                            <div className="invite-code">{inviteCode}</div>
                            <div className="invite-link">{getInviteLink()}</div>
                        </div>

                        <button
                            className="copy-button"
                            onClick={copyToClipboard}
                        >
                            {copied ? '✓ Copied!' : 'Copy Link'}
                        </button>

                        <div className="share-options">
                            <p className="share-label">Share via:</p>
                            <div className="share-buttons">
                                <button className="share-button whatsapp" onClick={shareViaWhatsApp}>
                                    <span className="share-icon">💬</span>
                                    WhatsApp
                                </button>
                                <button className="share-button sms" onClick={shareViaSMS}>
                                    <span className="share-icon">📱</span>
                                    SMS
                                </button>
                                <button className="share-button email" onClick={shareViaEmail}>
                                    <span className="share-icon">✉️</span>
                                    Email
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

