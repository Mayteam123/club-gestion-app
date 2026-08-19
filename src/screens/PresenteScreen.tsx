import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import { fetchAllAttendances, fetchActivities, fetchAllStudents } from '@/lib/data';
import { formatDate, parseDate, startOfWeek, endOfWeek, startOfMonth, endOfMonth, formatDateShort } from '@/lib/format';
import type { Activity, Attendance, Student } from '@/types';
import { EmptyState } from '@/components/ui/EmptyState';

type Period = 'dia' | 'semana' | 'mes';

export function PresenteScreen() {
  const toast = useToast();
  const [period, setPeriod] = useState<Period>('mes');
  const [date, setDate] = useState(formatDate(new Date()));
  const [students, setStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityFilter, setActivityFilter] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, att] = await Promise.all([fetchAllStudents(), fetchActivities(), fetchAllAttendances()]);
      setStudents(s);
      setActivities(a.filter((x) => x.active));
      setAttendances(att);
    } catch {
      toast.error('No pudimos cargar las estadísticas.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const { start, end, label } = useMemo(() => {
    const d = parseDate(date);
    if (period === 'dia') {
      return { start: d, end: d, label: d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }) };
    }
    if (period === 'semana') {
      return { start: startOfWeek(d), end: endOfWeek(d), label: `${formatDateShort(formatDate(startOfWeek(d)))} - ${formatDateShort(formatDate(endOfWeek(d)))}` };
    }
    return { start: startOfMonth(d), end: endOfMonth(d), label: d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }) };
  }, [date, period]);

  const filtered = useMemo(() => {
    const sStr = formatDate(start);
    const eStr = formatDate(end);
    return attendances.filter((a) => a.attendance_date >= sStr && a.attendance_date <= eStr && (activityFilter === 'all' || a.activity_id === activityFilter));
  }, [attendances, start, end, activityFilter]);

  const uniqueStudents = useMemo(() => new Set(filtered.map((a) => a.student_id)).size, [filtered]);

  const byActivity = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of filtered) {
      map.set(a.activity_id, (map.get(a.activity_id) ?? 0) + 1);
    }
    return activities
      .map((act) => ({ act, count: map.get(act.id) ?? 0 }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [filtered, activities]);

  const studentCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of filtered) {
      map.set(a.student_id, (map.get(a.student_id) ?? 0) + 1);
    }
    return students
      .map((s) => ({ student: s, count: map.get(s.id) ?? 0 }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count || a.student.full_name.localeCompare(b.student.full_name));
  }, [filtered, students]);

  function shiftDate(days: number) {
    const d = parseDate(date);
    if (period === 'mes') d.setMonth(d.getMonth() + days);
    else if (period === 'semana') d.setDate(d.getDate() + days * 7);
    else d.setDate(d.getDate() + days);
    setDate(formatDate(d));
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
        <h1 className="text-2xl font-extrabold text-ink">Quién viene a cada clase</h1>
      </div>

      {/* Period selector */}
      <div className="flex gap-2 mb-3">
        {(['dia', 'semana', 'mes'] as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 h-10 rounded-xl text-sm font-semibold capitalize transition-all ${
              period === p ? 'bg-fuchsia-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {p === 'dia' ? 'Día' : p === 'semana' ? 'Semana' : 'Mes'}
          </button>
        ))}
      </div>

      {/* Date nav */}
      <div className="flex items-center justify-between bg-white rounded-2xl shadow-card p-3 mb-4">
        <button onClick={() => shiftDate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <label className="flex items-center gap-2 capitalize font-bold text-ink">
          <CalendarDays className="w-4 h-4 text-fuchsia-600" />
          {label}
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="sr-only" />
        </label>
        <button onClick={() => shiftDate(1)} className="w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Activity filter */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 -mx-4 px-4">
        <FilterChip label="Todas" active={activityFilter === 'all'} onClick={() => setActivityFilter('all')} />
        {activities.map((a) => (
          <FilterChip key={a.id} label={a.name} active={activityFilter === a.id} onClick={() => setActivityFilter(a.id)} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={<BarChart3 className="w-7 h-7" />} title="Sin asistencias en este período" description="Probá con otro rango de fechas o actividad." />
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white rounded-2xl shadow-card p-4 text-center">
              <p className="text-3xl font-extrabold text-fuchsia-700">{filtered.length}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">asistencias</p>
            </div>
            <div className="bg-white rounded-2xl shadow-card p-4 text-center">
              <p className="text-3xl font-extrabold text-fuchsia-700">{uniqueStudents}</p>
              <p className="text-xs text-gray-500 font-medium mt-0.5">alumnas</p>
            </div>
          </div>

          {/* By activity */}
          {byActivity.length > 0 && (
            <div className="bg-white rounded-2xl shadow-card p-4 mb-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Por actividad</h2>
              <div className="space-y-2.5">
                {byActivity.map(({ act, count }) => (
                  <div key={act.id} className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">{act.name}</span>
                    <span className="text-sm font-bold text-fuchsia-700">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Who came */}
          <div className="bg-white rounded-2xl shadow-card p-4">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Quiénes vinieron</h2>
            <div className="space-y-2">
              {studentCounts.map(({ student, count }) => (
                <div key={student.id} className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink uppercase tracking-wide">{student.full_name}</span>
                  <span className="text-sm font-bold text-gray-500">×{count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
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
