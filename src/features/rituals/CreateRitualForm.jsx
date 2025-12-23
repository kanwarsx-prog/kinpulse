import React, { useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import './CreateRitualForm.css';

const CreateRitualForm = ({ onClose, onCreated }) => {
    const { supabase, user } = useSupabase();
    const [name, setName] = useState('');
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error: ritualError } = await supabase
                .from('rituals')
                .insert([{
                    family_id: user.family_id,
                    name,
                    prompt,
                    created_by: user.id,
                    closes_at: null // Open-ended for now
                }])
                .select()
                .single();

            if (ritualError) throw ritualError;

            onCreated(data);
            onClose();
        } catch (err) {
            console.error('Ritual creation error:', err);
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="create-ritual-overlay">
            <div className="create-ritual-form">
                <h2>Create New Ritual</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Ritual Name</label>
                        <input
                            type="text"
                            placeholder="e.g., Weekly Check-in"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Prompt</label>
                        <textarea
                            placeholder="e.g., What's one thing that went well this week?"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            required
                            rows={4}
                        />
                    </div>
                    {error && <p className="error">{error}</p>}
                    <div className="form-actions">
                        <button type="button" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}>
                            {loading ? 'Creating...' : 'Create Ritual'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateRitualForm;
