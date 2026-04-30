import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, Loader2 } from "lucide-react";
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
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Kareon</h1>
          <p className="text-muted-foreground">Gestão completa para a sua clínica</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Entrar</CardTitle>
            <CardDescription>Acesse sua conta para gerenciar pacientes e sessões</CardDescription>
          </CardHeader>
          <CardContent>
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Entrar
              </Button>
            </form>

            <div className="flex justify-between mt-4 text-sm">
              <Link to="/esqueci-senha" className="text-primary hover:underline">Esqueci minha senha</Link>
              <Link to="/cadastro" className="text-primary hover:underline">Criar conta</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
