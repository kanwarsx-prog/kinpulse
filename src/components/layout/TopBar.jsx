import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../../contexts/SupabaseContext';
import './TopBar.css';

const TopBar = () => {
    const { user } = useSupabase();
    const navigate = useNavigate();

    const initials = user?.name?.[0] || user?.email?.[0] || '?';

    const handleInvite = () => {
        window.dispatchEvent(new Event('open-invite'));
        navigate('/');
    };

    return (
        <div className="top-bar">
            <div className="brand" onClick={() => navigate('/')}>
                <div className="brand-mark">KP</div>
                <span className="brand-name">KinPulse</span>
            </div>
            <div className="top-bar-actions">
                <button className="invite-btn" onClick={handleInvite}>
                    Invite
                </button>
                <div className="avatar" title={user?.email || 'User'}>
                    {initials}
                </div>
            </div>
        </div>
    );
};

export default TopBar;
