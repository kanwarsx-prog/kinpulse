import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../../contexts/SupabaseContext';
import { usePresence } from '../../hooks/usePresence';
import GroupSwitcher from '../GroupSwitcher';
import './TopBar.css';

const TopBar = () => {
    const { supabase, user } = useSupabase();
    const navigate = useNavigate();
    const [familyInfo, setFamilyInfo] = useState(null);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const menuRef = useRef(null);

    const initials = user?.name?.[0] || user?.email?.[0] || '?';

    useEffect(() => {
        const fetchFamily = async () => {
            if (!user?.family_id) return;
            const { data } = await supabase.from('families').select('*').eq('id', user.family_id).single();
            setFamilyInfo(data);
        };
        fetchFamily();
    }, [supabase, user?.family_id]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowActionsMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleInvite = () => {
        setShowActionsMenu(false);
        window.dispatchEvent(new Event('open-invite'));
        navigate('/');
    };

    const handleRefresh = () => {
        setShowActionsMenu(false);
        window.dispatchEvent(new Event('pulse-refresh'));
    };

    const handleSettings = () => {
        setShowActionsMenu(false);
        window.dispatchEvent(new Event('open-settings'));
    };

    const handleActivity = () => {
        setShowActionsMenu(false);
        window.dispatchEvent(new Event('open-activity'));
    };

    return (
        <div className="top-bar">
            <div className="top-bar-inner">
                <div className="top-bar-left">
                    <div className="brand" onClick={() => navigate('/')}>
                        <div className="brand-mark">KP</div>
                        <span className="brand-name">KinPulse</span>
                    </div>
                    {user?.family_id && <GroupSwitcher />}
                </div>
                <div className="top-bar-actions">
                    {user?.family_id && (
                        <div className="actions-menu-container" ref={menuRef}>
                            <button
                                className="icon-btn"
                                onClick={() => setShowActionsMenu(!showActionsMenu)}
                                aria-label="More actions"
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="1" />
                                    <circle cx="12" cy="5" r="1" />
                                    <circle cx="12" cy="19" r="1" />
                                </svg>
                            </button>
                            {showActionsMenu && (
                                <div className="actions-dropdown">
                                    <button className="action-item" onClick={handleRefresh}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 2v6h-6M3 22v-6h6" />
                                            <path d="M3.51 9a9 9 0 0 1 14.13-3.36L21 8M3 16l3.36 2.36A9 9 0 0 0 20.49 15" />
                                        </svg>
                                        Refresh
                                    </button>
                                    <button className="action-item" onClick={handleActivity}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                        </svg>
                                        Activity
                                    </button>
                                    <button className="action-item" onClick={handleInvite}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                            <circle cx="8.5" cy="7" r="4" />
                                            <line x1="20" y1="8" x2="20" y2="14" />
                                            <line x1="23" y1="11" x2="17" y2="11" />
                                        </svg>
                                        Invite
                                    </button>
                                    <button className="action-item" onClick={handleSettings}>
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="3" />
                                            <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m14.95-7.05-1.414 1.414M8.464 17.536 7.05 18.95M18.95 18.95l-1.414-1.414M8.464 6.464 7.05 5.05" />
                                        </svg>
                                        Settings
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="avatar" title={user?.email || 'User'}>
                        {initials}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopBar;
