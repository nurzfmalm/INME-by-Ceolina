
-- Schedule entries for children
CREATE TABLE public.schedule_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Mon, 6=Sun
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'drawing', -- drawing, tasks, games, other
  activity_name TEXT NOT NULL DEFAULT 'Рисование',
  is_recurring BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Daily session logs to track actual completion
CREATE TABLE public.daily_session_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  child_id UUID NOT NULL REFERENCES public.children(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  schedule_entry_id UUID REFERENCES public.schedule_entries(id) ON DELETE SET NULL,
  session_date DATE NOT NULL,
  activity_type TEXT NOT NULL,
  activity_name TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, skipped
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.schedule_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_session_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for schedule_entries
CREATE POLICY "Users can view own schedule entries" ON public.schedule_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own schedule entries" ON public.schedule_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own schedule entries" ON public.schedule_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own schedule entries" ON public.schedule_entries FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for daily_session_logs
CREATE POLICY "Users can view own session logs" ON public.daily_session_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own session logs" ON public.daily_session_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own session logs" ON public.daily_session_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own session logs" ON public.daily_session_logs FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_schedule_entries_child ON public.schedule_entries(child_id);
CREATE INDEX idx_daily_session_logs_child_date ON public.daily_session_logs(child_id, session_date);
