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
import FitnessWidget from './FitnessWidget';
import StoryCarousel from './StoryCarousel';
import './PulseDashboard.css';
import './FitnessWidget.css';

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
    const [myPulseHistory, setMyPulseHistory] = useState([]);
    const [fitnessToday, setFitnessToday] = useState(null);
    const [loading, setLoading] = useState(true);
    const [familyInfo, setFamilyInfo] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showInvite, setShowInvite] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [showPulseReminder, setShowPulseReminder] = useState(false);
    const [showPulseForm, setShowPulseForm] = useState(false);
    const pulseFormRef = React.useRef(null);
    const [showStories, setShowStories] = useState(false);
    const [historyUser, setHistoryUser] = useState(null);
    const [historyItems, setHistoryItems] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    const hasFamily = !!user?.family_id;

    const lastPulseDate = myPulse?.created_at ? new Date(myPulse.created_at) : null;
    const stalePulse = !lastPulseDate || Date.now() - lastPulseDate.getTime() > 24 * 60 * 60 * 1000;
    const recentMood = myPulseHistory?.[0]?.state;
    const lowActivity = fitnessToday && (fitnessToday.steps || 0) < 2000;
    const showSmartNudge = stalePulse || lowActivity;

    useEffect(() => {
        fetchPulses();
        fetchFamilyInfo();
        fetchMyHistory();
        fetchFitness();

        const subscription = supabase
            .channel('public:pulses')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pulses' }, () => {
                fetchPulses();
                fetchMyHistory();
            })
            .subscribe();

        return () => supabase.removeChannel(subscription);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hasFamily]);

    useEffect(() => {
        fetchMyHistory();
        fetchFitness();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

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

    const fetchMyHistory = async () => {
        if (!user?.id) return;
        const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
        const { data } = await supabase
            .from('pulses')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', since)
            .order('created_at', { ascending: false })
            .limit(30);
        if (data) setMyPulseHistory(data);
    };

    const fetchFitness = async () => {
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user;
        if (!sessionUser?.id) return;

        const today = new Date().toISOString().slice(0, 10);
        const { data, error } = await supabase
            .from('fitness_metrics')
            .select('*')
            .eq('user_id', sessionUser.id)
            .eq('metric_date', today)
            .maybeSingle();
        if (error && error.code !== 'PGRST116') {
            console.error('Fitness fetch error', error);
        }
        if (data) setFitnessToday(data);
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

            // Include everyone, even without a pulse yet
            const withPlaceholders = Object.keys(profileMap).map((id) => {
                if (latestByUser[id]) return latestByUser[id];
                return {
                    id: `placeholder-${id}`,
                    user_id: id,
                    family_id: user.family_id,
                    state: null,
                    note: null,
                    created_at: null
                };
            });

            // sort by recency, placeholders last
            withPlaceholders.sort((a, b) => {
                if (a.created_at && b.created_at) {
                    return new Date(b.created_at) - new Date(a.created_at);
                }
                if (a.created_at) return -1;
                if (b.created_at) return 1;
                return 0;
            });

            setPulses(withPlaceholders);

            if (latestByUser[user.id]) {
                setMyPulse(latestByUser[user.id]);
            }
        }
        setLoading(false);
    };

    useEffect(() => {
        if (loading || !user) return;
        const last = myPulse?.created_at ? new Date(myPulse.created_at) : null;
        const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;
        const stale = !last || last.getTime() < twentyFourHoursAgo;
        setShowPulseReminder(stale);

        if (stale) {
            const todayKey = `kp_pulse_reminder_${user.id}_${new Date().toISOString().slice(0, 10)}`;
            if (typeof localStorage !== 'undefined' && !localStorage.getItem(todayKey)) {
                supabase.functions
                    .invoke('send-push-notification', {
                        body: {
                            user_id: user.id,
                            title: 'Quick pulse check',
                            body: "Share how you're feeling today.",
                            url: '/'
                        }
                    })
                    .catch((err) => console.error('Pulse reminder push error', err));
                localStorage.setItem(todayKey, 'sent');
            }
        }
    }, [loading, myPulse, user, supabase]);

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
        setShowPulseForm(false);

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

    const openHistory = async (userId) => {
        setHistoryUser(userId);
        setHistoryLoading(true);
        const { data } = await supabase
            .from('pulses')
            .select('*')
            .eq('user_id', userId)
            .eq('family_id', user.family_id)
            .order('created_at', { ascending: false })
            .limit(20);
        setHistoryItems(data || []);
        setHistoryLoading(false);
    };

    const closeHistory = () => {
        setHistoryUser(null);
        setHistoryItems([]);
    };

    const pulseCards = useMemo(
        () =>
            pulses.map((pulse) => {
                const isMe = pulse.user_id === user.id;
                const profile = profiles[pulse.user_id];
                const displayName = isMe ? 'You' : profile?.name || profile?.email?.split('@')[0] || 'Family Member';
                const unreadCount = !isMe ? getUnreadForUser(pulse.user_id) : 0;
                const hasPulse = !!pulse.state;
                const dateObj = pulse.created_at ? new Date(pulse.created_at) : null;
                const timeText = hasPulse && dateObj
                    ? dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';
                const dateText = hasPulse && dateObj
                    ? dateObj.toLocaleDateString([], { month: 'short', day: 'numeric' })
                    : '';

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
                            {timeText && (
                                <span className="time">
                                    {dateText} | {timeText}
                                </span>
                            )}
                            {hasPulse && pulse.note && <p className="pulse-note">{pulse.note}</p>}
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
                            {hasPulse ? (
                                <>
                                    <StatusBadge status={pulse.state} />
                                    <PulseReaction pulseId={pulse.id} profiles={profiles} />
                                    <button
                                        className="history-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            openHistory(pulse.user_id);
                                        }}
                                        aria-label="View history"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 8v4l3 3" />
                                            <circle cx="12" cy="12" r="9" />
                                        </svg>
                                    </button>
                                </>
                            ) : (
                                <span className="no-pulse">No pulse yet</span>
                            )}
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
            {showSmartNudge && (
                <SmartNudge
                    stale={stalePulse}
                    recentMood={recentMood}
                    fitnessToday={fitnessToday}
                    onUpdate={() => {
                        setShowPulseForm(true);
                        setTimeout(() => pulseFormRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                    }}
                />
            )}
            {showPulseReminder && !showSmartNudge && (
                <div className="pulse-reminder">
                    <div>
                        <p className="reminder-title">Share your pulse</p>
                        <p className="reminder-text">You have not checked in for 24 hours. How are you feeling?</p>
                    </div>
                    <button
                        className="reminder-btn"
                        onClick={() => {
                            setShowPulseForm(true);
                            setTimeout(() => {
                                pulseFormRef.current?.scrollIntoView({ behavior: 'smooth' });
                            }, 50);
                        }}
                    >
                        Update now
                    </button>
                </div>
            )}

            <section className="family-stream">
                {/* Hide fitness for now until auto-sync is ready */}
                {/* <FitnessWidget /> */}
                <div className="section-header stacked">
                    <h3 className="section-title" style={{ marginBottom: 6 }}>Family Pulse</h3>
                    <div className="section-actions">
                        {onlineCount > 0 && <span className="online-chip">{onlineCount} online</span>}
                        {pulses.some((p) => p.state || p.note || p.photo_url) && (
                            <button className="request-pulse-btn" onClick={() => setShowStories(true)}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M5 12l5 5 9-9" />
                                </svg>
                                Stories
                            </button>
                        )}
                        <button className="request-pulse-btn" onClick={handleRequestPulse} disabled={refreshing}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                            </svg>
                            Request
                        </button>
                    </div>
                </div>
                <PulseInsights history={myPulseHistory} />
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
                {myPulse && !showPulseForm ? (
                    <div className="my-status-compact">
                        <div className="compact-header">
                            <span className="label">Your Pulse</span>
                            <button className="update-btn-small" onClick={() => setShowPulseForm(true)}>
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
                    <div ref={pulseFormRef}>
                        <PulseInput onSubmit={handlePulseSubmit} />
                    </div>
                )}
            </section>

            {showSettings && <ProfileSettings onClose={() => setShowSettings(false)} />}

            {showInvite && <ShareInvite isOpen={showInvite} onClose={() => setShowInvite(false)} />}

            {showStories && (
                <StoryCarousel
                    pulses={pulses.filter((p) => p.state || p.note || p.photo_url)}
                    profiles={profiles}
                    onClose={() => setShowStories(false)}
                    onReply={(userId) => navigate(`/chat/${userId}`)}
                />
            )}

            {historyUser && (
                <div className="history-modal-backdrop" onClick={closeHistory}>
                    <div className="history-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="history-header">
                            <div>
                                <p className="history-title">{profiles[historyUser]?.name || 'Family member'}</p>
                                <p className="history-sub">Recent pulses</p>
                            </div>
                            <button className="history-close" onClick={closeHistory} aria-label="Close">×</button>
                        </div>
                        {historyLoading ? (
                            <p className="history-loading">Loading…</p>
                        ) : historyItems.length === 0 ? (
                            <p className="history-empty">No history yet.</p>
                        ) : (
                            <div className="history-list">
                                {historyItems.map((item) => {
                                    const date = item.created_at
                                        ? new Date(item.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                                        : '';
                                    return (
                                        <div key={item.id} className="history-item">
                                            <div className="history-meta">
                                                <StatusBadge status={item.state} />
                                                <span className="history-date">{date}</span>
                                            </div>
                                            {item.note && <p className="history-note">{item.note}</p>}
                                            {item.photo_url && <img src={item.photo_url} alt="Pulse" className="history-photo" />}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PulseDashboard;

const SmartNudge = ({ stale, recentMood, fitnessToday, onUpdate }) => {
    const lowActivity = fitnessToday && (fitnessToday.steps || 0) < 2000;

    if (!stale && !lowActivity) return null;

    const title = stale ? 'Take a quick pulse' : 'Slow day?';
    const body = stale
        ? "It's been a while since you checked in. Share how you're feeling."
        : "Activity looks low today. Want to log how you're doing?";

    return (
        <div className="pulse-reminder">
            <div>
                <p className="reminder-title">{title}</p>
                <p className="reminder-text">{body}</p>
                {recentMood && <p className="reminder-sub">Last mood: {scoreLabel(scoreMap[recentMood] || 0)}</p>}
                {fitnessToday && (
                    <p className="reminder-sub">
                        Today: {fitnessToday.steps || 0} steps / {fitnessToday.active_minutes || 0} active mins
                    </p>
                )}
            </div>
            <button className="reminder-btn" onClick={onUpdate}>
                Update now
            </button>
        </div>
    );
};
const scoreMap = {
    great: 5,
    good: 4,
    okay: 3,
    stressed: 2,
    sad: 2,
    overwhelmed: 1
};

const scoreLabel = (avg) => {
    if (avg >= 4.5) return 'Great';
    if (avg >= 3.5) return 'Good';
    if (avg >= 2.5) return 'Okay';
    if (avg >= 1.5) return 'Low';
    return 'Very low';
};

const PulseInsights = ({ history }) => {
    const last14 = history
        .filter((p) => p.created_at)
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const byDay = {};
    last14.forEach((p) => {
        const day = new Date(p.created_at).toISOString().slice(0, 10);
        if (!byDay[day]) byDay[day] = p;
    });

    const days = Array.from({ length: 7 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const key = d.toISOString().slice(0, 10);
        return { key, label: d.toLocaleDateString([], { weekday: 'short' }), pulse: byDay[key] };
    });

    const scores = days
        .filter((d) => d.pulse?.state && scoreMap[d.pulse.state] !== undefined)
        .map((d) => scoreMap[d.pulse.state]);
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

    let streak = 0;
    for (let i = days.length - 1; i >= 0; i--) {
        if (days[i].pulse?.state) streak += 1;
        else break;
    }

    return (
        <div className="pulse-insights">
            <div className="insights-header">
                <div>
                    <p className="insights-eyebrow">Pulse insights</p>
                    <h4 className="insights-title">{streak} day streak</h4>
                    <p className="insights-sub">
                        Avg mood: {avgScore ? `${scoreLabel(avgScore)} (${avgScore.toFixed(1)})` : 'No data yet'}
                    </p>
                </div>
            </div>
            <div className="insights-bars">
                {days.map((d) => {
                    const value = d.pulse?.state ? scoreMap[d.pulse.state] : 0;
                    return (
                        <div key={d.key} className="bar-item">
                            <div className="bar" style={{ height: `${value * 12}px` }} />
                            <span className="bar-label">{d.label.slice(0, 3)}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};




















