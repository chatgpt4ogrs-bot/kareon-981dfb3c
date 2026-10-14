import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { deleteWithAudit } from "@/lib/audit";

export interface Camera {
  id: string;
  clinica_id: string;
  nome: string;
  localizacao: string | null;
  stream_url: string | null;
  tipo: "hls" | "mjpeg" | "rtsp";
  status: "ativa" | "inativa";
  fabricante: string | null;
  modo_conexao: string | null;
  cloud_id: string | null;
  ip_principal: string | null;
  ip_alternativo: string | null;
  dominio_ddns: string | null;
  registro_auto_id: string | null;
  porta_servico: number | null;
  porta_web: number | null;
  usuario: string | null;
  senha: string | null;
  canal: number | null;
  created_at: string;
  updated_at: string;
}

export function useCameras() {
  const { profile, clinicScope } = useAuth();

  const query = useQuery({
    queryKey: ["cameras", clinicScope],
    queryFn: async () => {
      if (clinicScope && clinicScope.length === 0) return [];

      let q = supabase
        .from("cameras")
        .select("*")
        .order("nome");

      if (clinicScope) {
        q = q.in("clinica_id", clinicScope);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as Camera[];
    },
    enabled: !!profile,
  });

  return query;
}

export function useCameraMutations() {
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async (camera: Partial<Camera> & { nome: string; tipo: string; clinica_id: string }) => {
      const { data, error } = await supabase.from("cameras").insert(camera).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cameras"] }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<Camera>) => {
      const { data, error } = await supabase.from("cameras").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cameras"] }),
  });

  const remove = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await deleteWithAudit("camera", id, reason);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cameras"] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
    },
  });

  return { create, update, remove };
}
