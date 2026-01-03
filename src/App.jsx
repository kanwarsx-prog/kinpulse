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
import InstallPrompt from './components/InstallPrompt';

import { SupabaseProvider, useSupabase } from './contexts/SupabaseContext';
import { ToastProvider } from './contexts/ToastContext';
import LoginScreen from './features/auth/LoginScreen';
import FamilyOnboarding from './features/onboarding/FamilyOnboarding';
import LoadingSpinner from './components/ui/LoadingSpinner';
import VaultHome from './features/vault/VaultHome';
import AdminConsole from './features/admin/AdminConsole';
import PokerLobby from './features/games/PokerLobby';
import Arena from './features/games/Arena';
import ChessLobby from './features/games/ChessLobby';
import ChessBoard from './features/games/ChessBoard';

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
          !user?.current_group_id ? <FamilyOnboarding /> :
            <AuthenticatedRoutes />
      } />
    </Routes>
  );
};

const AuthenticatedRoutes = () => {
  return (
    <>
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
          <Route path="vault" element={<VaultHome />} />
          <Route path="admin" element={<AdminConsole />} />
          <Route path="poker" element={<PokerLobby />} />
          <Route path="arena" element={<Arena />} />
          <Route path="games/chess" element={<ChessLobby />} />
          <Route path="games/chess/:gameId" element={<ChessBoard />} />
        </Route>

      </Routes >
      <InstallPrompt />
    </>
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
