import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface PacienteUsuario {
  id: string;
  paciente_id: string;
  profile_id: string;
  tipo: "terapeuta" | "familiar";
  created_at: string;
}

export function usePacienteUsuarios(pacienteId?: string) {
  return useQuery({
    queryKey: ["paciente-usuarios", pacienteId],
    queryFn: async () => {
      // Endpoint dedicado ainda não existe: retorna vazio no cadastro novo
      // e tenta carregar vínculos via API expandida quando houver id.
      if (!pacienteId) return [] as PacienteUsuario[];
      try {
        return await api<PacienteUsuario[]>(`/pacientes/${pacienteId}/vinculos`);
      } catch {
        return [] as PacienteUsuario[];
      }
    },
    enabled: !!pacienteId,
  });
}

export function useSavePacienteUsuarios() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      pacienteId,
      terapeutas,
      familiares,
    }: {
      pacienteId: string;
      terapeutas: string[];
      familiares: string[];
    }) => {
      await api(`/pacientes/${pacienteId}/vinculos`, {
        method: "PUT",
        json: { profile_ids: familiares, tipo: "familiar" },
      });
      // Terapeutas: também via vínculo (tipo terapeuta)
      await api(`/pacientes/${pacienteId}/vinculos`, {
        method: "PUT",
        json: { profile_ids: terapeutas, tipo: "terapeuta" },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paciente-usuarios"] });
    },
  });
}
