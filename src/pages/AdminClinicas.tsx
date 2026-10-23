import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Building2, Eye } from "lucide-react";
import { format } from "date-fns";
import ClinicaDetalheDrawer from "@/components/admin/ClinicaDetalheDrawer";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import { useAuth } from "@/contexts/AuthContext";
import { deleteWithAudit } from "@/lib/audit";

const AdminClinicas = () => {
  const { isAdmin, isPlatformSupervisor, clinicScope } = useAuth();
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"view" | "edit" | "create">("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; nome: string } | null>(null);

  const { data: clinicas = [], isLoading, error: listError, refetch } = useQuery({
    queryKey: ["admin-clinicas", clinicScope],
    queryFn: async () => {
      if (clinicScope && clinicScope.length === 0) return [];
      return api<any[]>("/clinics");
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      await deleteWithAudit("clinica", id, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clinicas"] });
      queryClient.invalidateQueries({ queryKey: ["admin-usuarios-clinicas"] });
      queryClient.invalidateQueries({ queryKey: ["audit-logs"] });
      toast({ title: "Clínica excluída" });
    },
    onError: (err: any) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const openDrawer = (id: string | null, mode: "view" | "edit" | "create") => {
    setSelectedId(id);
    setDrawerMode(mode);
    setDrawerOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{isAdmin ? "Clínicas" : "Minhas clínicas"}</h1>
          <p className="text-muted-foreground">
            {isAdmin ? "Gerencie todas as clínicas do sistema" : "Clínicas vinculadas à sua conta"}
          </p>
        </div>
        {isAdmin && (
          <Button className="gap-2" onClick={() => openDrawer(null, "create")}>
            <Plus className="w-4 h-4" /> Nova clínica
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-muted-foreground">Carregando...</p>
          ) : listError ? (
            <div className="p-12 text-center space-y-3">
              <p className="text-sm text-destructive">Não foi possível carregar as clínicas: {(listError as Error).message}</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>Tentar novamente</Button>
            </div>
          ) : clinicas.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {isPlatformSupervisor ? "Nenhuma clínica vinculada a você. Entre em contato com o suporte para vincular suas clínicas." : "Nenhuma clínica cadastrada"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Criada em</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clinicas.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => openDrawer(c.id, "view")}>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{format(new Date(c.created_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openDrawer(c.id, "view")}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openDrawer(c.id, "edit")}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        {isAdmin && (
                          <>
                            <Button variant="ghost" size="icon" aria-label={`Excluir ${c.nome}`} onClick={() => setDeleteTarget({ id: c.id, nome: c.nome })}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </>
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

      <ClinicaDetalheDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        clinicaId={selectedId}
        mode={drawerMode}
      />

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Excluir clínica?"
        itemName={deleteTarget?.nome}
        description="Esta ação é permanente e os dados vinculados à clínica podem ser perdidos."
        onConfirm={async (reason) => {
          if (deleteTarget) await deleteMutation.mutateAsync({ id: deleteTarget.id, reason });
        }}
      />
    </div>
  );
};

export default AdminClinicas;
