-- ============================================================================
-- SpiceZify Albums Enhancement - Database Schema
-- ============================================================================
-- Run this after the main database_final.sql to add album-specific features
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENHANCED ALBUMS TABLE
-- ============================================================================

-- Drop existing albums table if it exists to recreate with better structure
DROP TABLE IF EXISTS public.albums CASCADE;

-- Create enhanced albums table
CREATE TABLE IF NOT EXISTS public.albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  artist_name TEXT,
  artist_id UUID, -- Link to artists table
  description TEXT,
  year INTEGER,
  genre TEXT,
  cover_url TEXT, -- URL to album cover
  cover_path TEXT, -- Local file path to album cover
  total_tracks INTEGER DEFAULT 0,
  total_duration INTEGER DEFAULT 0, -- Total duration in seconds
  release_date DATE,
  record_label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES public.profiles(user_id) ON DELETE CASCADE
);

-- ============================================================================
-- ENHANCED TRACKS TABLE
-- ============================================================================

-- Add album relationship to tracks (if tracks table exists)
DO $$
BEGIN
  -- Add album_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tracks' AND column_name = 'album_id'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN album_id UUID REFERENCES public.albums(id) ON DELETE SET NULL;
  END IF;

  -- Add track number within album
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tracks' AND column_name = 'track_number'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN track_number INTEGER;
  END IF;

  -- Add disc number for multi-disc albums
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tracks' AND column_name = 'disc_number'
  ) THEN
    ALTER TABLE public.tracks ADD COLUMN disc_number INTEGER DEFAULT 1;
  END IF;
END $$;

-- ============================================================================
-- ALBUM FAVORITES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.album_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(album_id, user_id)
);

-- ============================================================================
-- ALBUM PLAY HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.album_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id UUID NOT NULL REFERENCES public.albums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  play_count INTEGER DEFAULT 1
);

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ============================================================================

-- Albums table trigger
DROP TRIGGER IF EXISTS albums_updated_at ON public.albums;
CREATE TRIGGER albums_updated_at
  BEFORE UPDATE ON public.albums
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- FUNCTIONS FOR ALBUM MANAGEMENT
-- ============================================================================

-- Function to update album statistics when tracks change
CREATE OR REPLACE FUNCTION public.update_album_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Update track count and total duration for the affected album
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.albums 
    SET 
      total_tracks = (
        SELECT COUNT(*) 
        FROM public.tracks 
        WHERE album_id = NEW.album_id
      ),
      total_duration = (
        SELECT COALESCE(SUM(duration), 0) 
        FROM public.tracks 
        WHERE album_id = NEW.album_id
      )
    WHERE id = NEW.album_id;
  END IF;

  -- Handle deletions
  IF TG_OP = 'DELETE' THEN
    UPDATE public.albums 
    SET 
      total_tracks = (
        SELECT COUNT(*) 
        FROM public.tracks 
        WHERE album_id = OLD.album_id
      ),
      total_duration = (
        SELECT COALESCE(SUM(duration), 0) 
        FROM public.tracks 
        WHERE album_id = OLD.album_id
      )
    WHERE id = OLD.album_id;
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic album stats updates
DROP TRIGGER IF EXISTS update_album_stats_trigger ON public.tracks;
CREATE TRIGGER update_album_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_album_stats();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on new tables
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.album_plays ENABLE ROW LEVEL SECURITY;

-- Albums policies
CREATE POLICY albums_public_read
  ON public.albums
  FOR SELECT
  USING (TRUE); -- Albums can be viewed by anyone

CREATE POLICY albums_owner_manage
  ON public.albums
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Album favorites policies
CREATE POLICY album_favorites_owner_only
  ON public.album_favorites
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Album plays policies
CREATE POLICY album_plays_owner_only
  ON public.album_plays
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Albums indexes
CREATE INDEX IF NOT EXISTS idx_albums_artist_name 
  ON public.albums (artist_name);

CREATE INDEX IF NOT EXISTS idx_albums_year 
  ON public.albums (year);

CREATE INDEX IF NOT EXISTS idx_albums_genre 
  ON public.albums (genre);

CREATE INDEX IF NOT EXISTS idx_albums_user_id 
  ON public.albums (user_id);

-- Tracks-Albums relationship indexes
CREATE INDEX IF NOT EXISTS idx_tracks_album_id 
  ON public.tracks (album_id);

CREATE INDEX IF NOT EXISTS idx_tracks_album_track_number 
  ON public.tracks (album_id, disc_number, track_number);

-- Album favorites indexes
CREATE INDEX IF NOT EXISTS idx_album_favorites_user_id 
  ON public.album_favorites (user_id);

CREATE INDEX IF NOT EXISTS idx_album_favorites_album_id 
  ON public.album_favorites (album_id);

-- Album plays indexes
CREATE INDEX IF NOT EXISTS idx_album_plays_user_id_played_at 
  ON public.album_plays (user_id, played_at DESC);

CREATE INDEX IF NOT EXISTS idx_album_plays_album_id_played_at 
  ON public.album_plays (album_id, played_at DESC);

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Grant permissions to authenticated users
DO $$
BEGIN
  GRANT ALL ON public.albums TO authenticated;
  GRANT ALL ON public.album_favorites TO authenticated;
  GRANT ALL ON public.album_plays TO authenticated;
  EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert sample album
INSERT INTO public.albums (id, name, artist_name, description, year, genre, total_tracks)
VALUES (
  '22222222-2222-2222-2222-222222222222'::UUID,
  'Sample Album',
  'Sample Artist',
  'A sample album for testing the album system',
  2024,
  'Electronic',
  10
) ON CONFLICT (id) DO NOTHING;

COMMIT;

-- ============================================================================
-- ALBUMS ENHANCEMENT COMPLETE ✅
-- ============================================================================
-- 
-- Your SpiceZify database now includes:
-- 
-- ✅ Enhanced albums table with detailed metadata
-- ✅ Album-tracks relationships with track numbering
-- ✅ Album favorites system
-- ✅ Album play history tracking
-- ✅ Automatic statistics updates
-- ✅ Proper RLS policies and permissions
-- ✅ Performance indexes for fast queries
-- 
-- Ready for advanced album management!
-- ============================================================================
