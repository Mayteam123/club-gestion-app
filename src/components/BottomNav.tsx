import { CalendarDays, Wallet, BarChart3, Receipt, Users, Settings as SettingsIcon, LogOut } from 'lucide-react';
import type { ComponentType } from 'react';
import { useAuth } from '@/context/AuthContext';

export type Tab = 'hoy' | 'deudas' | 'presente' | 'cierre' | 'alumnas';

type Props = {
  active: Tab;
  onChange: (t: Tab) => void;
  onOpenSettings: () => void;
};

const tabs: { id: Tab; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: 'hoy', label: 'Hoy', icon: CalendarDays },
  { id: 'deudas', label: 'Deudas', icon: Wallet },
  { id: 'presente', label: 'Presente', icon: BarChart3 },
  { id: 'cierre', label: 'Cierre', icon: Receipt },
  { id: 'alumnas', label: 'Alumnas', icon: Users },
];

export function BottomNav({ active, onChange, onOpenSettings }: Props) {
  const { profile, signOut } = useAuth();
  return (
    <>
      <header className="sticky top-0 z-30 bg-[#f6f3fb]/80 backdrop-blur-md border-b border-fuchsia-100/60">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold text-ink">Club Gestión</span>
            {profile?.club_name && (
              <span className="hidden sm:inline text-xs text-gray-500 font-medium">· {profile.club_name}</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenSettings}
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-600 hover:bg-white/60 transition-colors"
              aria-label="Configuración"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
            <button
              onClick={signOut}
              className="w-10 h-10 rounded-full flex items-center justify-center text-gray-600 hover:bg-white/60 transition-colors"
              aria-label="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/90 backdrop-blur-md border-t border-gray-100 safe-bottom">
        <div className="max-w-2xl mx-auto grid grid-cols-5">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = active === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onChange(t.id)}
                className="flex flex-col items-center justify-center gap-1 py-2.5 relative"
              >
                <span
                  className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all ${
                    isActive ? 'bg-fuchsia-600 text-white shadow-sm shadow-fuchsia-600/30' : 'text-gray-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </span>
                <span className={`text-[11px] font-semibold ${isActive ? 'text-fuchsia-700' : 'text-gray-400'}`}>
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
