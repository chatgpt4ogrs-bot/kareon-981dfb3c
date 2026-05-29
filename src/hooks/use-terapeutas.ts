import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Terapeuta {
  id: string;
  nome: string;
  email: string;
  cargo: string | null;
}

export function useTerapeutas() {
  return useQuery({
    queryKey: ["terapeutas"],
    queryFn: async () => {
      // Real DB columns: id, name, email, role
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, email, role")
        .order("name");
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
