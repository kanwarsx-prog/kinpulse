import React, { useEffect, useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import './FitnessWidget.css';

const FitnessWidget = () => {
    const { supabase, user } = useSupabase();
    const [entry, setEntry] = useState(null);
    const [steps, setSteps] = useState('');
    const [minutes, setMinutes] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showConnect, setShowConnect] = useState(true);

    useEffect(() => {
        fetchToday();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const fetchToday = async () => {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const sessionUser = sessionData?.session?.user;
        if (!sessionUser?.id) {
            setLoading(false);
            return;
        }

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

        if (data) {
            setEntry(data);
            setSteps(data.steps?.toString() || '');
            setMinutes(data.active_minutes?.toString() || '');
        } else {
            setEntry(null);
            setSteps('');
            setMinutes('');
        }
        setLoading(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!user) return;
        setSaving(true);
        const today = new Date().toISOString().slice(0, 10);
        const payload = {
            user_id: user.id,
            metric_date: today,
            steps: Number(steps) || 0,
            active_minutes: Number(minutes) || 0,
            source: 'manual'
        };
        const { error, data } = await supabase
            .from('fitness_metrics')
            .upsert(payload, { onConflict: 'user_id,metric_date' })
            .select()
            .single();
        if (!error && data) {
            setEntry(data);
        }
        setSaving(false);
    };

    const handleConnectGoogle = () => {
        alert('Google Fit sync will be added here. For now, enter steps/active minutes manually.');
        setShowConnect(false);
    };

    const handleConnectApple = () => {
        alert('Apple Health requires the mobile app. Install via the App Store and enable Health access.');
        setShowConnect(false);
    };

    const isStale = () => {
        if (!entry) return true;
        const today = new Date().toISOString().slice(0, 10);
        return entry.metric_date !== today;
    };

    return (
        <div className="fitness-card">
            <div className="fitness-top">
                <div>
                    <p className="fitness-eyebrow">Today’s activity</p>
                    <h3 className="fitness-title">{loading ? 'Loading...' : `${entry?.steps || 0} steps`}</h3>
                    <p className="fitness-sub">{`${entry?.active_minutes || 0} active mins`}</p>
                    {isStale() && <span className="fitness-stale">No data today</span>}
                    {showConnect && (
                        <div className="fitness-connect">
                            <p className="fitness-sub">Connect to sync automatically:</p>
                            <div className="fitness-connect-actions">
                                <button type="button" onClick={handleConnectGoogle}>Google Fit</button>
                                <button type="button" onClick={handleConnectApple}>Apple Health</button>
                            </div>
                        </div>
                    )}
                </div>
                <form className="fitness-form" onSubmit={handleSave}>
                    <label>
                        Steps
                        <input type="number" value={steps} onChange={(e) => setSteps(e.target.value)} min="0" />
                    </label>
                    <label>
                        Active mins
                        <input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} min="0" />
                    </label>
                    <button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
                </form>
            </div>
        </div>
    );
};

export default FitnessWidget;
