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
import ForgotPassword from './features/auth/ForgotPassword';
import ResetPassword from './features/auth/ResetPassword';

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

  // Track app installation status
  React.useEffect(() => {
    if (!user) return;

    const checkInstallationStatus = async () => {
      // Check if running in standalone mode (PWA installed)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true;

      const status = isStandalone ? 'standalone' : 'browser';

      // Only update if different from what's currently in user profile
      // (assuming we fetched this, or just update occasionally)
      if (user.installation_status !== status) {
        console.log('[App] Updating installation status:', status);
        const { error } = await window.supabase
          .from('profiles')
          .update({ installation_status: status })
          .eq('id', user.id);

        if (error) {
          console.error('[App] Failed to update installation status:', error);
        }
      }
    };

    checkInstallationStatus();
  }, [user]);

  if (loading) {
    return <LoadingSpinner size="lg" message="Loading KinPulse..." />;
  }

  // Allow access to join page without authentication
  return (
    <Routes>
      <Route path="/join/:inviteCode" element={<JoinFamily />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
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
