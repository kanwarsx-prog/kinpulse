import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MobileLayout from './components/layout/MobileLayout';
import PulseDashboard from './features/pulse/PulseDashboard';
import RitualsList from './features/rituals/RitualsList';
import RitualDetail from './features/rituals/RitualDetail';
import FamilyChat from './features/chat/FamilyChat';

import { SupabaseProvider, useSupabase } from './contexts/SupabaseContext';
import LoginScreen from './features/auth/LoginScreen';
import FamilyOnboarding from './features/onboarding/FamilyOnboarding';

const AppRoutes = () => {
  const { session, user, loading } = useSupabase();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        Loading...
      </div>
    );
  }

  if (!session) {
    return <LoginScreen />;
  }

  // If logged in but no family, show onboarding
  if (!user?.family_id) {
    return <FamilyOnboarding />;
  }

  return (
    <Routes>
      <Route path="/" element={<MobileLayout />}>
        <Route index element={<PulseDashboard />} />
        <Route path="rituals" element={<RitualsList />} />
        <Route path="rituals/:id" element={<RitualDetail />} />
        <Route path="chat" element={<FamilyChat />} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <SupabaseProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </SupabaseProvider>
  );
}

export default App;
