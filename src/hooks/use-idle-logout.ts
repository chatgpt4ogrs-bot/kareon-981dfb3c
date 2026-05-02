import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

/**
 * Auto-logout após inatividade.
 * Eventos de atividade reiniciam o timer; após `timeoutMs` sem atividade,
 * desloga o usuário e redireciona para /login.
 */
export function useIdleLogout(timeoutMs: number = 30 * 60 * 1000) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const handleLogout = async () => {
      await signOut();
      toast({
        title: "Sessão expirada",
        description: "Você foi desconectado por inatividade.",
      });
      navigate("/login", { replace: true });
    };

    const reset = () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(handleLogout, timeoutMs);
    };

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"] as const;
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    document.addEventListener("visibilitychange", reset);
    reset();

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, reset));
      document.removeEventListener("visibilitychange", reset);
    };
  }, [user, signOut, navigate, timeoutMs]);
}