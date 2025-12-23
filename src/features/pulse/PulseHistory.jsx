import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../../contexts/SupabaseContext';
import StatusBadge from '../../components/ui/StatusBadge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import './PulseHistory.css';

const PulseHistory = () => {
    const { supabase, user } = useSupabase();
    const navigate = useNavigate();
    const [pulses, setPulses] = useState([]);
    const [profiles, setProfiles] = useState({});
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('7'); // 7, 30, or 'all'
    const [selectedMember, setSelectedMember] = useState('all');

    useEffect(() => {
        fetchHistory();
    }, [dateRange, selectedMember]);

    const fetchHistory = async () => {
        setLoading(true);

        // Fetch profiles
        const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('family_id', user.family_id);

        const profileMap = {};
        profileData?.forEach(p => profileMap[p.id] = p);
        setProfiles(profileMap);

        // Calculate date filter
        let query = supabase
            .from('pulses')
            .select('*')
            .eq('family_id', user.family_id)
            .order('created_at', { ascending: false });

        if (dateRange !== 'all') {
            const daysAgo = new Date();
            daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));
            query = query.gte('created_at', daysAgo.toISOString());
        }

        if (selectedMember !== 'all') {
            query = query.eq('user_id', selectedMember);
        }

        const { data } = await query;
        setPulses(data || []);
        setLoading(false);
    };

    const groupByDate = (pulses) => {
        const groups = {};
        pulses.forEach(pulse => {
            const date = new Date(pulse.created_at).toLocaleDateString();
            if (!groups[date]) groups[date] = [];
            groups[date].push(pulse);
        });
        return groups;
    };

    const groupedPulses = groupByDate(pulses);

    return (
        <div className="pulse-history">
            <header className="history-header">
                <button className="back-btn" onClick={() => navigate(-1)}>
                    ← Back
                </button>
                <h1>Pulse History</h1>
            </header>

            <div className="filters">
                <div className="filter-group">
                    <label>Time Range</label>
                    <select value={dateRange} onChange={(e) => setDateRange(e.target.value)}>
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="all">All time</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label>Family Member</label>
                    <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)}>
                        <option value="all">Everyone</option>
                        {Object.values(profiles).map(profile => (
                            <option key={profile.id} value={profile.id}>
                                {profile.id === user.id ? 'You' : (profile.name || profile.email?.split('@')[0])}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <LoadingSpinner size="md" message="Loading history..." />
            ) : (
                <div className="timeline">
                    {Object.keys(groupedPulses).length === 0 ? (
                        <div className="empty-state">
                            <p>No pulses found for this time range</p>
                        </div>
                    ) : (
                        Object.entries(groupedPulses).map(([date, datePulses]) => (
                            <div key={date} className="timeline-day">
                                <div className="date-header">{date}</div>
                                <div className="day-pulses">
                                    {datePulses.map(pulse => {
                                        const profile = profiles[pulse.user_id];
                                        const isMe = pulse.user_id === user.id;
                                        return (
                                            <div key={pulse.id} className="history-pulse">
                                                <div className="pulse-time">
                                                    {new Date(pulse.created_at).toLocaleTimeString([], {
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </div>
                                                <div className="pulse-content">
                                                    <div className="pulse-header">
                                                        <span className="pulse-name">
                                                            {isMe ? 'You' : (profile?.name || profile?.email?.split('@')[0] || 'Family')}
                                                        </span>
                                                        <StatusBadge status={pulse.state} />
                                                    </div>
                                                    {pulse.note && (
                                                        <p className="pulse-note">{pulse.note}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default PulseHistory;
