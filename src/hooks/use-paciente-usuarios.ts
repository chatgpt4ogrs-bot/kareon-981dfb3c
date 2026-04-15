import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
      let query = supabase.from("paciente_usuarios").select("*");
      if (pacienteId) query = query.eq("paciente_id", pacienteId);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as PacienteUsuario[];
    },
    enabled: pacienteId ? !!pacienteId : true,
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
      // Delete existing bindings
      await supabase.from("paciente_usuarios").delete().eq("paciente_id", pacienteId);

      // Insert new bindings
      const rows = [
        ...terapeutas.map((id) => ({ paciente_id: pacienteId, profile_id: id, tipo: "terapeuta" as const })),
        ...familiares.map((id) => ({ paciente_id: pacienteId, profile_id: id, tipo: "familiar" as const })),
      ];
      if (rows.length > 0) {
        const { error } = await supabase.from("paciente_usuarios").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paciente-usuarios"] });
    },
  });
}
