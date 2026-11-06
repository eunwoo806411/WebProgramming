-- Apply once in the Supabase SQL Editor before enabling DATABASE_URL.
-- Node is the only writer/reader of DB records; browser clients use our HTTP API.
BEGIN;
CREATE TABLE IF NOT EXISTS public.photos(
 id text PRIMARY KEY,
 author_id text NOT NULL,
 latitude double precision NOT NULL CHECK(latitude BETWEEN -90 AND 90),
 longitude double precision NOT NULL CHECK(longitude BETWEEN -180 AND 180),
 place_name text NOT NULL,
 description text NOT NULL,
 -- Canonical UTC ISO strings (Date.toISOString), shared with the SQLite adapter.
 captured_at text NOT NULL,
 uploaded_at text NOT NULL,
 image_url text NOT NULL,
 base_likes integer NOT NULL DEFAULT 0 CHECK(base_likes>=0),
 is_demo integer NOT NULL DEFAULT 0 CHECK(is_demo IN(0,1))
);
CREATE TABLE IF NOT EXISTS public.likes(
 user_id text NOT NULL,
 photo_id text NOT NULL REFERENCES public.photos(id) ON DELETE CASCADE,
 PRIMARY KEY(user_id,photo_id)
);
CREATE TABLE IF NOT EXISTS public.sessions(sid text PRIMARY KEY,data text NOT NULL,expires bigint NOT NULL);
CREATE INDEX IF NOT EXISTS photos_latest ON public.photos(uploaded_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS photos_location ON public.photos(latitude,longitude);
CREATE INDEX IF NOT EXISTS photos_author ON public.photos(author_id,uploaded_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS likes_photo ON public.likes(photo_id);
CREATE INDEX IF NOT EXISTS sessions_expiry ON public.sessions(expires);
ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.photos,public.likes,public.sessions FROM anon,authenticated;
-- A public bucket allows photos to be seen without login. Do not add client write policies.
INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('photos','photos',true,5242880,ARRAY['image/jpeg']) ON CONFLICT(id) DO NOTHING;
COMMIT;
