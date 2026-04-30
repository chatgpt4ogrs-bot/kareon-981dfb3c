-- Adicionar campos de DVR à tabela cameras
ALTER TABLE public.cameras
  ADD COLUMN IF NOT EXISTS fabricante text,
  ADD COLUMN IF NOT EXISTS modo_conexao text,
  ADD COLUMN IF NOT EXISTS cloud_id text,
  ADD COLUMN IF NOT EXISTS ip_principal text,
  ADD COLUMN IF NOT EXISTS ip_alternativo text,
  ADD COLUMN IF NOT EXISTS dominio_ddns text,
  ADD COLUMN IF NOT EXISTS registro_auto_id text,
  ADD COLUMN IF NOT EXISTS porta_servico integer,
  ADD COLUMN IF NOT EXISTS porta_web integer,
  ADD COLUMN IF NOT EXISTS usuario text,
  ADD COLUMN IF NOT EXISTS senha text,
  ADD COLUMN IF NOT EXISTS canal integer;

-- Permitir stream_url opcional (pode ser derivada das infos do DVR)
ALTER TABLE public.cameras
  ALTER COLUMN stream_url DROP NOT NULL;