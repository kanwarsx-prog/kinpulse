import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSupabase } from '../../contexts/SupabaseContext';
import { usePresence } from '../../hooks/usePresence';
import './TopBar.css';

const TopBar = () => {
    const { supabase, user } = useSupabase();
    const navigate = useNavigate();
    const [familyInfo, setFamilyInfo] = useState(null);

    const initials = user?.name?.[0] || user?.email?.[0] || '?';

    useEffect(() => {
        const fetchFamily = async () => {
            if (!user?.family_id) return;
            const { data } = await supabase.from('families').select('*').eq('id', user.family_id).single();
            setFamilyInfo(data);
        };
        fetchFamily();
    }, [supabase, user?.family_id]);

    const handleInvite = () => {
        window.dispatchEvent(new Event('open-invite'));
        navigate('/');
    };

    const handleRefresh = () => {
        window.dispatchEvent(new Event('pulse-refresh'));
    };

    const handleSettings = () => {
        window.dispatchEvent(new Event('open-settings'));
    };

    const handleActivity = () => {
        window.dispatchEvent(new Event('open-activity'));
    };

    return (
        <div className="top-bar">
            <div className="top-bar-inner">
                <div className="brand" onClick={() => navigate('/')}>
                    <div className="brand-mark">KP</div>
                    <span className="brand-name">KinPulse</span>
                </div>
                {user?.family_id && familyInfo?.invite_code && (
                    <div className="top-bar-info">
                        <div className="invite-code">
                            Invite Code: <strong>{familyInfo.invite_code}</strong>
                        </div>
                    </div>
                )}
                <div className="top-bar-actions">
                    {user?.family_id && (
                        <>
                    <button className="icon-btn" onClick={handleRefresh} aria-label="Refresh">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 2v6h-6M3 22v-6h6" />
                            <path d="M3.51 9a9 9 0 0 1 14.13-3.36L21 8M3 16l3.36 2.36A9 9 0 0 0 20.49 15" />
                        </svg>
                    </button>
                    <button className="icon-btn" onClick={handleActivity} aria-label="Activity">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </button>
                    <button className="icon-btn" onClick={handleInvite} aria-label="Invite family">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                            <circle cx="8.5" cy="7" r="4" />
                            <line x1="20" y1="8" x2="20" y2="14" />
                                    <line x1="23" y1="11" x2="17" y2="11" />
                                </svg>
                            </button>
                            <button className="icon-btn" onClick={handleSettings} aria-label="Settings">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <circle cx="12" cy="12" r="3" />
                                    <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m14.95-7.05-1.414 1.414M8.464 17.536 7.05 18.95M18.95 18.95l-1.414-1.414M8.464 6.464 7.05 5.05" />
                                </svg>
                            </button>
                        </>
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
