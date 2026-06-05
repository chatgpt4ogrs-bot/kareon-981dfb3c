-- =========================================================
-- DESABILITA CONFIRMAÇÃO DE EMAIL (mailer_autoconfirm = true)
-- Execute isso no SQL Editor do Supabase Dashboard
-- =========================================================

-- Habilita auto-confirmação de email para novos cadastros
-- (usuários poderão fazer login imediatamente após criar conta)
UPDATE auth.config 
SET mailer_autoconfirm = true
WHERE id = 1;

-- Se a query acima não funcionar (tabela auth.config não existe), 
-- use a opção abaixo via Supabase Dashboard:
-- Authentication > Settings > Email Confirmation > DESABILITAR
