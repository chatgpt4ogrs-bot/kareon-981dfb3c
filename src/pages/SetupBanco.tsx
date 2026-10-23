import { useState } from "react";
import { setupApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Database, CheckCircle2 } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

interface Props {
  onConfigured: () => void;
}

export default function SetupBanco({ onConfigured }: Props) {
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState("5432");
  const [database, setDatabase] = useState("kareon");
  const [user, setUser] = useState("postgres");
  const [password, setPassword] = useState("");
  const [adminEmail, setAdminEmail] = useState("admin@kareon.local");
  const [adminPassword, setAdminPassword] = useState("Admin@123");
  const [adminName, setAdminName] = useState("Admin Master");
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tested, setTested] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleTest() {
    setError(null);
    setTested(false);
    setTesting(true);
    try {
      await setupApi.test({ host, port: Number(port), user, password });
      setTested(true);
    } catch (e: any) {
      setError(e.message || "Falha na conexão");
    } finally {
      setTesting(false);
    }
  }

  async function handleConfigure(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const result = await setupApi.configure({
        host,
        port: Number(port),
        database,
        user,
        password,
        adminEmail,
        adminPassword,
        adminName,
      });
      setSuccess(
        `Pronto. Tabelas criadas. Entre com ${result.adminEmail}` +
          (result.defaultPasswordHint ? ` / senha ${result.defaultPasswordHint}` : "")
      );
      setTimeout(() => onConfigured(), 1200);
    } catch (err: any) {
      setError(err.message || "Falha na configuração");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-brand-cyan/20 blur-3xl" />
      </div>
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-3">
          <BrandMark variant="stacked" size="lg" className="mx-auto" />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Configuração inicial
          </h1>
          <p className="text-sm text-muted-foreground">
            Informe as credenciais do PostgreSQL. Na primeira execução o sistema cria o banco e
            todas as tabelas automaticamente.
          </p>
        </div>

        <form
          onSubmit={handleConfigure}
          className="bg-card border border-border rounded-2xl p-6 shadow-soft-md space-y-4"
        >
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="host">IP / Host</Label>
              <Input
                id="host"
                value={host}
                onChange={(e) => {
                  setHost(e.target.value);
                  setTested(false);
                }}
                placeholder="127.0.0.1"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="port">Porta</Label>
              <Input
                id="port"
                value={port}
                onChange={(e) => {
                  setPort(e.target.value);
                  setTested(false);
                }}
                placeholder="5432"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="database">Nome do banco</Label>
            <Input
              id="database"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder="kareon"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="user">Usuário</Label>
              <Input
                id="user"
                value={user}
                onChange={(e) => {
                  setUser(e.target.value);
                  setTested(false);
                }}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setTested(false);
                }}
              />
            </div>
          </div>

          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Administrador inicial
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="adminName">Nome</Label>
              <Input id="adminName" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="adminEmail">E-mail</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="adminPassword">Senha</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          {success && (
            <p className="text-sm text-primary bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {success}
            </p>
          )}
          {tested && !error && (
            <p className="text-sm text-primary flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Conexão com o PostgreSQL OK
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={handleTest}
              disabled={testing || saving}
            >
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : "Testar conexão"}
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Criando tabelas…
                </>
              ) : (
                "Salvar e criar tabelas"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
