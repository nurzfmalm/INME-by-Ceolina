-- INME App - Complete Database Setup Script
-- Run this script in your Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types
CREATE TYPE app_role AS ENUM ('parent', 'child');

-- =====================================================
-- TABLES
-- =====================================================

-- User Roles Table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- User Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  child_name TEXT NOT NULL,
  child_age INTEGER,
  interests TEXT[],
  parent_email TEXT,
  parent_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parent-Child Links Table
CREATE TABLE IF NOT EXISTS parent_child_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parent_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  child_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  access_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adaptive Assessments Table
CREATE TABLE IF NOT EXISTS adaptive_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_data JSONB NOT NULL,
  current_step INTEGER DEFAULT 1,
  total_steps INTEGER DEFAULT 10,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning Paths Table
CREATE TABLE IF NOT EXISTS learning_paths (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path_data JSONB NOT NULL,
  current_week INTEGER DEFAULT 1,
  total_weeks INTEGER DEFAULT 12,
  completion_percentage DECIMAL(5,2) DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity TIMESTAMPTZ DEFAULT NOW()
);

-- Art Tasks Table
CREATE TABLE IF NOT EXISTS art_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'general',
  difficulty TEXT DEFAULT 'medium',
  tokens_reward INTEGER DEFAULT 10,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Tasks Table
CREATE TABLE IF NOT EXISTS user_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES art_tasks(id) ON DELETE CASCADE,
  artwork_id UUID REFERENCES artworks(id) ON DELETE SET NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_user_tasks_task FOREIGN KEY (task_id) REFERENCES art_tasks(id),
  CONSTRAINT fk_user_tasks_artwork FOREIGN KEY (artwork_id) REFERENCES artworks(id)
);

-- Artworks Table
CREATE TABLE IF NOT EXISTS artworks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url TEXT,
  storage_path TEXT,
  colors_used JSONB,
  emotions_used JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drawing Sessions Table (for collaborative drawing)
CREATE TABLE IF NOT EXISTS drawing_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_code TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Drawing Strokes Table
CREATE TABLE IF NOT EXISTS drawing_strokes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES drawing_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stroke_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_strokes_session FOREIGN KEY (session_id) REFERENCES drawing_sessions(id)
);

-- Session Activity Tracking
CREATE TABLE IF NOT EXISTS session_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES drawing_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stroke_count INTEGER DEFAULT 0,
  last_activity TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_activity_session FOREIGN KEY (session_id) REFERENCES drawing_sessions(id)
);

-- Emotion Tokens Table
CREATE TABLE IF NOT EXISTS emotion_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INTEGER DEFAULT 0,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progress Sessions Table
CREATE TABLE IF NOT EXISTS progress_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL,
  duration_seconds INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Progress Tracking Table
CREATE TABLE IF NOT EXISTS progress_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  week_number INTEGER NOT NULL,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session Analytics Table
CREATE TABLE IF NOT EXISTS session_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type TEXT NOT NULL,
  task_id UUID REFERENCES art_tasks(id) ON DELETE SET NULL,
  duration_seconds INTEGER,
  completion_status TEXT DEFAULT 'incomplete',
  color_choices JSONB,
  emotional_markers JSONB,
  sensory_activity JSONB,
  reaction_times JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sensory Settings Table
CREATE TABLE IF NOT EXISTS sensory_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sound_enabled BOOLEAN DEFAULT TRUE,
  animation_speed DECIMAL(3,2) DEFAULT 1.0,
  color_scheme TEXT DEFAULT 'default',
  visual_intensity DECIMAL(3,2) DEFAULT 1.0,
  quiet_mode BOOLEAN DEFAULT FALSE,
  hint_frequency INTEGER DEFAULT 3,
  interface_complexity TEXT DEFAULT 'standard',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to generate access codes for parent-child linking
CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..6 LOOP
    code := code || substr(chars, floor(random() * length(chars) + 1)::INTEGER, 1);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to check user role
