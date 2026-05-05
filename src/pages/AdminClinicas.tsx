import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Building2, Eye } from "lucide-react";
import { format } from "date-fns";
import ClinicaDetalheDrawer from "@/components/admin/ClinicaDetalheDrawer";

const AdminClinicas = () => {
  const queryClient = useQueryClient();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"view" | "edit" | "create">("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: clinicas = [], isLoading } = useQuery({
    queryKey: ["admin-clinicas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clinicas").select("*").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clinicas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-clinicas"] });
      toast({ title: "Clínica removida" });
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
          <h1 className="text-2xl font-bold text-foreground">Clínicas</h1>
          <p className="text-muted-foreground">Gerencie todas as clínicas do sistema</p>
        </div>
        <Button className="gap-2" onClick={() => openDrawer(null, "create")}>
          <Plus className="w-4 h-4" /> Nova clínica
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-muted-foreground">Carregando...</p>
          ) : clinicas.length === 0 ? (
            <div className="p-12 text-center">
              <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">Nenhuma clínica cadastrada</p>
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
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Remover esta clínica?")) deleteMutation.mutate(c.id); }}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
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
    </div>
  );
};

export default AdminClinicas;
