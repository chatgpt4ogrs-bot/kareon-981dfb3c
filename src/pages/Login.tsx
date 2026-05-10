import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, Loader2, UserPlus, LogIn } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";

const Login = () => {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [emailNaoVerificado, setEmailNaoVerificado] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setEmailNaoVerificado(false);
    setLoading(true);

    try {
      const { error } = await signIn(email, senha);
      if (error) {
        if (error.message.includes("Email not confirmed")) {
          setEmailNaoVerificado(true);
        } else {
          setErro(error.message);
        }
      } else {
        navigate("/");
      }
    } catch {
      setErro("Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Kareon</h1>
          <p className="text-muted-foreground">Gestão completa para a sua clínica</p>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              {/* Lado esquerdo — Login */}
              <div className="p-6 md:p-8 space-y-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-foreground">Acesse sua conta</h2>
                  <p className="text-sm text-muted-foreground">Entre com seu email e senha</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="senha">Senha</Label>
                    <PasswordInput
                      id="senha"
                      placeholder="••••••••"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      required
                    />
                  </div>

                  {emailNaoVerificado && (
                    <Alert>
                      <AlertDescription>
                        Verifique seu email para acessar o sistema. Enviamos um código de verificação para o endereço cadastrado.
                      </AlertDescription>
                    </Alert>
                  )}

                  {erro && <p className="text-sm text-destructive">{erro}</p>}

                  <Button type="submit" className="w-full gap-2" disabled={loading}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                    Acessar
                  </Button>
                </form>

                <div className="text-sm">
                  <Link to="/esqueci-senha" className="text-primary hover:underline">
                    Esqueceu a senha?
                  </Link>
                </div>
              </div>

              {/* Lado direito — Criar conta */}
              <div className="p-6 md:p-8 flex flex-col justify-center space-y-4 bg-muted/30">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-foreground">Ainda não tem uma conta?</h2>
                  <p className="text-sm text-muted-foreground">
                    Crie sua conta em instantes para começar a gerenciar sua clínica.
                  </p>
                </div>
                <Link to="/cadastro">
                  <Button variant="outline" className="gap-2">
                    <UserPlus className="w-4 h-4" /> Criar conta
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
