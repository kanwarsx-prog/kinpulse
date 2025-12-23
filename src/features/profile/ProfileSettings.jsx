import React, { useState } from 'react';
import { useSupabase } from '../../contexts/SupabaseContext';
import NotificationSettings from './NotificationSettings';
import './ProfileSettings.css';

const ProfileSettings = ({ onClose }) => {
    const { supabase, user, refreshUser, signOut } = useSupabase();
    const [name, setName] = useState(user?.name || '');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        const { error } = await supabase
            .from('profiles')
            .update({ name: name.trim() || null })
            .eq('id', user.id);

        if (error) {
            setMessage('Error saving name');
        } else {
            setMessage('Name saved!');
            await refreshUser();
            setTimeout(() => {
                onClose();
            }, 1000);
        }
        setLoading(false);
    };

    const handleSignOut = async () => {
        if (confirm('Are you sure you want to sign out?')) {
            await signOut();
        }
    };

    return (
        <div className="profile-settings-overlay" onClick={onClose}>
            <div className="profile-settings-card" onClick={(e) => e.stopPropagation()}>
                <h2>Profile Settings</h2>
                <form onSubmit={handleSave}>
                    <div className="form-group">
                        <label>Your Name</label>
                        <input
                            type="text"
                            placeholder="Enter your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={50}
                        />
                        <p className="hint">This is how your family will see you</p>
                    </div>

                    <div className="form-group">
                        <label>Email</label>
                        <input
                            type="text"
                            value={user?.email || ''}
                            disabled
                            style={{ opacity: 0.6 }}
                        />
                    </div>

                    <div className="form-group">
                        <label>Family</label>
                        <input
                            type="text"
                            value={user?.family_id ? 'Connected' : 'Not in a family'}
                            disabled
                            style={{ opacity: 0.6 }}
                        />
                    </div>

                    {message && <p className={message.includes('Error') ? 'error' : 'success'}>{message}</p>}

                    <div className="form-actions">
                        <button type="button" onClick={onClose} disabled={loading}>
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="primary-btn">
                            {loading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>

                <div className="divider"></div>

                <NotificationSettings />

                <div className="danger-zone">
                    <button type="button" onClick={handleSignOut} className="sign-out-btn">
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
