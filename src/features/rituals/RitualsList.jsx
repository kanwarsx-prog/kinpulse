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
    };

    const handleRitualClick = (ritual) => {
        navigate(`/rituals/${ritual.id}`);
    };

    const handleRitualCreated = (newRitual) => {
        setRituals([newRitual, ...rituals]);
    };

    return (
        <div style={{ padding: 'var(--space-md)' }} className="fade-in">
            <header style={{ marginBottom: 'var(--space-lg)', textAlign: 'center' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'hsl(var(--color-text-primary))' }}>Rituals</h1>
                <p style={{ fontSize: '0.875rem', color: 'hsl(var(--color-text-secondary))' }}>Shared moments</p>
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
                    + Create Ritual
                </button>
            </header>

            <div className="rituals-feed">
                {rituals.map(ritual => (
                    <RitualCard
                        key={ritual.id}
                        ritual={ritual}
                        onClick={handleRitualClick}
                    />
                ))}
                {rituals.length === 0 && (
                    <p style={{ textAlign: 'center', color: '#888', marginTop: '20px' }}>
                        No rituals yet. Create one to get started!
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
