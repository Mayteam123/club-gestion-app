import { supabase } from '@/lib/supabase';
import type { Activity, Attendance, Payment, PaymentMethod, Settings, Student } from '@/types';

const DEFAULT_ACTIVITIES: Pick<Activity, 'name' | 'price' | 'active' | 'sort_order'>[] = [
  { name: 'Libre', price: 5000, active: true, sort_order: 0 },
  { name: '2 horas', price: 6000, active: true, sort_order: 1 },
  { name: 'Presente y pago', price: 0, active: true, sort_order: 2 },
  { name: 'Off-skate', price: 5000, active: true, sort_order: 3 },
  { name: 'Particular', price: 0, active: true, sort_order: 4 },
];

export async function ensureBootstrap(userId: string, email: string): Promise<void> {
  const { data: existingSettings } = await supabase
    .from('settings')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (!existingSettings) {
    await supabase.from('settings').insert({ user_id: userId, mercadopago_alias: '' });
  }

  const { data: existingActivities } = await supabase
    .from('activities')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (!existingActivities || existingActivities.length === 0) {
    await supabase.from('activities').insert(
      DEFAULT_ACTIVITIES.map((a) => ({ ...a, user_id: userId })),
    );
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (!existingProfile) {
    await supabase.from('profiles').insert({ id: userId, email });
  }
}

export async function fetchActivities(): Promise<Activity[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Activity[];
}

export async function fetchActiveStudents(): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('active', true)
    .order('full_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Student[];
}

export async function fetchAllStudents(): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .order('full_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Student[];
}

export async function createStudent(input: Omit<Student, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'active'> & { active?: boolean }): Promise<Student> {
  const { data, error } = await supabase
    .from('students')
    .insert({ ...input, active: input.active ?? true })
    .select()
    .single();
  if (error) throw error;
  return data as Student;
}

export async function updateStudent(id: string, patch: Partial<Student>): Promise<void> {
  const { error } = await supabase.from('students').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteStudent(id: string): Promise<void> {
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchAttendancesForDate(date: string): Promise<Attendance[]> {
  const { data, error } = await supabase
    .from('attendances')
    .select('*')
    .eq('attendance_date', date)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Attendance[];
}

export async function fetchAllAttendances(): Promise<Attendance[]> {
  const { data, error } = await supabase
    .from('attendances')
    .select('*')
    .order('attendance_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Attendance[];
}

export async function fetchPendingAttendances(): Promise<Attendance[]> {
  const { data, error } = await supabase
    .from('attendances')
    .select('*')
    .eq('status', 'pending')
    .order('attendance_date', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Attendance[];
}

export async function createAttendance(input: {
  student_id: string;
  activity_id: string;
  attendance_date: string;
  duration?: string | null;
  price: number;
  status: Attendance['status'];
}): Promise<Attendance> {
  const { data, error } = await supabase
    .from('attendances')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as Attendance;
}

export async function updateAttendance(id: string, patch: Partial<Attendance>): Promise<void> {
  const { error } = await supabase.from('attendances').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteAttendance(id: string): Promise<void> {
  const { error } = await supabase.from('attendances').delete().eq('id', id);
  if (error) throw error;
}

export async function payAttendance(attendanceId: string, method: PaymentMethod): Promise<void> {
  const { data: att, error: e1 } = await supabase
    .from('attendances')
    .select('*')
    .eq('id', attendanceId)
    .single();
  if (e1) throw e1;
  const a = att as Attendance;

  const { data: payment, error: e2 } = await supabase
    .from('payments')
    .insert({
      student_id: a.student_id,
      attendance_id: a.id,
      amount: a.price,
      payment_method: method,
      payment_date: new Date().toISOString().slice(0, 10),
    })
    .select()
    .single();
  if (e2) throw e2;
  const p = payment as Payment;

  const { error: e3 } = await supabase
    .from('attendances')
    .update({ status: 'paid', payment_method: method, payment_id: p.id })
    .eq('id', a.id);
  if (e3) throw e3;
}

export async function payManyAttendances(attendanceIds: string[], method: PaymentMethod): Promise<void> {
  for (const id of attendanceIds) {
    await payAttendance(id, method);
  }
}

export async function fetchPayments(): Promise<Payment[]> {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .order('payment_date', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Payment[];
}

export async function fetchSettings(): Promise<Settings | null> {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return data as Settings | null;
}

export async function updateSettings(id: string, patch: Partial<Settings>): Promise<void> {
  const { error } = await supabase.from('settings').update(patch).eq('id', id);
  if (error) throw error;
}

export async function createActivity(input: { name: string; price: number; active?: boolean }): Promise<Activity> {
  const { count } = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true });
  const { data, error } = await supabase
    .from('activities')
    .insert({ name: input.name, price: input.price, active: input.active ?? true, sort_order: count ?? 0 })
    .select()
    .single();
  if (error) throw error;
  return data as Activity;
}

export async function updateActivity(id: string, patch: Partial<Activity>): Promise<void> {
  const { error } = await supabase.from('activities').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteActivity(id: string): Promise<void> {
  const { error } = await supabase.from('activities').delete().eq('id', id);
  if (error) throw error;
}

export async function updateProfile(id: string, patch: { club_name?: string; owner_name?: string }): Promise<void> {
  const { error } = await supabase.from('profiles').update(patch).eq('id', id);
  if (error) throw error;
}
