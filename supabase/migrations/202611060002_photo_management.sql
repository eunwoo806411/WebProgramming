-- Additive migration for projects that already ran 0001. No existing photos are removed.
BEGIN;
ALTER TABLE public.photos ADD COLUMN IF NOT EXISTS deleted_at text;
CREATE TABLE IF NOT EXISTS public.profiles(
 user_id text PRIMARY KEY,
 nickname text NOT NULL,
 created_at text NOT NULL
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles FROM anon,authenticated;
CREATE INDEX IF NOT EXISTS photos_pending_deletion ON public.photos(deleted_at) WHERE deleted_at IS NOT NULL;
COMMIT;
