import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../../contexts/SupabaseContext';
import RitualCard from './RitualCard';
import CreateRitualForm from './CreateRitualForm';

const RitualsList = () => {
    const { supabase, user } = useSupabase();
    const navigate = useNavigate();
    const [rituals, setRituals] = useState([]);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [participantCounts, setParticipantCounts] = useState({});
    const [joinedIds, setJoinedIds] = useState(new Set());

    useEffect(() => {
        fetchRituals();
    }, [user?.family_id]);

    const fetchRituals = async () => {
        if (!user?.family_id) return;

        const { data } = await supabase
            .from('rituals')
            .select('*')
            .eq('family_id', user.family_id)
            .order('created_at', { ascending: false });

        if (data) {
            setRituals(data);
        }

        const { data: responses } = await supabase
            .from('ritual_responses')
            .select('ritual_id,user_id');

        if (responses) {
            const counts = {};
            const mine = new Set();
            responses.forEach((r) => {
                counts[r.ritual_id] = (counts[r.ritual_id] || 0) + 1;
                if (r.user_id === user.id) mine.add(r.ritual_id);
            });
            setParticipantCounts(counts);
            setJoinedIds(mine);
        }
    };

    const handleRitualClick = (ritual) => {
        navigate(`/rituals/${ritual.id}`);
    };

    const handleRitualCreated = (newRitual) => {
        setRituals([newRitual, ...rituals]);
    };

    const handleJoin = async (ritualId) => {
        if (joinedIds.has(ritualId)) return;
        const { error } = await supabase.from('ritual_responses').insert({
            ritual_id: ritualId,
            user_id: user.id,
            response: 'accepted'
        });
        if (!error) {
            setParticipantCounts((prev) => ({ ...prev, [ritualId]: (prev[ritualId] || 0) + 1 }));
            setJoinedIds((prev) => new Set([...prev, ritualId]));
        }
    };

    return (
        <div style={{ padding: 'var(--space-md)' }} className="fade-in">
            <header style={{ marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'hsl(var(--color-text-primary))' }}>Family Goals</h1>
                <p style={{ fontSize: '0.875rem', color: 'hsl(var(--color-text-secondary))' }}>Pick a goal together and share progress.</p>
                <button
                    onClick={() => setShowCreateForm(true)}
                    style={{
                        marginTop: '16px',
                        padding: '10px 20px',
                        background: '#6366f1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '1rem',
                        cursor: 'pointer'
                    }}
                >
                    + Create Goal
                </button>
                <div style={{ marginTop: '12px', color: 'hsl(var(--color-text-secondary))', fontSize: '0.85rem' }}>
                    Categories: Fitness • Reunion • Photo Story • Kindness • Planning
                </div>
            </header>

            <div className="rituals-feed">
                {rituals.map(ritual => (
                    <RitualCard
                        key={ritual.id}
                        ritual={ritual}
                        participants={participantCounts[ritual.id] || 0}
                        joined={joinedIds.has(ritual.id)}
                        onClick={handleRitualClick}
                        onJoin={handleJoin}
                    />
                ))}
                {rituals.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>
                        No goals yet. Create one to get started!
                    </p>
                )}
            </div>

            {showCreateForm && (
                <CreateRitualForm
                    onClose={() => setShowCreateForm(false)}
                    onCreated={handleRitualCreated}
                />
            )}
        </div>
    );
};

export default RitualsList;
