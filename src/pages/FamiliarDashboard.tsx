import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Loader2, Heart, CalendarDays, Target, TrendingUp, Camera } from "lucide-react";
import { format, isToday, isFuture } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const engajamentoEmoji: Record<string, string> = { baixo: "😔", medio: "😐", alto: "😊" };
const progressoLabel: Record<string, string> = { regressao: "Regressão", manteve: "Estável", progresso_leve: "Progresso leve", progresso_significativo: "Progresso significativo" };

function useFamiliarData() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["familiar-data", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Get profile id
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profileData) return { pacientes: [], sessoes: [], objetivos: [], cameras: [] };

      // Get linked patients via paciente_usuarios
      const { data: vinculos } = await supabase
        .from("paciente_usuarios")
        .select("paciente_id")
        .eq("profile_id", profileData.id)
        .eq("tipo", "familiar");

      const pacienteIds = (vinculos || []).map((v: any) => v.paciente_id);
      if (pacienteIds.length === 0) return { pacientes: [], sessoes: [], objetivos: [], cameras: [] };

      const [pacientesRes, sessoesRes, objetivosRes] = await Promise.all([
        supabase.from("pacientes").select("*").in("id", pacienteIds),
        supabase.from("sessoes").select("*").in("paciente_id", pacienteIds).order("data_hora", { ascending: false }).limit(20),
        supabase.from("objetivos").select("*").in("paciente_id", pacienteIds),
      ]);

      // Get linked cameras
      const { data: cameraVinculos } = await supabase
        .from("camera_usuarios")
        .select("camera_id")
        .eq("profile_id", profileData.id);
      const cameraIds = (cameraVinculos || []).map((v: any) => v.camera_id);
      const camerasRes = cameraIds.length > 0
        ? await supabase.from("cameras").select("*").in("id", cameraIds).eq("status", "ativa")
        : { data: [] };

      return {
        pacientes: pacientesRes.data || [],
        sessoes: sessoesRes.data || [],
        objetivos: objetivosRes.data || [],
        cameras: camerasRes.data || [],
      };
    },
    enabled: !!user?.id,
  });
}

const FamiliarDashboard = () => {
  const { profile } = useAuth();
  const { data, isLoading } = useFamiliarData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const pacientes = data?.pacientes || [];
  const sessoes = data?.sessoes || [];
  const objetivos = data?.objetivos || [];
  const cameras = data?.cameras || [];

  if (pacientes.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Olá, {profile?.nome?.split(" ")[0] || "Familiar"} 👋</h1>
          <p className="text-muted-foreground">Área do responsável</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Heart className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-center">Nenhum paciente vinculado à sua conta ainda.</p>
            <p className="text-sm text-muted-foreground text-center mt-1">Entre em contato com a clínica para vincular o paciente.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const objetivosAtivos = objetivos.filter((o: any) => o.status === "em_andamento");

  const proximasSessoes = sessoes
    .filter((s: any) => isFuture(new Date(s.data_hora)) || isToday(new Date(s.data_hora)))
    .slice(0, 5);

  const ultimasSessoes = sessoes
    .filter((s: any) => !isFuture(new Date(s.data_hora)))
    .slice(0, 5);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Olá, {profile?.nome?.split(" ")[0] || "Familiar"} 👋</h1>
        <p className="text-muted-foreground">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
      </div>

      {pacientes.map((pac: any) => {
        const pacObjetivos = objetivos.filter((o: any) => o.paciente_id === pac.id);
        const pacProgresso = pacObjetivos.length > 0
          ? Math.round(pacObjetivos.reduce((s: number, o: any) => s + o.progresso, 0) / pacObjetivos.length)
          : 0;
        const pacSessoes = sessoes.filter((s: any) => s.paciente_id === pac.id);

        return (
          <Card key={pac.id} className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">{pac.nome.charAt(0)}</div>
                <div>
                  <CardTitle className="text-lg">{pac.nome}</CardTitle>
                  <p className="text-sm text-muted-foreground">{pac.diagnostico || "—"}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{pacSessoes.length}</p>
                  <p className="text-xs text-muted-foreground">Sessões</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-foreground">{pacObjetivos.filter((o: any) => o.status === "em_andamento").length}</p>
                  <p className="text-xs text-muted-foreground">Objetivos ativos</p>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-2xl font-bold text-secondary">{pacProgresso}%</p>
                  <p className="text-xs text-muted-foreground">Progresso</p>
                </div>
              </div>
              {pacObjetivos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Progresso geral</p>
                  <div className="flex items-center gap-3">
                    <Progress value={pacProgresso} className="flex-1 h-3" />
                    <span className="text-sm font-bold text-primary">{pacProgresso}%</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> Próximas sessões
            </CardTitle>
          </CardHeader>
          <CardContent>
            {proximasSessoes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma sessão agendada</p>
            ) : (
              <div className="space-y-3">
                {proximasSessoes.map((s: any) => {
                  const pac = pacientes.find((p: any) => p.id === s.paciente_id);
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="w-1 h-10 rounded-full bg-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{pac?.nome}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(s.data_hora), "dd/MM · HH:mm")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-secondary" /> Objetivos em andamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {objetivosAtivos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum objetivo em andamento</p>
            ) : (
              <div className="space-y-3">
                {objetivosAtivos.slice(0, 5).map((o: any) => (
                  <div key={o.id} className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-foreground">{o.titulo || o.descricao}</p>
                      <span className="text-xs font-medium text-primary">{o.progresso}%</span>
                    </div>
                    <Progress value={o.progresso} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {ultimasSessoes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-accent" /> Últimas sessões realizadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ultimasSessoes.map((s: any) => {
                const pac = pacientes.find((p: any) => p.id === s.paciente_id);
                const eng = s.engajamento || "medio";
                const prog = s.progresso_observado || "manteve";
                return (
                  <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-1 h-10 rounded-full bg-accent shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-foreground">{pac?.nome}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(s.data_hora), "dd/MM/yyyy · HH:mm")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span title="Engajamento">{engajamentoEmoji[eng]}</span>
                      <Badge variant="outline" className="text-xs">{progressoLabel[prog] || "Estável"}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {cameras.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Camera className="w-5 h-5 text-primary" /> Câmeras ao vivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              {cameras.length} câmera{cameras.length !== 1 ? "s" : ""} disponível{cameras.length !== 1 ? "is" : ""}
            </p>
            <Link to="/cameras">
              <Button variant="outline" className="gap-2"><Camera className="w-4 h-4" /> Ver câmeras</Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FamiliarDashboard;
