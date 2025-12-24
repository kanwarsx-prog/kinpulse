import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useToast } from '../../contexts/ToastContext';
import { usePresence } from '../../hooks/usePresence';
import { useUnreadCounts } from '../../hooks/useUnreadCounts';
import PulseInput from './PulseInput';
import StatusBadge from '../../components/ui/StatusBadge';
import OnlineIndicator from '../../components/ui/OnlineIndicator';
import UnreadBadge from '../../components/ui/UnreadBadge';
import PulseReaction from '../../components/ui/PulseReaction';
import ProfileSettings from '../profile/ProfileSettings';
import ShareInvite from '../family/ShareInvite';
import Avatar from '../../components/ui/Avatar';
import './PulseDashboard.css';

const PulseSkeleton = () => (
    <div className="pulse-dashboard page">
        <div className="page-header">
            <div>
                <div className="page-title">KinPulse</div>
                <p className="page-subtitle">Checking in with your family</p>
            </div>
        </div>
        <div className="section-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div className="skeleton avatar" />
                <div style={{ flex: 1 }}>
                    <div className="skeleton title" style={{ width: '40%', marginBottom: 8 }} />
                    <div className="skeleton text" style={{ width: '60%' }} />
                </div>
            </div>
        </div>
        <div className="section-card">
            {[1, 2, 3].map((i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: i === 3 ? 0 : 12 }}>
                    <div className="skeleton avatar" />
                    <div style={{ flex: 1 }}>
                        <div className="skeleton title" style={{ width: '50%', marginBottom: 8 }} />
                        <div className="skeleton text" style={{ width: '70%', marginBottom: 6 }} />
                        <div className="skeleton text" style={{ width: '40%' }} />
                    </div>
                </div>
            ))}
        </div>
    </div>
);

