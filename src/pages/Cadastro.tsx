import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Heart, Loader2 } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";
import PasswordValidation, { isPasswordValid } from "@/components/PasswordValidation";

const Cadastro = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (!isPasswordValid(senha)) {
      setErro("A senha não atende aos requisitos de segurança");
      return;
    }

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUp(email, senha, nome, telefone);
      if (error) {
        setErro(error.message);
      } else {
        navigate("/verificar-email", { state: { email } });
      }
    } catch {
      setErro("Erro ao criar conta");
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
          <p className="text-muted-foreground">Crie sua conta para começar</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Criar conta</CardTitle>
            <CardDescription>Preencha os dados abaixo para se cadastrar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome completo</Label>
                <Input id="nome" placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  maxLength={20}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <PasswordInput
                  id="senha"
                  placeholder="Crie uma senha segura"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
                <PasswordValidation password={senha} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmarSenha">Confirmar senha</Label>
                <PasswordInput
                  id="confirmarSenha"
                  placeholder="Repita a senha"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  required
                />
              </div>
              {erro && <p className="text-sm text-destructive">{erro}</p>}
              <Button type="submit" className="w-full" disabled={loading || !isPasswordValid(senha)}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar conta
              </Button>
            </form>

            <p className="text-sm text-muted-foreground text-center mt-4">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-primary hover:underline">Entrar</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Cadastro;
