-- Create missing tables for the Ceolina art therapy application

-- 1. Artworks table (stores user artwork metadata)
CREATE TABLE IF NOT EXISTS public.artworks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  image_url TEXT,
  storage_path TEXT,
  emotions_used JSONB DEFAULT '[]'::jsonb,
  colors_used JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_artworks_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.artworks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own artworks" ON public.artworks
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own artworks" ON public.artworks
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own artworks" ON public.artworks
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own artworks" ON public.artworks
FOR DELETE USING (auth.uid() = user_id);

-- 2. Emotion tokens table (stores reward tokens)
CREATE TABLE IF NOT EXISTS public.emotion_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_tokens_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.emotion_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tokens" ON public.emotion_tokens
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON public.emotion_tokens
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own tokens" ON public.emotion_tokens
FOR DELETE USING (auth.uid() = user_id);

-- 3. Drawing sessions table (for dual drawing collaboration)
CREATE TABLE IF NOT EXISTS public.drawing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_code TEXT UNIQUE NOT NULL,
  host_user_id UUID NOT NULL,
  guest_user_id UUID,
  status TEXT DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT fk_sessions_host FOREIGN KEY (host_user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.drawing_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions" ON public.drawing_sessions
FOR SELECT USING (auth.uid() = host_user_id OR auth.uid() = guest_user_id);

CREATE POLICY "Users can insert own sessions" ON public.drawing_sessions
FOR INSERT WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Users can update own sessions" ON public.drawing_sessions
FOR UPDATE USING (auth.uid() = host_user_id OR auth.uid() = guest_user_id);

CREATE POLICY "Users can delete own sessions" ON public.drawing_sessions
FOR DELETE USING (auth.uid() = host_user_id);

-- 4. Drawing strokes table (stores individual drawing strokes)
CREATE TABLE IF NOT EXISTS public.drawing_strokes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_id UUID NOT NULL,
  stroke_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_strokes_session FOREIGN KEY (session_id) REFERENCES public.drawing_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_strokes_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.drawing_strokes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view session strokes" ON public.drawing_strokes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.drawing_sessions 
    WHERE id = drawing_strokes.session_id 
    AND (host_user_id = auth.uid() OR guest_user_id = auth.uid())
  )
);

CREATE POLICY "Users can insert own strokes" ON public.drawing_strokes
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete session strokes" ON public.drawing_strokes
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM public.drawing_sessions 
    WHERE id = drawing_strokes.session_id 
    AND host_user_id = auth.uid()
  )
);

-- 5. Session activity table (tracks user activity)
CREATE TABLE IF NOT EXISTS public.session_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_id UUID NOT NULL,
  stroke_count INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_activity_session FOREIGN KEY (session_id) REFERENCES public.drawing_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_activity_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.session_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view session activity" ON public.session_activity
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.drawing_sessions 
    WHERE id = session_activity.session_id 
    AND (host_user_id = auth.uid() OR guest_user_id = auth.uid())
  )
);

CREATE POLICY "Users can upsert own activity" ON public.session_activity
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity" ON public.session_activity
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own activity" ON public.session_activity
FOR DELETE USING (auth.uid() = user_id);

-- 6. Progress sessions table (tracks progress)
CREATE TABLE IF NOT EXISTS public.progress_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_type TEXT NOT NULL,
  duration_seconds INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE public.progress_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress sessions" ON public.progress_sessions
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress sessions" ON public.progress_sessions
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress sessions" ON public.progress_sessions
FOR DELETE USING (auth.uid() = user_id);

-- 7. Art tasks table (predefined tasks)
CREATE TABLE IF NOT EXISTS public.art_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  difficulty TEXT DEFAULT 'medium',
  category TEXT,
  tokens_reward INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.art_tasks ENABLE ROW LEVEL SECURITY;

-- Art tasks are readable by everyone
CREATE POLICY "Anyone can view art tasks" ON public.art_tasks
FOR SELECT USING (true);

-- 8. User tasks table (tracks user task completion)
CREATE TABLE IF NOT EXISTS public.user_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  task_id UUID NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  artwork_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT fk_user_tasks_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_tasks_task FOREIGN KEY (task_id) REFERENCES public.art_tasks(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_tasks_artwork FOREIGN KEY (artwork_id) REFERENCES public.artworks(id) ON DELETE SET NULL,
  UNIQUE(user_id, task_id)
);

ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.user_tasks
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tasks" ON public.user_tasks
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks" ON public.user_tasks
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks" ON public.user_tasks
FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for artworks
INSERT INTO storage.buckets (id, name, public)
VALUES ('artworks', 'artworks', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for artworks bucket
CREATE POLICY "Anyone can view artworks" ON storage.objects
FOR SELECT USING (bucket_id = 'artworks');

CREATE POLICY "Users can upload own artworks" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'artworks' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own artworks" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'artworks' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own artworks" ON storage.objects
FOR DELETE USING (
  bucket_id = 'artworks' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);