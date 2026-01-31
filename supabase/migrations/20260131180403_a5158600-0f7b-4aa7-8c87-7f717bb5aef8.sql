-- Add access_code column to children table
ALTER TABLE public.children 
ADD COLUMN access_code TEXT UNIQUE;

-- Create function to generate unique access code for children
CREATE OR REPLACE FUNCTION public.generate_child_access_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code TEXT;
  code_exists BOOLEAN;
BEGIN
  LOOP
    code := UPPER(substring(md5(random()::text) from 1 for 6));
    SELECT EXISTS(SELECT 1 FROM public.children WHERE access_code = code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN code;
END;
$$;

-- Create trigger to auto-generate access code on insert
CREATE OR REPLACE FUNCTION public.set_child_access_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.access_code IS NULL THEN
    NEW.access_code := public.generate_child_access_code();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_set_child_access_code
BEFORE INSERT ON public.children
FOR EACH ROW
EXECUTE FUNCTION public.set_child_access_code();

-- Generate codes for existing children that don't have one
UPDATE public.children 
SET access_code = public.generate_child_access_code()
WHERE access_code IS NULL;

-- Create function to validate child access code
CREATE OR REPLACE FUNCTION public.validate_child_access_code(code TEXT)
RETURNS TABLE(child_id UUID, child_name TEXT, parent_user_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, user_id
  FROM public.children
  WHERE access_code = code
$$;