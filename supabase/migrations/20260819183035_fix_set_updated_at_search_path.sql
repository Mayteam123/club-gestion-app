/*
# Fix mutable search_path on set_updated_at trigger function

1. Changes
   - Recreate public.set_updated_at() with an explicit `search_path = ''` (schema-safe).
   - This resolves the Supabase database linter warning about mutable search_path.

2. Security
   - No data changes. No policy changes. Only hardens the trigger function.
*/

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
