import { useCallback, useEffect, useMemo, useState } from 'react';
import { Wallet, ChevronDown, CreditCard, Banknote, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import {
  fetchPendingAttendances,
  fetchActiveStudents,
  fetchActivities,
  payAttendance,
  payManyAttendances,
} from '@/lib/data';
import { formatCurrency, formatDateShort } from '@/lib/format';
import type { Activity, Attendance, PaymentMethod, Student } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';

type DebtGroup = {
  student: Student;
  attendances: Attendance[];
  total: number;
};

export function DeudasScreen() {
  const toast = useToast();
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, att] = await Promise.all([fetchActiveStudents(), fetchActivities(), fetchPendingAttendances()]);
      setStudents(s);
      setActivities(a);
      setAttendances(att);
    } catch {
      toast.error('No pudimos cargar las deudas.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const activityMap = useMemo(() => new Map(activities.map((a) => [a.id, a])), [activities]);
  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);

  const groups: DebtGroup[] = useMemo(() => {
    const byStudent = new Map<string, Attendance[]>();
    for (const a of attendances) {
      if (!byStudent.has(a.student_id)) byStudent.set(a.student_id, []);
      byStudent.get(a.student_id)!.push(a);
    }
    const result: DebtGroup[] = [];
    for (const [sid, atts] of byStudent) {
      const student = studentMap.get(sid);
      if (!student) continue;
      const sorted = atts.sort((a, b) => a.attendance_date.localeCompare(b.attendance_date));
      result.push({ student, attendances: sorted, total: sorted.reduce((s, a) => s + Number(a.price), 0) });
    }
    return result.sort((a, b) => a.student.full_name.localeCompare(b.student.full_name));
  }, [attendances, studentMap]);

  const totalDebt = useMemo(() => groups.reduce((s, g) => s + g.total, 0), [groups]);

  async function handlePay(att: Attendance, method: PaymentMethod) {
    setBusy(att.id);
    try {
      await payAttendance(att.id, method);
      setAttendances((prev) => prev.filter((a) => a.id !== att.id));
      toast.success(`Pago de ${formatCurrency(Number(att.price))} registrado (${method}).`);
    } catch {
      toast.error('No pudimos registrar el pago.');
    } finally {
      setBusy(null);
    }
  }

  async function handlePayAll(group: DebtGroup, method: PaymentMethod) {
    setBusy(group.student.id);
    try {
      await payManyAttendances(
        group.attendances.map((a) => a.id),
        method,
      );
      const ids = new Set(group.attendances.map((a) => a.id));
      setAttendances((prev) => prev.filter((a) => !ids.has(a.id)));
      toast.success(`Deuda de ${group.student.full_name} saldada (${method}).`);
    } catch {
      toast.error('No pudimos saldar la deuda.');
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-28">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl h-20 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 pt-4 pb-28">
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold text-ink">Deudas</h1>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 className="w-7 h-7" />}
          title="No hay deudas"
          description="Todas las alumnas están al día. Cuando alguien deba, aparecerá acá."
        />
      ) : (
        <>
          <div className="bg-white rounded-2xl shadow-card p-4 mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">
                <span className="text-rose-600 font-extrabold text-lg">{groups.length}</span> deben
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">total</p>
              <p className="text-lg font-extrabold text-rose-600">{formatCurrency(totalDebt)}</p>
            </div>
          </div>

          <div className="space-y-3">
            {groups.map((g) => {
              const isOpen = expanded === g.student.id;
              const isBusy = busy === g.student.id;
              return (
                <div key={g.student.id} className="bg-white rounded-2xl shadow-card overflow-hidden">
                  <button
                    onClick={() => setExpanded(isOpen ? null : g.student.id)}
                    className="w-full flex items-center justify-between px-4 py-4"
                  >
                    <div className="text-left">
                      <h3 className="font-bold text-ink uppercase tracking-wide text-sm">{g.student.full_name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">Tocá el nombre para cobrar</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-extrabold text-rose-600">{formatCurrency(g.total)}</span>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 space-y-2 border-t border-gray-50 pt-3">
                      {g.attendances.map((a) => {
                        const act = activityMap.get(a.activity_id);
                        const aBusy = busy === a.id;
                        return (
                          <div key={a.id} className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-ink truncate">
                                {act?.name ?? '—'} <span className="text-gray-400 font-normal">· {formatDateShort(a.attendance_date)}</span>
                              </p>
                              <p className="text-sm font-bold text-rose-600">{formatCurrency(Number(a.price))}</p>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button
                                disabled={aBusy}
                                onClick={() => handlePay(a, 'Mercado Pago')}
                                className="h-8 px-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center gap-1 hover:bg-emerald-100 disabled:opacity-50"
                              >
                                <CreditCard className="w-3.5 h-3.5" /> MP
                              </button>
                              <button
                                disabled={aBusy}
                                onClick={() => handlePay(a, 'Efectivo')}
                                className="h-8 px-2.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold flex items-center gap-1 hover:bg-blue-100 disabled:opacity-50"
                              >
                                <Banknote className="w-3.5 h-3.5" /> Efec
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      <div className="flex gap-2 pt-2 border-t border-gray-50">
                        <Button variant="success" size="sm" className="flex-1" disabled={isBusy} onClick={() => handlePayAll(g, 'Mercado Pago')}>
                          <CreditCard className="w-4 h-4" /> Saldar todo · MP
                        </Button>
                        <Button variant="secondary" size="sm" className="flex-1 !bg-blue-50 !text-blue-700 !border-blue-200 hover:!bg-blue-100" disabled={isBusy} onClick={() => handlePayAll(g, 'Efectivo')}>
                          <Banknote className="w-4 h-4" /> Saldar todo · Efectivo
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
