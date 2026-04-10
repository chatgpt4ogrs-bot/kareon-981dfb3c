import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { setAuth } from "@/lib/store";
import { isDemoLogin, loadDemoData } from "@/lib/demo-data";
import { Heart } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (isDemoLogin(email, senha)) {
      loadDemoData();
      setAuth({ nome: "Dra. Camila Terapeuta", email });
      navigate("/");
      return;
    }

    // For now, any email+password works (localStorage auth)
    if (email && senha.length >= 6) {
      setAuth({ nome: email.split("@")[0], email });
      navigate("/");
    } else {
      setErro("Email e senha (mín. 6 caracteres) são obrigatórios");
    }
  };

  const fillDemo = () => {
    setEmail("teste@clinica.com");
    setSenha("123456");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Kareon</h1>
          <p className="text-muted-foreground">Gestão terapêutica para pediatria</p>
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
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input id="senha" type="password" placeholder="••••••" value={senha} onChange={(e) => setSenha(e.target.value)} required />
              </div>
              {erro && <p className="text-sm text-destructive">{erro}</p>}
              <Button type="submit" className="w-full">Entrar</Button>
            </form>

            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center mb-3">Acesso de demonstração</p>
              <Button type="button" variant="outline" className="w-full text-sm" onClick={fillDemo}>
                Usar login de teste
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                teste@clinica.com · 123456
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
