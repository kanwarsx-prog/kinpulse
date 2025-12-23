import React, { useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import PulseInput from './PulseInput';
import StatusBadge from '../../components/ui/StatusBadge';
import './PulseDashboard.css';

const PulseDashboard = () => {
    const { supabase, user } = useSupabase();
    const [pulses, setPulses] = useState([]);
    const [profiles, setProfiles] = useState({});
    const [myPulse, setMyPulse] = useState(null);
    const [loading, setLoading] = useState(true);
    const [familyInfo, setFamilyInfo] = useState(null);

    console.log('PulseDashboard: user =', user);

    const fetchPulses = async () => {
        console.log('Fetching pulses for family:', user?.family_id);
        if (!user?.family_id) {
            console.log('No family_id, skipping fetch');
            setLoading(false);
            return;
        }

        // Get family info
        const { data: family } = await supabase
            .from('families')
            .select('*')
            .eq('id', user.family_id)
            .single();

        if (family) {
            setFamilyInfo(family);
        }

        // Get profiles in this family to map names
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('family_id', user.family_id);

        const profileMap = {};
        profileData?.forEach(p => profileMap[p.id] = p);
        setProfiles(profileMap);

        // Get latest pulses for this family
        const { data } = await supabase
            .from('pulses')
            .select('*')
            .eq('family_id', user.family_id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (data) {
            // Deduplicate: show only latest per user
            const latestByUser = {};
            data.forEach(p => {
                if (!latestByUser[p.user_id]) latestByUser[p.user_id] = p;
            });

            setPulses(Object.values(latestByUser));

            if (latestByUser[user.id]) {
                setMyPulse(latestByUser[user.id]);
            }
        }
    };

    useEffect(() => {
        fetchPulses();

        const subscription = supabase
            .channel('public:pulses')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pulses' }, payload => {
                fetchPulses(); // Refresh on new pulse
            })
            .subscribe();

        return () => supabase.removeChannel(subscription);
    }, []);

    const handlePulseSubmit = async (pulseData) => {
        // Optimistic update
        const newPulse = {
            user_id: user.id,
            family_id: user.family_id,
            state: pulseData.state,
            note: pulseData.note,
            created_at: new Date().toISOString()
        };
        setMyPulse(newPulse);

        const { error } = await supabase.from('pulses').insert({
            user_id: user.id,
            family_id: user.family_id,
            state: pulseData.state,
            note: pulseData.note
        });

        if (error) {
            console.error("Pulse submit error:", error);
            alert("Failed to save pulse: " + error.message);
            setMyPulse(null); // Revert optimistic update
        }
    };

    return (
        <div className="pulse-dashboard fade-in">
            <header className="dashboard-header">
                <div className="header-content">
                    <h1>KinPulse</h1>
                    <button
                        className="refresh-btn"
                        onClick={fetchPulses}
                        aria-label="Refresh"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                        </svg>
                    </button>
                </div>
                <p className="subtitle">{familyInfo?.name || 'Family Sync'}</p>
                {familyInfo && (
                    <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>
                        Invite Code: <strong style={{ color: '#6366f1' }}>{familyInfo.invite_code}</strong>
                    </p>
                )}
            </header>

            <section className="my-pulse-section">
                {myPulse ? (
                    <div className="my-status-card">
                        <span className="label">Your Pulse</span>
                        <div className="current-status">
                            <StatusBadge status={myPulse.state} size="lg" />
                        </div>
                        <p className="time">
                            {new Date(myPulse.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <button
                            className="update-btn"
                            onClick={() => setMyPulse(null)}
                        >
                            Update
                        </button>
                    </div>
                ) : (
                    <PulseInput onSubmit={handlePulseSubmit} />
                )}
            </section>

            <section className="family-stream">
                <h3 className="section-title">Family Pulse</h3>
                <div className="family-list">
                    {pulses.map(pulse => {
                        const isMe = pulse.user_id === user.id;
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
                                    <span className="name">
                                        {isMe ? 'You' : (profiles[pulse.user_id]?.name || profiles[pulse.user_id]?.email || 'Family Member')}
                                    </span>
                                    <span className="time">
                                        {new Date(pulse.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <StatusBadge status={pulse.state} />
                            </div>
                        );
                    })}
                    {pulses.length === 0 && (
                        <p style={{ textAlign: 'center', color: '#888', fontSize: '0.8rem' }}>
                            No pulses yet. Share your pulse above!
                        </p>
                    )}
                </div>
            </section>
        </div>
    );
};

export default PulseDashboard;
