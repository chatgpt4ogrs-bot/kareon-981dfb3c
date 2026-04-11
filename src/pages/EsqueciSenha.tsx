import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Loader2, Mail } from "lucide-react";

const EsqueciSenha = () => {
  const [email, setEmail] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (error) {
        setErro(error.message);
      } else {
        setEnviado(true);
      }
    } catch {
      setErro("Erro ao enviar email de recuperação");
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <Mail className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Email enviado</h1>
            <p className="text-muted-foreground">
              Se o email <strong>{email}</strong> estiver cadastrado, você receberá um link para redefinir sua senha.
            </p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <Alert>
                <AlertDescription>Verifique sua caixa de entrada e spam.</AlertDescription>
              </Alert>
              <Link to="/login" className="block mt-4">
                <Button variant="outline" className="w-full">Voltar para o login</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Heart className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Kareon</h1>
          <p className="text-muted-foreground">Recupere o acesso à sua conta</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Esqueci minha senha</CardTitle>
            <CardDescription>Informe seu email para receber o link de redefinição</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              {erro && <p className="text-sm text-destructive">{erro}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Enviar link de recuperação
              </Button>
            </form>
            <p className="text-sm text-muted-foreground text-center mt-4">
              <Link to="/login" className="text-primary hover:underline">Voltar para o login</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EsqueciSenha;
