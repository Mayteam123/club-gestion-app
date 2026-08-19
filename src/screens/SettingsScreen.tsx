import { useCallback, useEffect, useState } from 'react';
import { Plus, Trash2, Check, X, Pencil, Building2, CreditCard, User } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  fetchActivities,
  fetchSettings,
  createActivity,
  updateActivity,
  deleteActivity,
  updateSettings,
  updateProfile,
} from '@/lib/data';
import { formatCurrency } from '@/lib/format';
import type { Activity, Settings } from '@/types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

type Props = { open: boolean; onClose: () => void };

export function SettingsScreen({ open, onClose }: Props) {
  const { profile, refreshProfile } = useAuth();
  const toast = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [alias, setAlias] = useState('');
  const [clubName, setClubName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingAlias, setSavingAlias] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Activity | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([fetchActivities(), fetchSettings()]);
      setActivities(a);
      setSettings(s);
      setAlias(s?.mercadopago_alias ?? '');
      setClubName(profile?.club_name ?? '');
      setOwnerName(profile?.owner_name ?? '');
    } catch {
      toast.error('No pudimos cargar la configuración.');
    } finally {
      setLoading(false);
    }
  }, [toast, profile]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function saveAlias() {
    if (!settings) return;
    setSavingAlias(true);
    try {
      await updateSettings(settings.id, { mercadopago_alias: alias.trim() });
      toast.success('Alias guardado.');
    } catch {
      toast.error('No pudimos guardar el alias.');
    } finally {
      setSavingAlias(false);
    }
  }

  async function saveProfile() {
    setSavingProfile(true);
    try {
      await updateProfile(profile!.id, { club_name: clubName.trim(), owner_name: ownerName.trim() });
      await refreshProfile();
      toast.success('Datos del club guardados.');
    } catch {
      toast.error('No pudimos guardar los datos.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function saveActivity(name: string, price: string) {
    if (!name.trim()) {
      toast.error('El nombre de la clase es obligatorio.');
      return;
    }
    try {
      if (editingActivity) {
        await updateActivity(editingActivity.id, { name: name.trim(), price: Number(price) || 0 });
        setActivities((prev) => prev.map((a) => (a.id === editingActivity.id ? { ...a, name: name.trim(), price: Number(price) || 0 } : a)));
        toast.success('Clase actualizada.');
      } else {
        const created = await createActivity({ name: name.trim(), price: Number(price) || 0 });
        setActivities((prev) => [...prev, created]);
        toast.success('Clase agregada.');
      }
      setShowActivityForm(false);
      setEditingActivity(null);
    } catch {
      toast.error('No pudimos guardar la clase.');
    }
  }

  async function handleDeleteActivity() {
    if (!confirmDelete) return;
    try {
      await deleteActivity(confirmDelete.id);
      setActivities((prev) => prev.filter((a) => a.id !== confirmDelete.id));
      toast.success('Clase eliminada.');
    } catch {
      toast.error('No se pudo eliminar. Puede haber asistencias que la usan.');
    } finally {
      setConfirmDelete(null);
    }
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Configuración">
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl h-16 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Club profile */}
          <section>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> Datos del club
            </h2>
            <div className="space-y-3">
              <Input label="Nombre del club" value={clubName} onChange={(e) => setClubName(e.target.value)} placeholder="Ej: Club Patín" />
              <Input label="Tu nombre" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Ej: María" icon={<User className="w-5 h-5" />} />
              <Button variant="secondary" className="w-full" loading={savingProfile} onClick={saveProfile}>
                <Check className="w-4 h-4" /> Guardar datos
              </Button>
            </div>
          </section>

          {/* MP alias */}
          <section>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5" /> Alias de Mercado Pago
            </h2>
            <div className="flex gap-2">
              <Input value={alias} onChange={(e) => setAlias(e.target.value)} placeholder="Ej: club.gestion.mp" />
              <Button loading={savingAlias} onClick={saveAlias}>Guardar</Button>
            </div>
          </section>

          {/* Activities */}
          <section>
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Clases, precios y promos</h2>
            <div className="space-y-2">
              {activities.map((a) => (
                <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
                  <div>
                    <p className="font-semibold text-ink text-sm">{a.name}</p>
                    <p className="text-sm text-fuchsia-700 font-bold">{a.price === 0 ? 'gratis' : formatCurrency(a.price)}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingActivity(a); setShowActivityForm(true); }} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-white hover:text-fuchsia-600">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConfirmDelete(a)} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-white hover:text-rose-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <Button variant="secondary" className="w-full mt-2" onClick={() => { setEditingActivity(null); setShowActivityForm(true); }}>
                <Plus className="w-4 h-4" /> Agregar clase
              </Button>
            </div>
          </section>

          <Button className="w-full" onClick={onClose}>Listo</Button>
        </div>
      )}

      <ActivityForm
        open={showActivityForm}
        onClose={() => { setShowActivityForm(false); setEditingActivity(null); }}
        onSave={saveActivity}
        editing={editingActivity}
      />

      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar clase"
        message={`¿Eliminar "${confirmDelete?.name}"? No podrás hacerlo si ya hay asistencias que la usan.`}
        confirmLabel="Eliminar"
        danger
        onConfirm={handleDeleteActivity}
        onCancel={() => setConfirmDelete(null)}
      />
    </BottomSheet>
  );
}

function ActivityForm({ open, onClose, onSave, editing }: { open: boolean; onClose: () => void; onSave: (name: string, price: string) => void; editing: Activity | null }) {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? '');
      setPrice(editing?.price?.toString() ?? '');
    }
  }, [open, editing]);

  return (
    <BottomSheet open={open} onClose={onClose} title={editing ? 'Editar clase' : 'Nueva clase'}>
      <div className="space-y-4">
        <Input label="Nombre de la clase" placeholder="Ej: Libre, 2 horas..." value={name} onChange={(e) => setName(e.target.value)} />
        <Input label="Precio" type="number" inputMode="numeric" placeholder="Ej: 5000 (0 = gratis)" value={price} onChange={(e) => setPrice(e.target.value)} />
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            <X className="w-4 h-4" /> Cancelar
          </Button>
          <Button className="flex-1" onClick={() => onSave(name, price)}>
            <Check className="w-4 h-4" /> Guardar
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
