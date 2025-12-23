import React from 'react';
import { NavLink } from 'react-router-dom';
import { Heart, Activity } from 'lucide-react';
import './BottomNavigation.css';

const BottomNavigation = () => {
    return (
        <nav className="bottom-nav">
            <NavLink
                to="/"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
                <Activity size={24} />
                <span className="label">Pulse</span>
            </NavLink>

            <NavLink
                to="/rituals"
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
                <Heart size={24} />
                <span className="label">Rituals</span>
            </NavLink>
        </nav>
    );
};

export default BottomNavigation;
