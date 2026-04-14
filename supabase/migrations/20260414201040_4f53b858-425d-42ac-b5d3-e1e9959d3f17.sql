
-- Add status column to profiles
ALTER TABLE public.profiles 
ADD COLUMN status text NOT NULL DEFAULT 'pendente';

-- Update existing profiles to 'ativo' (they were already approved implicitly)
UPDATE public.profiles SET status = 'ativo';

-- Update handle_new_user to set status = 'pendente'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email, status)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)), NEW.email, 'pendente');
  RETURN NEW;
END;
$$;

-- Allow clinica_admin to update profiles of users in their clinic (for approval)
CREATE POLICY "Clinica admin updates clinic profiles"
ON public.profiles
FOR UPDATE
USING (
  clinica_id = get_user_clinica_id() 
  AND can_manage_clinica()
);
