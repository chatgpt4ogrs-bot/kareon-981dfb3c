import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLogout } from "@/hooks/use-logout";

/**
 * Auto-logout após inatividade.
 * Eventos de atividade reiniciam o timer; após `timeoutMs` sem atividade,
 * desloga o usuário e redireciona para /login.
 */
export function useIdleLogout(timeoutMs: number = 10 * 60 * 1000) {
  const { user } = useAuth();
  const logout = useLogout();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;

    const handleLogout = async () => {
      await logout("idle");
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
  }, [user, logout, timeoutMs]);
}