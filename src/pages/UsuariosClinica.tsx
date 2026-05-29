import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Users, CheckCircle2, XCircle, Loader2, Camera } from "lucide-react";
import { format } from "date-fns";
import CameraFamiliarModal from "@/components/cameras/CameraFamiliarModal";

const statusLabels: Record<string, string> = {
  pendente: "Pendente",
  ativo: "Ativo",
  bloqueado: "Bloqueado",
};

const statusBadge = (status: string) => {
  if (status === "ativo") return "default" as const;
  if (status === "pendente") return "secondary" as const;
  return "destructive" as const;
};

const UsuariosClinica = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [cameraModal, setCameraModal] = useState<{ open: boolean; profileId: string; nome: string }>({
    open: false, profileId: "", nome: "",
  });

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["clinica-usuarios", profile?.clinica_id],
    queryFn: async () => {
      if (!profile?.clinica_id) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("clinic_id", profile.clinica_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        nome: p.name,
        cargo: p.role,
        user_id: p.id,
      }));
    },
    enabled: !!profile?.clinica_id,
  });

  const getUserRoles = (userId: string) => {
    const u = usuarios.find((usr) => usr.user_id === userId);
    return u?.cargo ? [u.cargo] : [];
  };

  const isFamiliar = (userId: string) => getUserRoles(userId).includes("familiar");

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      const qk = ["clinica-usuarios", profile?.clinica_id];
      await queryClient.cancelQueries({ queryKey: qk });
      const prev = queryClient.getQueryData(qk);
      queryClient.setQueryData(qk, (old: any[]) =>
        old?.map((u) => u.id === id ? { ...u, status } : u)
      );
      toast({
        title: status === "ativo" ? "Usuário aprovado!" : "Usuário bloqueado",
        description: status === "ativo"
          ? "O usuário agora pode acessar o sistema."
          : "O acesso do usuário foi bloqueado.",
      });
      return { prev, qk };
    },
    onError: (err: any, _, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(ctx.qk, ctx.prev);
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["clinica-usuarios"] });
    },
  });

  const pendentes = usuarios.filter((u) => u.status === "pendente");
  const outros = usuarios.filter((u) => u.status !== "pendente");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Usuários</h1>
        <p className="text-muted-foreground">Gerencie e aprove os usuários da sua clínica</p>
      </div>

      {pendentes.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-amber-600" />
              <h2 className="font-semibold text-foreground">
                Aguardando aprovação ({pendentes.length})
              </h2>
            </div>
            <div className="space-y-3">
              {pendentes.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                  <div>
                    <p className="font-medium text-foreground">{u.nome}</p>
                    <p className="text-sm text-muted-foreground">{u.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Cadastro: {format(new Date(u.created_at), "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="gap-1"
                      onClick={() => updateStatusMutation.mutate({ id: u.id, status: "ativo" })}
                      disabled={updateStatusMutation.isPending}
                    >
                      <CheckCircle2 className="w-4 h-4" /> Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive"
                      onClick={() => updateStatusMutation.mutate({ id: u.id, status: "bloqueado" })}
                      disabled={updateStatusMutation.isPending}
                    >
                      <XCircle className="w-4 h-4" /> Rejeitar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : outros.length === 0 && pendentes.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhum usuário na clínica</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead className="w-36">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outros.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground">{u.cargo || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={statusBadge(u.status)}>
                        {statusLabels[u.status] || u.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(u.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {isFamiliar(u.user_id) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => setCameraModal({ open: true, profileId: u.id, nome: u.nome })}
                          >
                            <Camera className="w-3.5 h-3.5" /> Câmeras
                          </Button>
                        )}
                        {u.status === "bloqueado" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({ id: u.id, status: "ativo" })}
                            disabled={updateStatusMutation.isPending}
                          >
                            Reativar
                          </Button>
                        )}
                        {u.status === "ativo" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => updateStatusMutation.mutate({ id: u.id, status: "bloqueado" })}
                            disabled={updateStatusMutation.isPending}
                          >
                            Bloquear
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {profile?.clinica_id && (
        <CameraFamiliarModal
          open={cameraModal.open}
          onOpenChange={(open) => setCameraModal((prev) => ({ ...prev, open }))}
          profileId={cameraModal.profileId}
          profileNome={cameraModal.nome}
          clinicaId={profile.clinica_id}
        />
      )}
    </div>
  );
};

export default UsuariosClinica;
