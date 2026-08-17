-- 0. Update the check constraints to allow correct role and status values
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'terapeuta', 'clinica_admin', 'responsavel_clinica', 'familiar', 'therapist'));

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check CHECK (status IN ('ativo', 'pendente', 'inativo', 'active', 'pending', 'inactive', 'aprovado'));


DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'admin@kareon.com';
  v_password text := 'KareonAdmin2026!'; -- Default temporary password
  v_encrypted_password text;
  v_has_user_id_col boolean;
  v_has_nome_col boolean;
  v_has_name_col boolean;
  v_has_cargo_col boolean;
  v_has_role_col boolean;
BEGIN
  -- 1. Check if the user already exists in auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;

  -- 2. If the user doesn't exist, create them in auth.users
  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();
    v_encrypted_password := crypt(v_password, gen_salt('bf'));

    INSERT INTO auth.users (
      id,
      instance_id,
      role,
      aud,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      created_at,
      updated_at,
      last_sign_in_at,
      email_change_confirm_status,
      is_sso_user
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      v_email,
      v_encrypted_password,
      now(),
      '{"provider": "email", "providers": ["email"]}',
      '{"name": "Admin Master", "role": "admin"}',
      false,
      now(),
      now(),
      now(),
      0,
      false
    );
    RAISE NOTICE 'Created new auth user with ID %', v_user_id;
  ELSE
    -- If user exists, update password to ensure access and make sure confirmed
    v_encrypted_password := crypt(v_password, gen_salt('bf'));
    UPDATE auth.users 
    SET encrypted_password = v_encrypted_password,
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{name}', '"Admin Master"'),
        updated_at = now()
    WHERE id = v_user_id;
    RAISE NOTICE 'Updated existing auth user with ID %', v_user_id;
  END IF;

  -- 3. Detect column existence in public.profiles table dynamically to handle any schema variations
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'user_id') INTO v_has_user_id_col;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'nome') INTO v_has_nome_col;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'name') INTO v_has_name_col;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'cargo') INTO v_has_cargo_col;
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') INTO v_has_role_col;

  -- 4. Dynamic Upsert into profiles to satisfy potential NOT NULL constraints
  DECLARE
    v_sql text;
  BEGIN
    v_sql := 'INSERT INTO public.profiles (id, email, status';
    
    IF v_has_name_col THEN
      v_sql := v_sql || ', name';
    END IF;
    IF v_has_nome_col THEN
      v_sql := v_sql || ', nome';
    END IF;
    IF v_has_role_col THEN
      v_sql := v_sql || ', role';
    END IF;
    IF v_has_cargo_col THEN
      v_sql := v_sql || ', cargo';
    END IF;
    IF v_has_user_id_col THEN
      v_sql := v_sql || ', user_id';
    END IF;
    
    v_sql := v_sql || ') VALUES ($1, $2, ''ativo''';
    
    IF v_has_name_col THEN
      v_sql := v_sql || ', ''Admin Master''';
    END IF;
    IF v_has_nome_col THEN
      v_sql := v_sql || ', ''Admin Master''';
    END IF;
    IF v_has_role_col THEN
      v_sql := v_sql || ', ''admin''';
    END IF;
    IF v_has_cargo_col THEN
      v_sql := v_sql || ', ''Administrador''';
    END IF;
    IF v_has_user_id_col THEN
      v_sql := v_sql || ', $1';
    END IF;
    
    v_sql := v_sql || ') ON CONFLICT (id) DO UPDATE SET status = ''ativo''';
    
    IF v_has_name_col THEN
      v_sql := v_sql || ', name = ''Admin Master''';
    END IF;
    IF v_has_nome_col THEN
      v_sql := v_sql || ', nome = ''Admin Master''';
    END IF;
    IF v_has_role_col THEN
      v_sql := v_sql || ', role = ''admin''';
    END IF;
    IF v_has_cargo_col THEN
      v_sql := v_sql || ', cargo = ''Administrador''';
    END IF;
    IF v_has_user_id_col THEN
      v_sql := v_sql || ', user_id = $1';
    END IF;

    EXECUTE v_sql USING v_user_id, v_email;
  END;

  -- 5. Handle public.user_roles insertion if the table exists (for backward compatibility)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_roles') THEN
    BEGIN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (v_user_id, 'admin')
      ON CONFLICT (user_id, role) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not insert into user_roles: %', SQLERRM;
    END;
  END IF;

  RAISE NOTICE 'Successfully created/updated profile and permissions for %', v_email;
END $$;
