import { useAuth } from "@/contexts/AuthContext";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Building2, Shield, Key, Camera } from "lucide-react";
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

          <div className="pt-2">
            <Link to="/alterar-senha">
              <Button variant="outline" className="gap-2">
                <Key className="w-4 h-4" /> Alterar senha
              </Button>
            </Link>
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
