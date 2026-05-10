import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { User, Mail, Building2, Shield, Key, Camera, Pencil, Save, X, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { AvatarUploader } from "@/components/AvatarUploader";

const roleLabels: Record<string, string> = {
  admin: "Admin Master",
  clinica_admin: "Admin Clínica",
  responsavel_clinica: "Responsável",
  terapeuta: "Terapeuta",
  familiar: "Familiar",
};

const Perfil = () => {
  const { profile, roles, refreshProfile } = useAuth();
  const [uploaderOpen, setUploaderOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: clinica } = useQuery({
    queryKey: ["clinica-perfil", profile?.clinica_id],
    queryFn: async () => {
      if (!profile?.clinica_id) return null;
      const { data } = await supabase
        .from("clinicas")
        .select("nome")
        .eq("id", profile.clinica_id)
        .single();
      return data;
    },
    enabled: !!profile?.clinica_id,
  });

  const initials = profile?.nome
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  const startEdit = () => {
    setNome(profile?.nome || "");
    setEmail(profile?.email || "");
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    if (!profile) return;
    const nomeTrim = nome.trim();
    const emailTrim = email.trim().toLowerCase();
    if (!nomeTrim) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    if (nomeTrim.length > 100) {
      toast({ title: "Nome muito longo", description: "Máximo 100 caracteres.", variant: "destructive" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrim)) {
      toast({ title: "Email inválido", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const emailChanged = emailTrim !== (profile.email || "").toLowerCase();
      const nomeChanged = nomeTrim !== (profile.nome || "");

      if (nomeChanged) {
        const { error } = await supabase
          .from("profiles")
          .update({ nome: nomeTrim })
          .eq("id", profile.id);
        if (error) throw error;
      }

      if (emailChanged) {
        const { error } = await supabase.auth.updateUser({ email: emailTrim });
        if (error) throw error;
        toast({
          title: "Confirme seu novo email",
          description: "Enviamos um link de confirmação para o novo endereço. O email só será alterado após a confirmação.",
        });
      }

      if (nomeChanged && !emailChanged) {
        toast({ title: "Perfil atualizado" });
      }

      await refreshProfile();
      setEditing(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setUploaderOpen(true)}
              className="relative group rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Alterar foto de perfil"
            >
              <Avatar className="w-20 h-20">
                {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile.nome} />}
                <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-5 h-5 text-white" />
              </span>
            </button>
            <div>
              <CardTitle className="text-xl">{profile?.nome || "Usuário"}</CardTitle>
              <div className="flex gap-2 mt-1 flex-wrap">
                {roles.map((role) => (
                  <Badge key={role} variant="secondary" className="text-xs">
                    {roleLabels[role] || role}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {editing ? (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="perfil-nome">Nome</Label>
                <Input
                  id="perfil-nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={100}
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="perfil-email">Email</Label>
                <Input
                  id="perfil-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  disabled={saving}
                />
                <p className="text-xs text-muted-foreground">
                  Ao alterar o email, você precisará confirmar pelo link enviado ao novo endereço.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="text-sm font-medium text-foreground">{profile?.nome}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium text-foreground">{profile?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Tipo de usuário</p>
                  <p className="text-sm font-medium text-foreground">
                    {roles.map((r) => roleLabels[r] || r).join(", ") || "—"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Clínica vinculada</p>
                  <p className="text-sm font-medium text-foreground">
                    {clinica?.nome || "Nenhuma"}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="pt-2 flex flex-wrap gap-2">
            {editing ? (
              <>
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar
                </Button>
                <Button variant="outline" onClick={cancelEdit} disabled={saving} className="gap-2">
                  <X className="w-4 h-4" /> Cancelar
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={startEdit} className="gap-2">
                  <Pencil className="w-4 h-4" /> Editar perfil
                </Button>
                <Link to="/alterar-senha">
                  <Button variant="outline" className="gap-2">
                    <Key className="w-4 h-4" /> Alterar senha
                  </Button>
                </Link>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <AvatarUploader
        open={uploaderOpen}
        onOpenChange={setUploaderOpen}
        onUploaded={() => refreshProfile()}
      />
    </div>
  );
};

export default Perfil;
