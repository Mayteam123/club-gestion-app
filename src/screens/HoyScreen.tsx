import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Copy, Check, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import {
  fetchActiveStudents,
  fetchActivities,
  fetchAttendancesForDate,
  fetchSettings,
  createAttendance,
  updateAttendance,
  deleteAttendance,
} from '@/lib/data';
import { formatCurrency, formatDate, parseDate, todayString } from '@/lib/format';
import type { Activity, Attendance, Settings, Student } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

export function HoyScreen() {
  const { user } = useAuth();
  const toast = useToast();
  const [date, setDate] = useState(todayString());
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, att, st] = await Promise.all([
        fetchActiveStudents(),
        fetchActivities(),
        fetchAttendancesForDate(date),
        fetchSettings(),
      ]);
      setStudents(s);
      setActivities(a.filter((x) => x.active));
      setAttendances(att);
      setSettings(st);
    } catch {
      toast.error('No pudimos cargar los datos. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [date, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const attendanceByStudent = useMemo(() => {
    const map = new Map<string, Attendance>();
    for (const a of attendances) {
      map.set(a.student_id, a);
    }
    return map;
  }, [attendances]);

  const presentCount = attendanceByStudent.size;
  const filteredStudents = useMemo(() => {
    if (activeFilter === 'all') return students;
    return students.filter((s) => attendanceByStudent.get(s.id)?.activity_id === activeFilter);
  }, [students, activeFilter, attendanceByStudent]);

  function shiftDate(days: number) {
    const d = parseDate(date);
    d.setDate(d.getDate() + days);
    setDate(formatDate(d));
  }

  async function copyAlias() {
    if (!settings?.mercadopago_alias) return;
    try {
      await navigator.clipboard.writeText(settings.mercadopago_alias);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('No se pudo copiar.');
    }
  }

  async function markAttendance(student: Student, activity: Activity) {
    const existing = attendanceByStudent.get(student.id);
    setBusyId(student.id);
    try {
      if (existing) {
        if (existing.activity_id === activity.id) {
          // same activity -> toggle off
          await deleteAttendance(existing.id);
          setAttendances((prev) => prev.filter((a) => a.id !== existing.id));
        } else {
          // change activity
          const isPaid = existing.status === 'paid';
          await updateAttendance(existing.id, {
            activity_id: activity.id,
            price: activity.price,
            status: activity.price === 0 ? 'paid' : isPaid ? 'paid' : 'pending',
            payment_method: activity.price === 0 ? null : existing.payment_method,
          });
          setAttendances((prev) =>
            prev.map((a) =>
              a.id === existing.id
                ? {
                    ...a,
                    activity_id: activity.id,
                    price: activity.price,
                    status: activity.price === 0 ? 'paid' : isPaid ? 'paid' : 'pending',
                  }
                : a,
            ),
          );
        }
      } else {
        const created = await createAttendance({
          student_id: student.id,
          activity_id: activity.id,
          attendance_date: date,
          price: activity.price,
          status: activity.price === 0 ? 'paid' : 'pending',
        });
        setAttendances((prev) => [...prev, created]);
      }
    } catch {
      toast.error('No pudimos guardar la asistencia. Intentá nuevamente.');
    } finally {
      setBusyId(null);
    }
  }

  const dateLabel = useMemo(() => {
    const d = parseDate(date);
    const today = todayString();
    const yest = new Date();
    yest.setDate(yest.getDate() - 1);
    const tom = new Date();
    tom.setDate(tom.getDate() + 1);
    if (date === today) return 'Hoy';
    if (date === formatDate(yest)) return 'Ayer';
    if (date === formatDate(tom)) return 'Mañana';
    return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  }, [date]);

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-28">
      {/* Title */}
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold text-ink">Asistencia del día</h1>
        <p className="text-sm text-gray-500">Tomá asistencia rápida</p>
      </div>

      {/* Date selector */}
      <div className="flex items-center justify-between bg-white rounded-2xl shadow-card p-3 mb-4">
        <button onClick={() => shiftDate(-1)} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <label className="flex items-center gap-2 text-center">
          <CalendarDays className="w-4 h-4 text-fuchsia-600" />
          <span className="font-bold text-ink capitalize">{dateLabel}</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="sr-only"
          />
          <button
            onClick={() => setDate(todayString())}
            className="text-xs text-fuchsia-600 font-semibold ml-1 underline"
          >
            hoy
          </button>
        </label>
        <button onClick={() => shiftDate(1)} className="w-10 h-10 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Activity filter chips */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 -mx-4 px-4">
        <FilterChip label="Todas" active={activeFilter === 'all'} onClick={() => setActiveFilter('all')} />
        {activities.map((a) => (
          <FilterChip key={a.id} label={a.name} active={activeFilter === a.id} onClick={() => setActiveFilter(a.id)} />
        ))}
      </div>

      {/* Prices card */}
      <div className="bg-white rounded-2xl shadow-card p-4 mb-4">
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {activities.map((a) => (
            <span key={a.id} className="text-sm text-gray-700">
              <span className="font-semibold">{a.name}</span>{' '}
              <span className={a.price === 0 ? 'text-emerald-600 font-semibold' : 'text-ink font-semibold'}>
                {a.price === 0 ? 'gratis' : formatCurrency(a.price)}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* MP alias */}
      {settings?.mercadopago_alias && (
        <div className="bg-white rounded-2xl shadow-card p-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500 font-medium">MercadoPago</p>
            <p className="font-bold text-ink">{settings.mercadopago_alias}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={copyAlias}>
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      )}

      {/* Count */}
      <div className="mb-3 px-1">
        <p className="text-sm font-semibold text-gray-600">
          <span className="text-fuchsia-700">{presentCount}</span> presentes de {students.length}
        </p>
      </div>

      {/* Students list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-28 animate-pulse" />
          ))}
        </div>
      ) : students.length === 0 ? (
        <EmptyState
          icon={<Users className="w-7 h-7" />}
          title="No tenés alumnas todavía"
          description="Agregá alumnas desde la sección Alumnas para empezar a tomar asistencia."
        />
      ) : (
        <div className="space-y-3">
          {filteredStudents.map((s) => {
            const att = attendanceByStudent.get(s.id);
            const isBusy = busyId === s.id;
            return (
              <div key={s.id} className="bg-white rounded-2xl shadow-card p-4">
                <h3 className="font-bold text-ink mb-3 uppercase tracking-wide text-sm">{s.full_name}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {activities.map((a) => {
                    const selected = att?.activity_id === a.id;
                    return (
                      <button
                        key={a.id}
                        disabled={isBusy}
                        onClick={() => markAttendance(s, a)}
                        className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${
                          selected
                            ? 'bg-fuchsia-600 text-white shadow-sm shadow-fuchsia-600/30'
                            : 'bg-fuchsia-50 text-fuchsia-800 hover:bg-fuchsia-100'
                        }`}
                      >
                        <span className="truncate">{a.name}</span>
                        <span className={selected ? 'text-white/90' : 'text-fuchsia-600'}>
                          {a.price === 0 ? 'gratis' : formatCurrency(a.price)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {att && (
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      {att.status === 'paid' ? (
                        <span className="text-emerald-600 font-semibold">Pagada</span>
                      ) : (
                        <span className="text-rose-600 font-semibold">Pendiente</span>
                      )}
                    </span>
                    <button
                      onClick={async () => {
                        setBusyId(s.id);
                        try {
                          await deleteAttendance(att.id);
                          setAttendances((prev) => prev.filter((x) => x.id !== att.id));
                        } catch {
                          toast.error('No se pudo quitar la asistencia.');
                        } finally {
                          setBusyId(null);
                        }
                      }}
                      className="text-gray-400 hover:text-rose-600 font-medium"
                    >
                      Quitar
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!user && null}
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-4 h-9 rounded-full text-sm font-semibold transition-all ${
        active ? 'bg-fuchsia-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:border-fuchsia-300'
      }`}
    >
      {label}
    </button>
  );
}
