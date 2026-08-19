import { useCallback, useEffect, useMemo, useState } from 'react';
import { Receipt, ChevronLeft, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { fetchAllAttendances, fetchAllStudents, fetchActivities, fetchPayments } from '@/lib/data';
import { formatDate, parseDate, startOfMonth, endOfMonth, formatDateShort, monthLabel } from '@/lib/format';
import type { Activity, Attendance, Payment, Student } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';

export function CierreScreen() {
  const toast = useToast();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, att, p] = await Promise.all([fetchAllStudents(), fetchActivities(), fetchAllAttendances(), fetchPayments()]);
      setStudents(s);
      setActivities(a);
      setAttendances(att);
      setPayments(p);
    } catch {
      toast.error('No pudimos cargar el cierre.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const { start, end } = useMemo(() => {
    const d = new Date(year, month, 1);
    return { start: startOfMonth(d), end: endOfMonth(d) };
  }, [year, month]);

  const sStr = formatDate(start);
  const eStr = formatDate(end);

  const monthAttendances = useMemo(
    () => attendances.filter((a) => a.attendance_date >= sStr && a.attendance_date <= eStr),
    [attendances, sStr, eStr],
  );
  const monthPayments = useMemo(
    () => payments.filter((p) => p.payment_date >= sStr && p.payment_date <= eStr),
    [payments, sStr, eStr],
  );

  const cobrado = monthPayments.reduce((s, p) => s + Number(p.amount), 0);
  const porCobrar = monthAttendances
    .filter((a) => a.status === 'pending')
    .reduce((s, a) => s + Number(a.price), 0);
  const mpTotal = monthPayments.filter((p) => p.payment_method === 'Mercado Pago').reduce((s, p) => s + Number(p.amount), 0);
  const efectivoTotal = monthPayments.filter((p) => p.payment_method === 'Efectivo').reduce((s, p) => s + Number(p.amount), 0);

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const activityMap = useMemo(() => new Map(activities.map((a) => [a.id, a])), [activities]);

  const groupedByStudent = useMemo(() => {
    const map = new Map<string, Attendance[]>();
    for (const a of monthAttendances) {
      if (!map.has(a.student_id)) map.set(a.student_id, []);
      map.get(a.student_id)!.push(a);
    }
    return students
      .map((s) => ({ student: s, atts: (map.get(s.id) ?? []).sort((a, b) => a.attendance_date.localeCompare(b.attendance_date)) }))
      .filter((x) => x.atts.length > 0)
      .sort((a, b) => a.student.full_name.localeCompare(b.student.full_name));
  }, [monthAttendances, students]);

  function shiftMonth(delta: number) {
    const d = new Date(year, month + delta, 1);
    setMonth(d.getMonth());
    setYear(d.getFullYear());
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
        <h1 className="text-2xl font-extrabold text-ink">Cierre del mes</h1>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-between bg-white rounded-2xl shadow-card p-3 mb-4">
        <button onClick={() => shiftMonth(-1)} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-ink capitalize">{monthLabel(year, month)}</span>
        <button onClick={() => shiftMonth(1)} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {monthAttendances.length === 0 ? (
        <EmptyState icon={<Receipt className="w-7 h-7" />} title="Sin actividad este mes" description="No hay asistencias registradas en este mes." />
      ) : (
        <>
          {/* Two summary cards */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
              <div className="flex items-center gap-1.5 text-emerald-700 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Cobrado</span>
              </div>
              <p className="text-2xl font-extrabold text-emerald-700">{formatCurrency(cobrado)}</p>
            </div>
            <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100">
              <div className="flex items-center gap-1.5 text-rose-700 mb-1">
                <TrendingDown className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Por cobrar</span>
              </div>
              <p className="text-2xl font-extrabold text-rose-700">{formatCurrency(porCobrar)}</p>
            </div>
          </div>

          {/* By method */}
          <div className="bg-white rounded-2xl shadow-card p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-600 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> MercadoPago
              </span>
              <span className="font-bold text-ink">{formatCurrency(mpTotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Efectivo
              </span>
              <span className="font-bold text-ink">{formatCurrency(efectivoTotal)}</span>
            </div>
          </div>

          {/* Detail by student */}
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-1">Detalle por alumna</h2>
          <div className="space-y-3">
            {groupedByStudent.map(({ student, atts }) => (
              <div key={student.id} className="bg-white rounded-2xl shadow-card p-4">
                <h3 className="font-bold text-ink uppercase tracking-wide text-sm mb-3">{student.full_name}</h3>
                <div className="space-y-2">
                  {atts.map((a) => {
                    const act = activityMap.get(a.activity_id);
                    return (
                      <div key={a.id} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm text-ink">
                            {act?.name ?? '—'} <span className="text-gray-400">· {formatDateShort(a.attendance_date)}</span>
                          </p>
                          <p className="text-sm font-bold text-ink">{formatCurrency(Number(a.price))}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {a.status === 'paid' ? (
                            <span className="text-xs font-bold text-emerald-600">
                              {a.payment_method === 'Mercado Pago' ? 'MP' : 'Efectivo'}
                            </span>
                          ) : (
                            <span className="text-xs font-bold text-rose-600">Debe</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function formatCurrency(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-AR');
}
