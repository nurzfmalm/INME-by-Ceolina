-- Add DELETE policies for all user data tables to prevent unauthorized deletion

-- Profiles table
CREATE POLICY "Users can delete own profile" ON public.profiles
FOR DELETE 
USING (auth.uid() = id);

-- Adaptive assessments table
CREATE POLICY "Users can delete own assessments" ON public.adaptive_assessments
FOR DELETE 
USING (auth.uid() = user_id);

-- Learning paths table
CREATE POLICY "Users can delete own learning paths" ON public.learning_paths
FOR DELETE 
USING (auth.uid() = user_id);

-- Sensory settings table
CREATE POLICY "Users can delete own settings" ON public.sensory_settings
FOR DELETE 
USING (auth.uid() = user_id);

-- Session analytics table
CREATE POLICY "Users can delete own analytics" ON public.session_analytics
FOR DELETE 
USING (auth.uid() = user_id);

-- Progress tracking table
CREATE POLICY "Users can delete own progress" ON public.progress_tracking
FOR DELETE 
USING (auth.uid() = user_id);