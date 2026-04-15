import { useState } from "react";
import { useCameras, useCameraMutations } from "@/hooks/use-cameras";
import { useAuth } from "@/contexts/AuthContext";
import CameraFeed from "@/components/CameraFeed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Pencil, Camera, Video, Settings } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const Cameras = () => {
  const { data: cameras = [], isLoading } = useCameras();
  const { create, update, remove } = useCameraMutations();
  const { profile, isAdmin, hasRole } = useAuth();
  const canManage = isAdmin || hasRole("clinica_admin");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ nome: "", localizacao: "", stream_url: "", tipo: "hls" });

  const activeCameras = cameras.filter((c) => c.status === "ativa");

  const resetForm = () => {
    setForm({ nome: "", localizacao: "", stream_url: "", tipo: "hls" });
    setEditingId(null);
  };

  const openEdit = (cam: typeof cameras[0]) => {
    setForm({ nome: cam.nome, localizacao: cam.localizacao || "", stream_url: cam.stream_url, tipo: cam.tipo });
    setEditingId(cam.id);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.nome || !form.stream_url) {
      toast({ title: "Preencha nome e URL do stream", variant: "destructive" });
      return;
    }
    try {
      if (editingId) {
        await update.mutateAsync({ id: editingId, ...form });
        toast({ title: "Câmera atualizada" });
      } else {
        await create.mutateAsync({ ...form, clinica_id: profile!.clinica_id! });
        toast({ title: "Câmera adicionada" });
      }
      setDialogOpen(false);
      resetForm();
    } catch (e: any) {
      toast({ title: "Erro ao salvar câmera", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove.mutateAsync(id);
      toast({ title: "Câmera removida" });
    } catch (e: any) {
      toast({ title: "Erro ao remover", description: e.message, variant: "destructive" });
    }
  };

  const handleToggleStatus = async (cam: typeof cameras[0]) => {
    await update.mutateAsync({ id: cam.id, status: cam.status === "ativa" ? "inativa" : "ativa" });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><p className="text-muted-foreground">Carregando câmeras...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Câmeras</h1>
          <p className="text-muted-foreground text-sm">Monitoramento ao vivo e gestão de câmeras</p>
        </div>
        {canManage && (
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> Adicionar câmera</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar câmera" : "Nova câmera"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome</Label>
                  <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Sala 1" />
                </div>
                <div>
                  <Label>Localização</Label>
                  <Input value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} placeholder="Sala de terapia A" />
                </div>
                <div>
                  <Label>URL do Stream</Label>
                  <Input value={form.stream_url} onChange={(e) => setForm({ ...form, stream_url: e.target.value })} placeholder="https://..." />
                </div>
                <div>
                  <Label>Tipo</Label>
                  <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hls">HLS (m3u8)</SelectItem>
                      <SelectItem value="mjpeg">MJPEG</SelectItem>
                      <SelectItem value="rtsp">RTSP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full" onClick={handleSubmit} disabled={create.isPending || update.isPending}>
                  {editingId ? "Salvar" : "Adicionar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Tabs defaultValue="live">
        <TabsList>
          <TabsTrigger value="live" className="gap-2"><Video className="w-4 h-4" /> Ao vivo ({activeCameras.length})</TabsTrigger>
          {canManage && <TabsTrigger value="manage" className="gap-2"><Settings className="w-4 h-4" /> Gerenciar</TabsTrigger>}
        </TabsList>

        <TabsContent value="live" className="mt-4">
          {activeCameras.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Camera className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground">Nenhuma câmera ativa</p>
                {canManage && <p className="text-sm text-muted-foreground">Adicione câmeras na aba Gerenciar</p>}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeCameras.map((cam) => (
                <CameraFeed key={cam.id} camera={cam} />
              ))}
            </div>
          )}
        </TabsContent>

        {canManage && (
          <TabsContent value="manage" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Câmeras cadastradas</CardTitle>
              </CardHeader>
              <CardContent>
                {cameras.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhuma câmera cadastrada</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Localização</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cameras.map((cam) => (
                        <TableRow key={cam.id}>
                          <TableCell className="font-medium">{cam.nome}</TableCell>
                          <TableCell>{cam.localizacao || "—"}</TableCell>
                          <TableCell><Badge variant="outline">{cam.tipo.toUpperCase()}</Badge></TableCell>
                          <TableCell>
                            <Badge
                              variant={cam.status === "ativa" ? "default" : "secondary"}
                              className="cursor-pointer"
                              onClick={() => handleToggleStatus(cam)}
                            >
                              {cam.status === "ativa" ? "Ativa" : "Inativa"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button variant="ghost" size="icon" onClick={() => openEdit(cam)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(cam.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default Cameras;