const PulseDashboard = () => {
    const navigate = useNavigate();
    const { supabase, user } = useSupabase();
    const toast = useToast();
    const { isOnline, onlineCount } = usePresence();
    const { getUnreadForUser, markAsRead } = useUnreadCounts();
    const [pulses, setPulses] = useState([]);
    const [profiles, setProfiles] = useState({});
    const [myPulse, setMyPulse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [familyInfo, setFamilyInfo] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const hasFamily = !!user?.family_id;

    useEffect(() => {
        fetchPulses();
        fetchFamilyInfo();

        const subscription = supabase
            .channel('public:pulses')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pulses' }, () => {
                fetchPulses();
            })
            .subscribe();

        return () => supabase.removeChannel(subscription);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasFamily]);

    useEffect(() => {
        const handleOpenInvite = () => setShowInvite(true);
        const handleOpenSettings = () => setShowSettings(true);
        const handleRefreshEvent = () => handleRefresh();
        window.addEventListener('open-invite', handleOpenInvite);
        window.addEventListener('open-settings', handleOpenSettings);
        window.addEventListener('pulse-refresh', handleRefreshEvent);
        return () => {
            window.removeEventListener('open-invite', handleOpenInvite);
            window.removeEventListener('open-settings', handleOpenSettings);
            window.removeEventListener('pulse-refresh', handleRefreshEvent);
        };
    }, []);

    const fetchFamilyInfo = async () => {
        if (!hasFamily) return;

        const { data: family } = await supabase
            .from('families')
            .select('*')
            .eq('id', user.family_id)
            .single();

        if (family) {
            setFamilyInfo(family);
        }
    };

    const fetchPulses = async () => {
        if (!hasFamily) {
            setLoading(false);
            return;
        }

        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('family_id', user.family_id);

        const profileMap = {};
        profileData?.forEach((p) => (profileMap[p.id] = p));
        setProfiles(profileMap);

        const { data } = await supabase
            .from('pulses')
            .select('*')
            .eq('family_id', user.family_id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (data) {
            const latestByUser = {};
            data.forEach((p) => {
                if (!latestByUser[p.user_id]) latestByUser[p.user_id] = p;
            });

            setPulses(Object.values(latestByUser));

            if (latestByUser[user.id]) {
                setMyPulse(latestByUser[user.id]);
            }
        }
        setLoading(false);
    };

    const handlePulseSubmit = async (pulseData) => {
        const newPulse = {
            user_id: user.id,
            family_id: user.family_id,
            state: pulseData.state,
            note: pulseData.note,
            photo_url: pulseData.photo_url,
            created_at: new Date().toISOString()
        };
        setMyPulse(newPulse);

        const { error } = await supabase.from('pulses').insert({
            user_id: user.id,
            family_id: user.family_id,
            state: pulseData.state,
            note: pulseData.note,
            photo_url: pulseData.photo_url
        });

        if (error) {
            console.error('Pulse submit error:', error);
            toast.error('Failed to save pulse');
            setMyPulse(null);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([fetchPulses(), fetchFamilyInfo()]);
        toast.success('Refreshed');
        setTimeout(() => setRefreshing(false), 400);
    };

    const handleRequestPulse = async () => {
        if (!hasFamily) return;

        setRefreshing(true);

        const { error } = await supabase.from('messages').insert([
            {
                family_id: user.family_id,
                user_id: user.id,
                content: 'Hey family! How are you all feeling? Share your pulse!'
            }
        ]);

        if (!error) {
            await supabase.from('pulse_requests').insert([
                {
                    family_id: user.family_id,
                    requested_by: user.id
                }
            ]);
            toast.success('Pulse request sent');
        } else {
            toast.error('Could not request pulses');
        }

        setRefreshing(false);
    };

    const pulseCards = useMemo(
        () =>
            pulses.map((pulse) => {
                const isMe = pulse.user_id === user.id;
                const profile = profiles[pulse.user_id];
                const displayName = isMe ? 'You' : profile?.name || profile?.email?.split('@')[0] || 'Family Member';
                const unreadCount = !isMe ? getUnreadForUser(pulse.user_id) : 0;

                return (
                    <div
                        key={pulse.id}
                        className={`family-card ${!isMe ? 'clickable' : ''}`}
                        onClick={() => {
                            if (!isMe) {
                                markAsRead(pulse.user_id);
                                navigate(`/chat/${pulse.user_id}`);
                            }
                        }}
                        style={
                            isMe
                                ? {
                                      backgroundColor: 'var(--color-primary-soft)',
                                      border: '2px solid var(--color-primary)'
                                  }
                                : {}
                        }
                    >
                        {unreadCount > 0 && (
                            <div className="pulse-card-badge">
                                <UnreadBadge count={unreadCount} />
                            </div>
                        )}
                        <div className="member-info">
                            <div className="name-with-status">
                                <Avatar name={profile?.name} email={profile?.email} isOnline={!isMe && isOnline(pulse.user_id)} />
                                <span className="name">{displayName}</span>
                            </div>
                            <span className="time">
                                {new Date(pulse.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {pulse.note && <p className="pulse-note">{pulse.note}</p>}
                            {pulse.photo_url && (
                                <img
                                    src={pulse.photo_url}
                                    alt="Pulse"
                                    className="pulse-photo"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        window.open(pulse.photo_url, '_blank');
                                    }}
                                />
                            )}
                        </div>
                        <div className="pulse-card-footer">
                            <StatusBadge status={pulse.state} />
                            <PulseReaction pulseId={pulse.id} />
                        </div>
                    </div>
                );
            }),
        [pulses, profiles, user?.id, getUnreadForUser, markAsRead, navigate, isOnline]
    );

    if (loading) {
        return <PulseSkeleton />;
    }

    return (
        <div className="pulse-dashboard page fade-in">
            <section className="family-stream">
                <div className="section-header">
                    <h3 className="section-title">Family Pulse</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="request-pulse-btn" onClick={() => navigate('/pulse-history')}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            History
                        </button>
                        <button className="request-pulse-btn" onClick={handleRequestPulse} disabled={refreshing}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                            </svg>
                            Request pulses
                        </button>
                    </div>
                </div>
                <div className="family-list">
                    {pulseCards}
                    {pulses.length === 0 && (
                        <div className="empty-state">
                            <h3>No pulses yet</h3>
                            <p>Share your pulse below to start the check-in.</p>
                        </div>
                    )}
                </div>
            </section>

            <section className="my-pulse-section">
                {myPulse ? (
                    <div className="my-status-compact">
                        <div className="compact-header">
                            <span className="label">Your Pulse</span>
                            <button className="update-btn-small" onClick={() => setMyPulse(null)}>
                                Update
                            </button>
                        </div>
                        <div className="compact-content">
                            <StatusBadge status={myPulse.state} />
                            <span className="time">
                                {new Date(myPulse.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>
                ) : (
                    <PulseInput onSubmit={handlePulseSubmit} />
                )}
            </section>

            {showSettings && <ProfileSettings onClose={() => setShowSettings(false)} />}

            {showInvite && <ShareInvite isOpen={showInvite} onClose={() => setShowInvite(false)} />}
        </div>
    );
};

export default PulseDashboard;
