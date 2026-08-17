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
  const { profile, isAdmin } = useAuth();
  return useQuery({
    queryKey: ["terapeutas", isAdmin, profile?.clinica_id],
    queryFn: async () => {
      // Real DB columns: id, name, email, role, clinic_id
      let q = supabase
        .from("profiles")
        .select("id, name, email, role, clinic_id")
        .order("name");

      if (!isAdmin && profile?.clinica_id) {
        q = q.eq("clinic_id", profile.clinica_id);
      }

      const { data, error } = await q;
      if (error) throw error;

      // Map real DB column names → app interface
      return (data || []).map((p: any) => ({
        id: p.id,
        nome: p.name,
        email: p.email,
        cargo: p.role,
      })) as Terapeuta[];
    },
  });
}