CREATE OR REPLACE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_child_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE adaptive_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE art_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE artworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE drawing_strokes ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotion_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensory_settings ENABLE ROW LEVEL SECURITY;

-- User Roles Policies
CREATE POLICY "Users can view own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own role" ON user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Parents can view children profiles" ON profiles
  FOR SELECT USING (
    auth.uid() = parent_user_id
  );

-- Parent-Child Links Policies
CREATE POLICY "Parents can manage own links" ON parent_child_links
  FOR ALL USING (auth.uid() = parent_user_id);

CREATE POLICY "Children can view own links" ON parent_child_links
  FOR SELECT USING (auth.uid() = child_user_id);

-- Adaptive Assessments Policies
CREATE POLICY "Users can manage own assessments" ON adaptive_assessments
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Parents can view children assessments" ON adaptive_assessments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.parent_user_id = auth.uid()
      AND profiles.id = adaptive_assessments.user_id
    )
  );

-- Learning Paths Policies
CREATE POLICY "Users can manage own learning paths" ON learning_paths
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Parents can view children learning paths" ON learning_paths
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.parent_user_id = auth.uid()
      AND profiles.id = learning_paths.user_id
    )
  );

-- Art Tasks Policies (Public read, admin write)
CREATE POLICY "Everyone can view art tasks" ON art_tasks
  FOR SELECT USING (true);

-- User Tasks Policies
CREATE POLICY "Users can manage own tasks" ON user_tasks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Parents can view children tasks" ON user_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.parent_user_id = auth.uid()
      AND profiles.id = user_tasks.user_id
    )
  );

-- Artworks Policies
CREATE POLICY "Users can manage own artworks" ON artworks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Parents can view children artworks" ON artworks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.parent_user_id = auth.uid()
      AND profiles.id = artworks.user_id
    )
  );

-- Drawing Sessions Policies
CREATE POLICY "Users can view own sessions" ON drawing_sessions
  FOR SELECT USING (
    auth.uid() = host_user_id OR auth.uid() = guest_user_id
  );

CREATE POLICY "Users can create sessions" ON drawing_sessions
  FOR INSERT WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Users can update own sessions" ON drawing_sessions
  FOR UPDATE USING (
    auth.uid() = host_user_id OR auth.uid() = guest_user_id
  );

-- Drawing Strokes Policies
CREATE POLICY "Session participants can view strokes" ON drawing_strokes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM drawing_sessions
      WHERE drawing_sessions.id = drawing_strokes.session_id
      AND (drawing_sessions.host_user_id = auth.uid() OR drawing_sessions.guest_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert own strokes" ON drawing_strokes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Session Activity Policies
CREATE POLICY "Session participants can view activity" ON session_activity
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM drawing_sessions
      WHERE drawing_sessions.id = session_activity.session_id
      AND (drawing_sessions.host_user_id = auth.uid() OR drawing_sessions.guest_user_id = auth.uid())
    )
  );

CREATE POLICY "Users can manage own activity" ON session_activity
  FOR ALL USING (auth.uid() = user_id);

-- Emotion Tokens Policies
CREATE POLICY "Users can view own tokens" ON emotion_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON emotion_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Parents can view children tokens" ON emotion_tokens
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.parent_user_id = auth.uid()
      AND profiles.id = emotion_tokens.user_id
    )
  );

-- Progress Sessions Policies
CREATE POLICY "Users can manage own progress sessions" ON progress_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Parents can view children progress" ON progress_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.parent_user_id = auth.uid()
      AND profiles.id = progress_sessions.user_id
    )
  );

-- Progress Tracking Policies
CREATE POLICY "Users can manage own tracking" ON progress_tracking
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Parents can view children tracking" ON progress_tracking
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.parent_user_id = auth.uid()
      AND profiles.id = progress_tracking.user_id
    )
  );

