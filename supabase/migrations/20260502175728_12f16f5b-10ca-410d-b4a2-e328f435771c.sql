
-- 1) Revoke EXECUTE from anon on SECURITY DEFINER helper functions.
-- These are only meant to be called from within RLS policies (auth context).
REVOKE EXECUTE ON FUNCTION public.is_admin_master() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_clinica_staff() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_manage_clinica() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_clinica_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_user_profile_id() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

-- 2) password_reset_codes: lock down explicitly. Only service role (edge functions) may use it.
-- RLS is on with no policies = denied for anon/authenticated, which is correct.
-- Add a clear deny-by-default comment marker policy so intent is documented.
CREATE POLICY "No client access to password reset codes"
  ON public.password_reset_codes
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
