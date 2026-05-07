import { useEffect, useState, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  area: "admin" | "cameras";
  children: ReactNode;
}

const TTL_MS = 15 * 60 * 1000; // 15 minutos
const storageKey = (area: string, userId: string) => `sensitive_unlock_${area}_${userId}`;

function isUnlocked(area: string, userId: string) {
  try {
    const raw = sessionStorage.getItem(storageKey(area, userId));
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (!ts || Date.now() - ts > TTL_MS) {
      sessionStorage.removeItem(storageKey(area, userId));
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

const labels = {
  admin: { title: "Acesso ao painel administrativo", desc: "Por segurança, confirme sua senha para acessar esta área." },
  cameras: { title: "Acesso às câmeras", desc: "Por segurança, confirme sua senha para visualizar as câmeras." },
};

export default function SensitiveAreaGuard({ area, children }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [unlocked, setUnlocked] = useState(() => (user ? isUnlocked(area, user.id) : false));
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) setUnlocked(isUnlocked(area, user.id));
  }, [user, area, location.pathname]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !password) return;
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({ email: user.email, password });
    setSubmitting(false);
    if (error) {
      toast({ title: "Senha incorreta", description: "Tente novamente.", variant: "destructive" });
      return;
    }
    sessionStorage.setItem(storageKey(area, user.id), Date.now().toString());
    setPassword("");
    setUnlocked(true);
  };

  const handleCancel = () => {
    setPassword("");
    navigate("/", { replace: true });
  };

  if (unlocked) return <>{children}</>;

  return (
    <Dialog open onOpenChange={(o) => { if (!o) handleCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-4 h-4" /> {labels[area].title}
          </DialogTitle>
          <DialogDescription>{labels[area].desc}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleConfirm} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Sua senha</Label>
            <Input
              id="confirm-password"
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleCancel}>Cancelar</Button>
            <Button type="submit" disabled={submitting || !password}>
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Confirmar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}