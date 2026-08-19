/*
# Club Gestión — initial schema

1. Purpose
   Multi-user app for clubs/academies to manage students, attendances, payments,
   debts, activities and monthly closes. Each user only sees their own data.

2. New Tables
   - profiles: extra info for the authenticated user (club name, owner name).
   - students: students managed by a user (full name, category, age, phone, active).
   - activities: class types/prices owned by a user (name, price, active).
   - attendances: a concrete class of a student on a date (status pending|paid).
   - payments: payment records that settle one or more attendances.
   - settings: per-user settings (Mercado Pago alias).

3. Relationships
   - profiles.id -> auth.users.id
   - students.user_id -> auth.users.id (ON DELETE CASCADE)
   - activities.user_id -> auth.users.id (ON DELETE CASCADE)
   - attendances.user_id -> auth.users.id, student_id -> students, activity_id -> activities
   - payments.user_id -> auth.users.id, student_id -> students
   - payments.attendance_id -> attendances (ON DELETE SET NULL, nullable for bulk payments)
   - attendances.payment_id -> payments (added after payments table exists)

4. Indexes
   - students(user_id), activities(user_id), attendances(user_id),
     attendances(student_id), attendances(attendance_date),
     payments(user_id), payments(student_id), settings(user_id).

5. Security
   - RLS enabled on every table.
   - 4 policies per table (SELECT/INSERT/UPDATE/DELETE), scoped TO authenticated,
     using auth.uid() = user_id (profiles keyed by id = auth.uid()).
   - user_id columns default to auth.uid() so client inserts omitting user_id succeed.

6. Notes
   - All timestamps timestamptz default now().
   - updated_at columns auto-maintained via trigger.
*/

-- updated_at helper trigger function (shared)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  club_name text NOT NULL DEFAULT '',
  owner_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "delete_own_profile" ON public.profiles;
CREATE POLICY "delete_own_profile" ON public.profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- students
CREATE TABLE IF NOT EXISTS public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  category text NOT NULL DEFAULT '',
  age integer,
  phone text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_students_user_id ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_students_full_name ON public.students(full_name);

DROP POLICY IF EXISTS "select_own_students" ON public.students;
CREATE POLICY "select_own_students" ON public.students FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_students" ON public.students;
CREATE POLICY "insert_own_students" ON public.students FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_students" ON public.students;
CREATE POLICY "update_own_students" ON public.students FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_students" ON public.students;
CREATE POLICY "delete_own_students" ON public.students FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS students_set_updated_at ON public.students;
CREATE TRIGGER students_set_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- activities
CREATE TABLE IF NOT EXISTS public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric(12,0) NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);

DROP POLICY IF EXISTS "select_own_activities" ON public.activities;
CREATE POLICY "select_own_activities" ON public.activities FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_activities" ON public.activities;
CREATE POLICY "insert_own_activities" ON public.activities FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_activities" ON public.activities;
CREATE POLICY "update_own_activities" ON public.activities FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_activities" ON public.activities;
CREATE POLICY "delete_own_activities" ON public.activities FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS activities_set_updated_at ON public.activities;
CREATE TRIGGER activities_set_updated_at BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- attendances (no payment_id FK yet; added after payments exists)
CREATE TABLE IF NOT EXISTS public.attendances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE RESTRICT,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  duration text,
  price numeric(12,0) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  payment_method text,
  payment_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_attendances_user_id ON public.attendances(user_id);
CREATE INDEX IF NOT EXISTS idx_attendances_student_id ON public.attendances(student_id);
CREATE INDEX IF NOT EXISTS idx_attendances_activity_id ON public.attendances(activity_id);
CREATE INDEX IF NOT EXISTS idx_attendances_date ON public.attendances(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendances_status ON public.attendances(status);

DROP POLICY IF EXISTS "select_own_attendances" ON public.attendances;
CREATE POLICY "select_own_attendances" ON public.attendances FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_attendances" ON public.attendances;
CREATE POLICY "insert_own_attendances" ON public.attendances FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_attendances" ON public.attendances;
CREATE POLICY "update_own_attendances" ON public.attendances FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_attendances" ON public.attendances;
CREATE POLICY "delete_own_attendances" ON public.attendances FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- payments
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  attendance_id uuid REFERENCES public.attendances(id) ON DELETE SET NULL,
  amount numeric(12,0) NOT NULL DEFAULT 0,
  payment_method text NOT NULL CHECK (payment_method IN ('Mercado Pago','Efectivo')),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);

DROP POLICY IF EXISTS "select_own_payments" ON public.payments;
CREATE POLICY "select_own_payments" ON public.payments FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_payments" ON public.payments;
CREATE POLICY "insert_own_payments" ON public.payments FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_payments" ON public.payments;
CREATE POLICY "update_own_payments" ON public.payments FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_payments" ON public.payments;
CREATE POLICY "delete_own_payments" ON public.payments FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- now add the attendances.payment_id FK -> payments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'attendances_payment_id_fkey'
      AND table_name = 'attendances'
  ) THEN
    ALTER TABLE public.attendances
      ADD CONSTRAINT attendances_payment_id_fkey
      FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- settings
CREATE TABLE IF NOT EXISTS public.settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  mercadopago_alias text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_settings_user_id ON public.settings(user_id);

DROP POLICY IF EXISTS "select_own_settings" ON public.settings;
CREATE POLICY "select_own_settings" ON public.settings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_settings" ON public.settings;
CREATE POLICY "insert_own_settings" ON public.settings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_settings" ON public.settings;
CREATE POLICY "update_own_settings" ON public.settings FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_settings" ON public.settings;
CREATE POLICY "delete_own_settings" ON public.settings FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS settings_set_updated_at ON public.settings;
CREATE TRIGGER settings_set_updated_at BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- unique settings per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_user_id_unique ON public.settings(user_id);
