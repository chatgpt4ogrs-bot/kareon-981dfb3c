import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { SUPPORT_EMAIL } from "@/lib/permissions";
import { useNavigate } from "react-router-dom";
import { Ban, LogOut, Heart, Mail } from "lucide-react";

type Props = {
  /** Conta inativa/bloqueada (não é modo visita) */
  variant?: "blocked";
};

const AguardandoAprovacao = ({ variant = "blocked" }: Props) => {
  const { signOut, profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-8 text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <Ban className="w-8 h-8 text-destructive" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-primary" />
              <span className="font-bold text-lg text-foreground">Kareon</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">Conta desativada</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Olá{profile?.nome ? `, ${profile.nome.split(" ")[0]}` : ""}! Seu acesso
              está temporariamente indisponível.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Se acredita que isso é um engano ou deseja reativar o serviço, entre em
              contato com o suporte.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
            >
              <Mail className="w-4 h-4" />
              {SUPPORT_EMAIL}
            </a>
          </div>

          <Button variant="outline" className="gap-2" onClick={handleLogout}>
            <LogOut className="w-4 h-4" /> Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AguardandoAprovacao;
