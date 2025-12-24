import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MobileLayout from './components/layout/MobileLayout';
import PulseDashboard from './features/pulse/PulseDashboard';
import PulseHistory from './features/pulse/PulseHistory';
import RitualsList from './features/rituals/RitualsList';
import RitualDetail from './features/rituals/RitualDetail';
import FamilyChat from './features/chat/FamilyChat';
import DirectMessage from './features/chat/DirectMessage';
import PhotoWall from './features/photos/PhotoWall';
import Calendar from './features/calendar/Calendar';
import JoinFamily from './features/family/JoinFamily';

import { SupabaseProvider, useSupabase } from './contexts/SupabaseContext';
import { ToastProvider } from './contexts/ToastContext';
import LoginScreen from './features/auth/LoginScreen';
import FamilyOnboarding from './features/onboarding/FamilyOnboarding';
import LoadingSpinner from './components/ui/LoadingSpinner';

const AppRoutes = () => {
  const { session, user, loading } = useSupabase();

  if (loading) {
    return <LoadingSpinner size="lg" message="Loading KinPulse..." />;
  }

  // Allow access to join page without authentication
  return (
    <Routes>
      <Route path="/join/:inviteCode" element={<JoinFamily />} />
      <Route path="/*" element={
        !session ? <LoginScreen /> :
          !user?.family_id ? <FamilyOnboarding /> :
            <AuthenticatedRoutes />
      } />
    </Routes>
  );
};

const AuthenticatedRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<MobileLayout />}>
        <Route index element={<PulseDashboard />} />
        <Route path="pulse-history" element={<PulseHistory />} />
        <Route path="rituals" element={<RitualsList />} />
        <Route path="rituals/:id" element={<RitualDetail />} />
        <Route path="chat" element={<FamilyChat />} />
        <Route path="chat/:userId" element={<DirectMessage />} />
        <Route path="photos" element={<PhotoWall />} />
        <Route path="calendar" element={<Calendar />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <SupabaseProvider>
      <ToastProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </ToastProvider>
    </SupabaseProvider>
  );
}

export default App;
