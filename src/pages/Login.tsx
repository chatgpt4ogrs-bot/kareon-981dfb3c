import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable";
import { Loader2, LogIn, Mail, ShieldCheck, Heart, CalendarCheck, BarChart3, User, Phone } from "lucide-react";
import PasswordInput from "@/components/PasswordInput";
import { Input } from "@/components/ui/input";

const GoogleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
  </svg>
);

const Login = () => {
  const navigate = useNavigate();
  const { signIn, signUp } = useAuth();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [emailNaoVerificado, setEmailNaoVerificado] = useState(false);
  const [loading, setLoading] = useState(false);

  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [emailSignup, setEmailSignup] = useState("");
  const [senhaSignup, setSenhaSignup] = useState("");
  const [erroSignup, setErroSignup] = useState("");
  const [okSignup, setOkSignup] = useState(false);
  const [loadingSignup, setLoadingSignup] = useState(false);

  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setEmailNaoVerificado(false);
    setLoading(true);
    try {
      const { error } = await signIn(email, senha);
      if (error) {
        if (error.message.includes("Email not confirmed")) setEmailNaoVerificado(true);
        else setErro(error.message);
      } else navigate("/");
    } catch {
      setErro("Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErroSignup("");
    setOkSignup(false);
    setLoadingSignup(true);
    try {
      const { error } = await signUp(emailSignup, senhaSignup, nome, telefone);
      if (error) setErroSignup(error.message);
      else setOkSignup(true);
    } catch {
      setErroSignup("Erro ao criar conta");
    } finally {
      setLoadingSignup(false);
    }
  };

  const handleGoogle = async () => {
    setLoadingGoogle(true);
    try {
      await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/` });
    } finally {
      setLoadingGoogle(false);
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

      <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12">
        {/* Lado esquerdo — Branding */}
        <div className="relative hidden lg:flex lg:col-span-5 flex-col justify-between p-12 xl:p-16 text-primary-foreground overflow-hidden">
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
                { icon: CalendarCheck, text: "Agenda inteligente e relatórios" },
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
        <div className="flex lg:col-span-7 items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md space-y-6 animate-fade-in">
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

            <div className="border border-border/60 bg-card/80 backdrop-blur-xl shadow-soft-lg p-7 sm:p-9 space-y-6 rounded-2xl shadow-2xl">
              <div className="space-y-1.5">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Bem-vindo</h2>
                <p className="text-sm text-muted-foreground">Entre na sua conta para continuar.</p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={handleGoogle}
                disabled={loadingGoogle}
                className="w-full h-11 rounded-lg gap-3 bg-background hover:bg-accent/30 border-border"
              >
                {loadingGoogle ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
                Continuar com Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-3 text-muted-foreground tracking-wider">ou</span>
                </div>
              </div>

              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-muted/60 rounded-lg">
                  <TabsTrigger value="login" className="rounded-md">Entrar</TabsTrigger>
                  <TabsTrigger value="signup" className="rounded-md">Criar conta</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-5">
                  <form onSubmit={handleLogin} className="space-y-5">
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
                          className="flex h-11 w-full rounded-lg border border-input bg-muted/40 pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:bg-background transition-all"
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
                        <AlertDescription>Verifique seu email para acessar o sistema.</AlertDescription>
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
                      Entrar
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-5">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome" className="text-foreground/80">Nome</Label>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          id="nome"
                          placeholder="Seu nome"
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          required
                          className="h-11 rounded-lg bg-muted/40 pl-9 focus-visible:bg-background"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="telefone" className="text-foreground/80">Telefone (opcional)</Label>
                      <div className="relative group">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          id="telefone"
                          placeholder="(11) 99999-9999"
                          value={telefone}
                          onChange={(e) => setTelefone(e.target.value)}
                          className="h-11 rounded-lg bg-muted/40 pl-9 focus-visible:bg-background"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email-signup" className="text-foreground/80">Email</Label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                          id="email-signup"
                          type="email"
                          placeholder="seu@email.com"
                          value={emailSignup}
                          onChange={(e) => setEmailSignup(e.target.value)}
                          required
                          className="h-11 rounded-lg bg-muted/40 pl-9 focus-visible:bg-background"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="senha-signup" className="text-foreground/80">Senha</Label>
                      <PasswordInput
                        id="senha-signup"
                        placeholder="Mínimo 6 caracteres"
                        value={senhaSignup}
                        onChange={(e) => setSenhaSignup(e.target.value)}
                        required
                        minLength={6}
                        className="h-11 rounded-lg bg-muted/40 focus-visible:bg-background"
                      />
                    </div>

                    {okSignup && (
                      <Alert>
                        <AlertDescription>Conta criada! Verifique seu email para ativar.</AlertDescription>
                      </Alert>
                    )}
                    {erroSignup && <p className="text-sm text-destructive">{erroSignup}</p>}

                    <Button
                      type="submit"
                      size="lg"
                      className="w-full h-11 rounded-lg gap-2 shadow-soft-md hover:shadow-soft-lg hover:-translate-y-0.5 transition-all"
                      disabled={loadingSignup}
                    >
                      {loadingSignup ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Criar conta
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>

            <p className="text-center text-xs text-muted-foreground leading-relaxed">
              Ao acessar o Kareon, você concorda com os{" "}
              <Link to="/termos-de-servico" className="underline hover:text-foreground transition-colors">Termos de Serviço</Link>,{" "}
              a <Link to="/politica-de-privacidade" className="underline hover:text-foreground transition-colors">Política de Privacidade</Link>{" "}
              e o <Link to="/aviso-de-saude" className="underline hover:text-foreground transition-colors">Aviso de Saúde</Link>, incluindo o tratamento de dados clínicos conforme a LGPD.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Login;
