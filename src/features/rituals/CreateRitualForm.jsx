import React, { useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import './CreateRitualForm.css';

const CreateRitualForm = ({ onClose, onCreated, initialName = '', initialPrompt = '' }) => {
    const { supabase, user, currentGroup } = useSupabase();
    const [name, setName] = useState(initialName);
    const [prompt, setPrompt] = useState(initialPrompt);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!currentGroup?.id) {
            setError('No group selected');
            setLoading(false);
            return;
        }

        try {
            const { data, error: ritualError } = await supabase
                .from('rituals')
                .insert([{
                    group_id: currentGroup.id,
                    name,
                    prompt,
                    created_by: user.id,
                    closes_at: null // Open-ended for now
                }])
                .select()
                .single();

            if (ritualError) throw ritualError;

            // Notify family about new goal
            try {
                // Get all members of the current group
                const { data: members } = await supabase
                    .from('group_members')
                    .select('user_id')
                    .eq('group_id', currentGroup.id);

                const targets = (members || [])
                    .map(m => m.user_id)
                    .filter(uid => uid !== user.id);

                const title = name || 'New family goal';
                const body = prompt ? prompt.slice(0, 80) : 'Tap to join';
                await Promise.allSettled(
                    targets.map((uid) =>
                        supabase.functions.invoke('send-push-notification', {
                            body: { user_id: uid, title, body, url: '/rituals' }
                        }).catch((err) => console.error('Goal push error', err))
                    )
                );
            } catch (err) {
                console.error('Goal push notify error', err);
            }

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
                <h2>Create New Goal</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Goal Name</label>
                        <input
                            type="text"
                            placeholder="e.g., Fitness together, Reunion prep"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Goal prompt / description</label>
                        <textarea
                            placeholder="e.g., 5k steps per day for 5 days, or Share one photo daily."
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
                            {loading ? 'Creating...' : 'Create Goal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateRitualForm;
