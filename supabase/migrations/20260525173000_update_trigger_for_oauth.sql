-- =====================================================================
-- FIX: Improve handle_new_user to support Google/OAuth metadata
-- =====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, nome, email, telefone, status, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'nome',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    NEW.raw_user_meta_data->>'telefone',
    'pendente',
    COALESCE(
      NEW.raw_user_meta_data->>'avatar_url',
      NEW.raw_user_meta_data->>'picture'
    )
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user() failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$function$;

-- Ensure permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres;
