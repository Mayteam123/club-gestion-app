import { useState } from 'react';
import { Mail, Lock, Users, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

type Mode = 'login' | 'signup' | 'reset';

export function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!email.trim() || !password.trim()) {
      setError('Completá email y contraseña.');
      return;
    }
    setLoading(true);
    if (mode === 'login') {
      const { error } = await signIn(email.trim(), password);
      if (error) setError(error);
    } else if (mode === 'signup') {
      const { error } = await signUp(email.trim(), password);
      if (error) setError(error);
      else setInfo('Cuenta creada. Iniciá sesión para continuar.');
      setMode('login');
    } else {
      const { error } = await resetPassword(email.trim());
      if (error) setError(error);
      else setInfo('Te enviamos un email para recuperar tu contraseña.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-10 max-w-md mx-auto w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-fuchsia-600 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-fuchsia-600/30">
            <Users className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-ink">Club Gestión</h1>
          <p className="text-sm text-gray-500 mt-1">
            {mode === 'login' && 'Iniciá sesión para gestionar tu club'}
            {mode === 'signup' && 'Creá tu cuenta y empezá a gestionar'}
            {mode === 'reset' && 'Recuperá tu contraseña'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            icon={<Mail className="w-5 h-5" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
          {mode !== 'reset' && (
            <Input
              label="Contraseña"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="Mínimo 6 caracteres"
              icon={<Lock className="w-5 h-5" />}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          )}

          {error && (
            <div className="rounded-2xl bg-rose-50 border border-rose-200 px-4 py-3 text-sm text-rose-700 font-medium">
              {error}
            </div>
          )}
          {info && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700 font-medium">
              {info}
            </div>
          )}

          <Button type="submit" size="lg" loading={loading} className="w-full">
            {mode === 'login' && 'Iniciar sesión'}
            {mode === 'signup' && 'Crear cuenta'}
            {mode === 'reset' && 'Enviar email'}
          </Button>
        </form>

        <div className="mt-6 flex flex-col gap-2 text-center text-sm">
          {mode === 'login' && (
            <>
              <button onClick={() => { setMode('signup'); setError(null); setInfo(null); }} className="text-fuchsia-700 font-semibold hover:underline">
                ¿No tenés cuenta? Creá una
              </button>
              <button onClick={() => { setMode('reset'); setError(null); setInfo(null); }} className="text-gray-500 hover:text-gray-700">
                Olvidé mi contraseña
              </button>
            </>
          )}
          {mode === 'signup' && (
            <button onClick={() => { setMode('login'); setError(null); setInfo(null); }} className="text-fuchsia-700 font-semibold hover:underline">
              ¿Ya tenés cuenta? Iniciá sesión
            </button>
          )}
          {mode === 'reset' && (
            <button onClick={() => { setMode('login'); setError(null); setInfo(null); }} className="text-fuchsia-700 font-semibold hover:underline">
              Volver a iniciar sesión
            </button>
          )}
        </div>

        <div className="mt-10 flex items-center justify-center gap-2 text-xs text-gray-400">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tus datos se guardan en la nube y se sincronizan entre dispositivos.</span>
        </div>
      </div>
    </div>
  );
}
