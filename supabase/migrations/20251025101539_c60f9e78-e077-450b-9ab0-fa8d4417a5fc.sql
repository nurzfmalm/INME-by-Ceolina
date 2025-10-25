-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  child_name text NOT NULL,
  child_age integer,
  parent_email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create adaptive assessment table
CREATE TABLE IF NOT EXISTS public.adaptive_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assessment_data jsonb NOT NULL,
  completed boolean DEFAULT false,
  current_step integer DEFAULT 0,
  total_steps integer DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.adaptive_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assessments"
  ON public.adaptive_assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own assessments"
  ON public.adaptive_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assessments"
  ON public.adaptive_assessments FOR UPDATE
  USING (auth.uid() = user_id);

-- Create learning paths table
CREATE TABLE IF NOT EXISTS public.learning_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  path_data jsonb NOT NULL,
  current_week integer DEFAULT 1,
  total_weeks integer DEFAULT 6,
  started_at timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  completion_percentage integer DEFAULT 0
);

ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own learning paths"
  ON public.learning_paths FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own learning paths"
  ON public.learning_paths FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own learning paths"
  ON public.learning_paths FOR UPDATE
  USING (auth.uid() = user_id);

-- Create detailed session analytics table
CREATE TABLE IF NOT EXISTS public.session_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_type text NOT NULL,
  task_id uuid,
  duration_seconds integer,
  color_choices jsonb,
  reaction_times jsonb,
  sensory_activity jsonb,
  emotional_markers jsonb,
  completion_status text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.session_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own analytics"
  ON public.session_analytics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own analytics"
  ON public.session_analytics FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create sensory settings table
CREATE TABLE IF NOT EXISTS public.sensory_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  visual_intensity integer DEFAULT 50,
  animation_speed integer DEFAULT 50,
  sound_enabled boolean DEFAULT true,
  quiet_mode boolean DEFAULT false,
  color_scheme text DEFAULT 'default',
  interface_complexity text DEFAULT 'medium',
  hint_frequency integer DEFAULT 50,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.sensory_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON public.sensory_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON public.sensory_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON public.sensory_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Create progress tracking table
CREATE TABLE IF NOT EXISTS public.progress_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  metric_type text NOT NULL,
  metric_value numeric NOT NULL,
  week_number integer NOT NULL,
  recorded_at timestamptz DEFAULT now()
);

ALTER TABLE public.progress_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress"
  ON public.progress_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.progress_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sensory_settings_updated_at
  BEFORE UPDATE ON public.sensory_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, child_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'child_name', 'Ребёнок'));
  
  INSERT INTO public.sensory_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();