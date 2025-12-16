-- Add unique constraint on user_id for learning_paths table to support upsert
ALTER TABLE public.learning_paths ADD CONSTRAINT learning_paths_user_id_unique UNIQUE (user_id);