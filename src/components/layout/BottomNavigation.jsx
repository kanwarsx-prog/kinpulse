import React from 'react';
import { NavLink } from 'react-router-dom';
import { useUnreadCounts } from '../../hooks/useUnreadCounts';
import UnreadBadge from '../ui/UnreadBadge';
import './BottomNavigation.css';

const BottomNavigation = () => {
    const { totalUnread } = useUnreadCounts();

    return (
        <nav className="bottom-nav">
            <NavLink
                to="/"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
                <span className="label">Pulse</span>
            </NavLink>

            <NavLink
                to="/chat"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
                <div className="nav-icon-wrapper">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <UnreadBadge count={totalUnread} />
                </div>
                <span className="label">Chat</span>
            </NavLink>

            <NavLink
                to="/photos"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                </svg>
                <span className="label">Photos</span>
            </NavLink>

            <NavLink
                to="/rituals"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 21s-6-4.35-9-9a5.25 5.25 0 0 1 8.25-6.5L12 7l.75-1.5a5.25 5.25 0 0 1 8.25 6.5c-3 4.65-9 9-9 9z" />
                </svg>
                <span className="label">Goals</span>
            </NavLink>

            <NavLink
                to="/arena"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="10" width="16" height="7" rx="2" />
                    <path d="M6 10V9a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v1" />
                    <path d="M4 17v2" />
                    <path d="M20 17v2" />
                    <path d="M8 17v2" />
                    <path d="M16 17v2" />
                </svg>
              <span className="label">Lounge</span>
            </NavLink>
        </nav>
    );
};

export default BottomNavigation;
