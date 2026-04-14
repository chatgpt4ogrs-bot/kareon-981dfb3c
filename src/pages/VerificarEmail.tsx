import { useNavigate, useLocation, Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft } from "lucide-react";

const VerificarEmail = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const email = (location.state as any)?.email || "";

  if (!email) {
    navigate("/cadastro");
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Verifique seu email</h1>
          <p className="text-muted-foreground">
            Enviamos um link de confirmação para
          </p>
          <p className="font-medium text-foreground">{email}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Próximos passos</CardTitle>
            <CardDescription>Siga as instruções abaixo para ativar sua conta</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">1</span>
                <p className="text-sm text-foreground">Abra sua caixa de entrada (verifique também o spam)</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">2</span>
                <p className="text-sm text-foreground">Clique no link de confirmação no email</p>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 mt-0.5">3</span>
                <p className="text-sm text-foreground">Após confirmar, faça login normalmente</p>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <Link to="/login">
                <Button className="w-full gap-2">
                  <ArrowLeft className="w-4 h-4" /> Ir para o login
                </Button>
              </Link>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Não recebeu o email? Verifique sua pasta de spam ou tente se cadastrar novamente.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VerificarEmail;
