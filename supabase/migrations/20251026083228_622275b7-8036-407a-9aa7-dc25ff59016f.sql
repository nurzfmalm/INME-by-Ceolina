-- Make child_user_id nullable in parent_child_links table
ALTER TABLE public.parent_child_links 
ALTER COLUMN child_user_id DROP NOT NULL;