-- Session Analytics Policies
CREATE POLICY "Users can manage own analytics" ON session_analytics
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Parents can view children analytics" ON session_analytics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.parent_user_id = auth.uid()
      AND profiles.id = session_analytics.user_id
    )
  );

-- Sensory Settings Policies
CREATE POLICY "Users can manage own settings" ON sensory_settings
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update profiles.updated_at on UPDATE
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sensory_settings_updated_at
  BEFORE UPDATE ON sensory_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SAMPLE DATA (Optional - for testing)
-- =====================================================

-- Insert some sample art tasks
INSERT INTO art_tasks (title, prompt, description, category, difficulty, tokens_reward) VALUES
  ('Радужное настроение', 'Нарисуй радугу, которая показывает твои эмоции сегодня', 'Используй цвета, чтобы выразить свои чувства', 'emotions', 'easy', 10),
  ('Мой день', 'Изобрази самое интересное событие дня', 'Расскажи историю через рисунок', 'daily', 'easy', 10),
  ('Волшебное животное', 'Придумай и нарисуй своё волшебное животное', 'Пусть это будет животное, которое помогает детям', 'creative', 'medium', 15),
  ('Дом мечты', 'Нарисуй дом, в котором ты бы хотел жить', 'Добавь все детали, которые тебе важны', 'creative', 'medium', 15),
  ('Портрет эмоции', 'Нарисуй лицо, которое показывает одну эмоцию', 'Выбери эмоцию: радость, грусть, удивление или спокойствие', 'emotions', 'hard', 20)
ON CONFLICT DO NOTHING;

-- =====================================================
-- STORAGE BUCKETS SETUP
-- NOTE: Run these commands separately in Supabase Dashboard > Storage
-- or via Supabase CLI
-- =====================================================

-- Storage bucket for artworks
-- Create this in Supabase Dashboard > Storage or use SQL:
/*
INSERT INTO storage.buckets (id, name, public)
VALUES ('artworks', 'artworks', true)
ON CONFLICT DO NOTHING;

-- Policy to allow authenticated users to upload artworks
CREATE POLICY "Users can upload own artworks"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artworks'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow users to view artworks
CREATE POLICY "Users can view artworks"
ON storage.objects FOR SELECT
USING (bucket_id = 'artworks');

-- Policy to allow users to delete own artworks
CREATE POLICY "Users can delete own artworks"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'artworks'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
*/

-- =====================================================
-- INDEXES for Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_parent_user_id ON profiles(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_links_parent_id ON parent_child_links(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_links_child_id ON parent_child_links(child_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_child_links_code ON parent_child_links(access_code);
CREATE INDEX IF NOT EXISTS idx_adaptive_assessments_user_id ON adaptive_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_paths_user_id ON learning_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_user_id ON user_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_task_id ON user_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_artworks_user_id ON artworks(user_id);
CREATE INDEX IF NOT EXISTS idx_drawing_sessions_host ON drawing_sessions(host_user_id);
CREATE INDEX IF NOT EXISTS idx_drawing_sessions_guest ON drawing_sessions(guest_user_id);
CREATE INDEX IF NOT EXISTS idx_drawing_sessions_code ON drawing_sessions(session_code);
CREATE INDEX IF NOT EXISTS idx_drawing_strokes_session ON drawing_strokes(session_id);
CREATE INDEX IF NOT EXISTS idx_emotion_tokens_user_id ON emotion_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_sessions_user_id ON progress_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_tracking_user_id ON progress_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_session_analytics_user_id ON session_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_sensory_settings_user_id ON sensory_settings(user_id);

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ INME App Database Setup Complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Create storage bucket "artworks" in Supabase Dashboard > Storage';
  RAISE NOTICE '2. Set up storage policies (see comments above)';
  RAISE NOTICE '3. Configure your .env file with Supabase credentials';
  RAISE NOTICE '4. Deploy Edge Functions from supabase/functions directory';
END $$;
