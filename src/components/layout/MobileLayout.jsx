import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';
import './MobileLayout.css';

const MobileLayout = () => {
    return (
        <div className="mobile-layout">
            <main className="content">
                <Outlet />
            </main>
            <BottomNavigation />
        </div>
    );
};

export default MobileLayout;
