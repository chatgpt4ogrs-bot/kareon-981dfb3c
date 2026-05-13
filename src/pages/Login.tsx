import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, UserPlus, LogIn, Mail, ShieldCheck, Heart, CalendarCheck, BarChart3 } from "lucide-react";
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
    <main className="min-h-screen w-full bg-background relative overflow-hidden">
      <h1 className="sr-only">Kareon — Acesso à plataforma de gestão terapêutica pediátrica</h1>
      {/* Background decorativo */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-32 -left-32 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl opacity-60" />
        <div className="absolute top-1/2 -right-32 w-[32rem] h-[32rem] rounded-full bg-secondary/20 blur-3xl opacity-50" />
        <div className="absolute bottom-0 left-1/3 w-[24rem] h-[24rem] rounded-full bg-accent/10 blur-3xl opacity-50" />
      </div>

      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
        {/* Lado esquerdo — Branding */}
        <div className="relative hidden lg:flex flex-col justify-between p-12 xl:p-16 text-primary-foreground overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-[hsl(217_89%_42%)]" />
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,white,transparent_45%)]" />
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_80%_80%,white,transparent_40%)]" />

          <div className="relative z-10 animate-fade-in">
            <div className="inline-flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/25">
                <Heart className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold tracking-tight">Kareon</span>
            </div>
          </div>

          <div className="relative z-10 space-y-8 animate-fade-in">
            <div className="space-y-4 max-w-md">
              <h2 className="text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight text-white">
                Gestão inteligente para clínicas modernas.
              </h2>
              <p className="text-base xl:text-lg text-white/90 leading-relaxed">
                Centralize agendamentos, evolução de pacientes e relatórios em uma plataforma simples, segura e feita para o seu dia a dia clínico.
              </p>
            </div>

            <div className="grid gap-3 max-w-md">
              {[
                { icon: CalendarCheck, text: "Agenda inteligente e relatórios em PDF" },
                { icon: BarChart3, text: "Acompanhamento de evolução em tempo real" },
                { icon: ShieldCheck, text: "Segurança e privacidade dos dados clínicos" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur-sm px-4 py-3 ring-1 ring-white/15">
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm text-white">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 text-xs text-white/80">
            © {new Date().getFullYear()} Kareon · Todos os direitos reservados
          </div>
        </div>

        {/* Lado direito — Formulário */}
        <div className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md space-y-8 animate-fade-in">
            {/* Logo mobile */}
            <div className="flex lg:hidden flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-soft-md">
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold tracking-tight">Kareon</p>
                <p className="text-sm text-muted-foreground">Gestão inteligente para clínicas modernas</p>
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl shadow-soft-lg transition-all hover:shadow-soft-lg p-7 sm:p-9 space-y-6">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Bem-vindo de volta</h2>
                <p className="text-sm text-muted-foreground">Acesse sua conta para continuar</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-foreground/80">Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="flex h-11 w-full rounded-lg border border-input bg-muted/40 pl-9 pr-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:bg-background transition-all disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="senha" className="text-foreground/80">Senha</Label>
                    <Link to="/esqueci-senha" className="text-xs font-medium text-primary hover:underline">
                      Esqueceu?
                    </Link>
                  </div>
                  <PasswordInput
                    id="senha"
                    placeholder="••••••••"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                    className="h-11 rounded-lg bg-muted/40 focus-visible:bg-background transition-all"
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

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-11 rounded-lg gap-2 shadow-soft-md hover:shadow-soft-lg hover:-translate-y-0.5 transition-all"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                  Acessar
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-3 text-muted-foreground tracking-wider">ou</span>
                </div>
              </div>

              <Link to="/cadastro" className="block">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-11 rounded-lg gap-2 hover:bg-accent/50 hover:border-primary/40 transition-all"
                >
                  <UserPlus className="w-4 h-4" /> Criar nova conta
                </Button>
              </Link>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Ao continuar, você concorda com nossos termos de uso e política de privacidade.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Login;
