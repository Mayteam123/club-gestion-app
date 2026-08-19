import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { AuthScreen } from '@/screens/AuthScreen';
import { BottomNav, type Tab } from '@/components/BottomNav';
import { HoyScreen } from '@/screens/HoyScreen';
import { DeudasScreen } from '@/screens/DeudasScreen';
import { PresenteScreen } from '@/screens/PresenteScreen';
import { CierreScreen } from '@/screens/CierreScreen';
import { AlumnasScreen } from '@/screens/AlumnasScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { ensureBootstrap } from '@/lib/data';
import { Loader2 } from 'lucide-react';

function AppInner() {
  const { session, user, loading } = useAuth();
  const [tab, setTab] = useState<Tab>('hoy');
  const [showSettings, setShowSettings] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);

  useEffect(() => {
    if (user) {
      setBootstrapping(true);
      ensureBootstrap(user.id, user.email ?? '').finally(() => setBootstrapping(false));
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-fuchsia-600" />
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

  if (bootstrapping) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-fuchsia-600" />
        <p className="text-sm text-gray-500 font-medium">Preparando tu cuenta...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <BottomNav active={tab} onChange={setTab} onOpenSettings={() => setShowSettings(true)} />
      <main>
        {tab === 'hoy' && <HoyScreen />}
        {tab === 'deudas' && <DeudasScreen />}
        {tab === 'presente' && <PresenteScreen />}
        {tab === 'cierre' && <CierreScreen />}
        {tab === 'alumnas' && <AlumnasScreen />}
      </main>
      <SettingsScreen open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ToastProvider>
  );
}
