export type Profile = {
  id: string;
  email: string;
  club_name: string;
  owner_name: string;
  created_at: string;
  updated_at: string;
};

export type Student = {
  id: string;
  user_id: string;
  full_name: string;
  category: string;
  age: number | null;
  phone: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Activity = {
  id: string;
  user_id: string;
  name: string;
  price: number;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type AttendanceStatus = 'pending' | 'paid';
export type PaymentMethod = 'Mercado Pago' | 'Efectivo';

export type Attendance = {
  id: string;
  user_id: string;
  student_id: string;
  activity_id: string;
  attendance_date: string;
  duration: string | null;
  price: number;
  status: AttendanceStatus;
  payment_method: PaymentMethod | null;
  payment_id: string | null;
  created_at: string;
};

export type Payment = {
  id: string;
  user_id: string;
  student_id: string;
  attendance_id: string | null;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  created_at: string;
};

export type Settings = {
  id: string;
  user_id: string;
  mercadopago_alias: string;
  created_at: string;
  updated_at: string;
};

export type AttendanceWithRelations = Attendance & {
  student?: Pick<Student, 'id' | 'full_name'>;
  activity?: Pick<Activity, 'id' | 'name'>;
};

export type PaymentWithRelations = Payment & {
  student?: Pick<Student, 'id' | 'full_name'>;
  attendance?: Pick<Attendance, 'id' | 'attendance_date' | 'activity_id'>;
};
