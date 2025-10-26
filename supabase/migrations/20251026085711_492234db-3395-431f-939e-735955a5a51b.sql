-- Update function to handle new user profile and sensory settings creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, child_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'child_name', 'Пользователь')
  );
  
  -- Create sensory settings with defaults
  INSERT INTO public.sensory_settings (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;