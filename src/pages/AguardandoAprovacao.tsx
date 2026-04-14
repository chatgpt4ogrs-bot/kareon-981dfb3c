import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Clock, LogOut, Heart } from "lucide-react";

const AguardandoAprovacao = () => {
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
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="w-8 h-8 text-amber-600" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-primary" />
              <span className="font-bold text-lg text-foreground">Kareon</span>
            </div>
            <h1 className="text-xl font-bold text-foreground">
              Aguardando aprovação da clínica
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Olá{profile?.nome ? `, ${profile.nome.split(" ")[0]}` : ""}! Seu cadastro foi realizado com sucesso.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Seu acesso será liberado após a confirmação do responsável pela clínica. 
              Você receberá acesso assim que for aprovado.
            </p>
          </div>

          <div className="bg-muted/50 rounded-lg p-4">
            <p className="text-xs text-muted-foreground">
              Se você acredita que isso é um erro, entre em contato com o administrador da sua clínica.
            </p>
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
