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
      const { data, error } = await supabase
        .from("profiles")
        .select("id, nome, email, cargo")
        .order("nome");
      if (error) throw error;
      return (data || []) as Terapeuta[];
    },
  });
}
