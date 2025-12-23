import React, { useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useToast } from '../../contexts/ToastContext';
import PulseInput from './PulseInput';
import StatusBadge from '../../components/ui/StatusBadge';
import ProfileSettings from '../profile/ProfileSettings';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import './PulseDashboard.css';

const PulseDashboard = () => {
    const { supabase, user } = useSupabase();
    const toast = useToast();
    const [pulses, setPulses] = useState([]);
    const [profiles, setProfiles] = useState({});
    const [myPulse, setMyPulse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [familyInfo, setFamilyInfo] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    const fetchFamilyInfo = async () => {
        if (!user?.family_id) return;

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
        if (!user?.family_id) {
            setLoading(false);
            return;
        }

        // Get profiles in this family
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('family_id', user.family_id);

        const profileMap = {};
        profileData?.forEach(p => profileMap[p.id] = p);
        setProfiles(profileMap);

        // Get latest pulses
        const { data } = await supabase
            .from('pulses')
            .select('*')
            .eq('family_id', user.family_id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (data) {
            const latestByUser = {};
            data.forEach(p => {
                if (!latestByUser[p.user_id]) latestByUser[p.user_id] = p;
            });

            setPulses(Object.values(latestByUser));

            if (latestByUser[user.id]) {
                setMyPulse(latestByUser[user.id]);
            }
        }
        setLoading(false);
    };

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
    }, []);

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
            console.error("Pulse submit error:", error);
            alert("Failed to save pulse: " + error.message);
            setMyPulse(null);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await Promise.all([
            fetchPulses(),
            fetchFamilyInfo()
        ]);
        toast.success('Refreshed!');
        setTimeout(() => setRefreshing(false), 500);
    };

    const handleRequestPulse = async () => {
        if (!user?.family_id) return;

        setRefreshing(true);

        const { error } = await supabase
            .from('messages')
            .insert([{
                family_id: user.family_id,
                user_id: user.id,
                content: '👋 Hey family! How are you all feeling? Share your pulse!'
            }]);

        if (!error) {
            await supabase
                .from('pulse_requests')
                .insert([{
                    family_id: user.family_id,
                    requested_by: user.id
                }]);
        }

        setRefreshing(false);
    };

    if (loading) {
        return <LoadingSpinner size="md" message="Loading your family pulse..." />;
    }

    return (
        <div className="pulse-dashboard fade-in">
            <header className="dashboard-header">
                <div className="header-content">
                    <h1>KinPulse</h1>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            className="refresh-btn"
                            onClick={handleRefresh}
                            disabled={refreshing}
                            aria-label="Refresh"
                            style={{ transform: refreshing ? 'rotate(360deg)' : 'rotate(0deg)', transition: 'transform 0.5s ease' }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                            </svg>
                        </button>
                        <button
                            className="refresh-btn"
                            onClick={() => setShowSettings(true)}
                            aria-label="Settings"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M12 1v6m0 6v6" />
                            </svg>
                        </button>
                    </div>
                </div>
                <p className="subtitle">{familyInfo?.name || 'Family Sync'}</p>
                {familyInfo && (
                    <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>
                        Invite Code: <strong style={{ color: '#6366f1' }}>{familyInfo.invite_code}</strong>
                    </p>
                )}
            </header>

            <section className="family-stream">
                <div className="section-header">
                    <h3 className="section-title">Family Pulse</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            className="request-pulse-btn"
                            onClick={() => window.location.href = '/pulse-history'}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            History
                        </button>
                        <button
                            className="request-pulse-btn"
                            onClick={handleRequestPulse}
                            disabled={refreshing}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                            </svg>
                            Request
                        </button>
                    </div>
                </div>
                <div className="family-list">
                    {pulses.map(pulse => {
                        const isMe = pulse.user_id === user.id;
                        const profile = profiles[pulse.user_id];
                        const displayName = isMe ? 'You' : (profile?.name || profile?.email?.split('@')[0] || 'Family Member');

                        return (
                            <div
                                key={pulse.id}
                                className="family-card"
                                style={isMe ? {
                                    backgroundColor: '#f0f0ff',
                                    border: '2px solid #6366f1'
                                } : {}}
                            >
                                <div className="member-info">
                                    <span className="name">{displayName}</span>
                                    <span className="time">
                                        {new Date(pulse.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {pulse.note && <p className="pulse-note">{pulse.note}</p>}
                                    {pulse.photo_url && (
                                        <img
                                            src={pulse.photo_url}
                                            alt="Pulse photo"
                                            className="pulse-photo"
                                            onClick={() => window.open(pulse.photo_url, '_blank')}
                                        />
                                    )}
                                </div>
                                <StatusBadge status={pulse.state} />
                            </div>
                        );
                    })}
                    {pulses.length === 0 && (
                        <p style={{ textAlign: 'center', color: '#888', fontSize: '0.8rem' }}>
                            No pulses yet. Share your pulse below!
                        </p>
                    )}
                </div>
            </section>

            <section className="my-pulse-section">
                {myPulse ? (
                    <div className="my-status-compact">
                        <div className="compact-header">
                            <span className="label">Your Pulse</span>
                            <button
                                className="update-btn-small"
                                onClick={() => setMyPulse(null)}
                            >
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

            {showSettings && (
                <ProfileSettings onClose={() => setShowSettings(false)} />
            )}
        </div>
    );
};

export default PulseDashboard;
