-- =====================================================================
-- Promote chatgpt4.ogrs@gmail.com to Admin Master
-- =====================================================================

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- 1. Find the user ID from auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'chatgpt4.ogrs@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    -- 2. Update the profile status to 'ativo' and cargo to 'Administrador'
    UPDATE public.profiles 
    SET status = 'ativo',
        cargo = 'Administrador'
    WHERE user_id = v_user_id;

    -- 3. Insert/Upsert the 'admin' role in user_roles
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
END $$;
