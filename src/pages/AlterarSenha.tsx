import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Lock, CheckCircle } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";
import PasswordValidation, { isPasswordValid } from "@/components/PasswordValidation";

const AlterarSenha = () => {
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (!isPasswordValid(novaSenha)) {
      setErro("A nova senha não atende aos requisitos");
      return;
    }
    if (novaSenha !== confirmar) {
      setErro("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      // Verify current password by re-authenticating
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        setErro("Usuário não encontrado");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: senhaAtual,
      });
      if (signInError) {
        setErro("Senha atual incorreta");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) {
        setErro(error.message);
      } else {
        setSucesso(true);
        setSenhaAtual("");
        setNovaSenha("");
        setConfirmar("");
      }
    } catch {
      setErro("Erro ao alterar senha");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-8 px-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
          <Lock className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alterar senha</h1>
          <p className="text-sm text-muted-foreground">Atualize sua senha de acesso</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nova senha</CardTitle>
          <CardDescription>Preencha os campos para alterar sua senha</CardDescription>
        </CardHeader>
        <CardContent>
          {sucesso && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-green-50 text-green-700 text-sm">
              <CheckCircle className="w-4 h-4" />
              Senha alterada com sucesso!
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senhaAtual">Senha atual</Label>
              <PasswordInput
                id="senhaAtual"
                placeholder="Digite sua senha atual"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="novaSenha">Nova senha</Label>
              <PasswordInput
                id="novaSenha"
                placeholder="Digite a nova senha"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                required
              />
              <PasswordValidation password={novaSenha} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmar">Confirmar nova senha</Label>
              <PasswordInput
                id="confirmar"
                placeholder="Repita a nova senha"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                required
              />
            </div>
            {erro && <p className="text-sm text-destructive">{erro}</p>}
            <Button type="submit" className="w-full" disabled={loading || !isPasswordValid(novaSenha)}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Alterar senha
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AlterarSenha;
