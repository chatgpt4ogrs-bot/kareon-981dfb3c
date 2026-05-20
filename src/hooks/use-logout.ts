import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export function useLogout() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const logout = async (reason?: "idle" | "manual") => {
    await signOut();
    
    if (reason === "idle") {
      toast({
        title: "Sessão expirada",
        description: "Você foi desconectado por inatividade.",
      });
      navigate("/login", { replace: true });
    } else {
      navigate("/login");
    }
  };

  return logout;
}
