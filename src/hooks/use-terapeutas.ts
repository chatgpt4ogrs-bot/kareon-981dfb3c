import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Terapeuta {
  id: string;
  nome: string;
  email: string;
  cargo: string | null;
}

export function useTerapeutas() {
  const { clinicScope } = useAuth();
  return useQuery({
    queryKey: ["terapeutas", clinicScope],
    queryFn: async () => {
      if (clinicScope && clinicScope.length === 0) return [];

      let q = (supabase.from("profiles") as any)
        .select("id, name, email, role, clinic_id")
        .order("name");

      if (clinicScope) {
        q = q.in("clinic_id", clinicScope);
      }

      const { data, error } = await q;
      if (error) throw error;

      return (data || []).map((p: any) => ({
        id: p.id,
        nome: p.name,
        email: p.email,
        cargo: p.role,
      })) as Terapeuta[];
    },
  });
}
