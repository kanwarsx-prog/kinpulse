import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import BottomNavigation from './BottomNavigation';
import TopBar from './TopBar';
import ActivityFeed from '../ui/ActivityFeed';
import SplashHighlight from '../ui/SplashHighlight';
import './MobileLayout.css';

const MobileLayout = () => {
    const [showActivity, setShowActivity] = useState(false);

    useEffect(() => {
        const handler = () => setShowActivity(true);
        window.addEventListener('open-activity', handler);
        return () => window.removeEventListener('open-activity', handler);
    }, []);

    return (
        <div className="mobile-layout">
            <SplashHighlight />
            <TopBar />
            <main className="content">
                <Outlet />
            </main>
            <BottomNavigation />
            <ActivityFeed isOpen={showActivity} onClose={() => setShowActivity(false)} />
        </div>
    );
};

export default MobileLayout;
