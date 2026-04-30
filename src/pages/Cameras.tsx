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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Cameras = () => {
  const { data: cameras = [], isLoading } = useCameras();
  const { create, update, remove } = useCameraMutations();
  const { profile, isAdmin, hasRole } = useAuth();
  const canManage = isAdmin || hasRole("clinica_admin");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "",
    localizacao: "",
    stream_url: "",
    tipo: "hls" as "hls" | "mjpeg" | "rtsp",
    clinica_id: "",
    fabricante: "intelbras",
    modo_conexao: "ip",
    cloud_id: "",
    ip_principal: "",
    ip_alternativo: "",
    dominio_ddns: "",
    registro_auto_id: "",
    porta_servico: "37777",
    porta_web: "80",
    usuario: "admin",
    senha: "",
    canal: "1",
  });

  // Fetch clinicas for admin
  const { data: clinicas = [] } = useQuery({
    queryKey: ["clinicas-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clinicas").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const activeCameras = cameras.filter((c) => c.status === "ativa");

  const resetForm = () => {
    setForm({
      nome: "",
      localizacao: "",
      stream_url: "",
      tipo: "hls",
      clinica_id: "",
      fabricante: "intelbras",
      modo_conexao: "ip",
      cloud_id: "",
      ip_principal: "",
      ip_alternativo: "",
      dominio_ddns: "",
      registro_auto_id: "",
      porta_servico: "37777",
      porta_web: "80",
      usuario: "admin",
      senha: "",
      canal: "1",
    });
    setEditingId(null);
  };

  const openEdit = (cam: typeof cameras[0]) => {
    setForm({
      nome: cam.nome,
      localizacao: cam.localizacao || "",
      stream_url: cam.stream_url || "",
      tipo: cam.tipo,
      clinica_id: cam.clinica_id,
      fabricante: cam.fabricante || "intelbras",
      modo_conexao: cam.modo_conexao || "ip",
      cloud_id: cam.cloud_id || "",
      ip_principal: cam.ip_principal || "",
      ip_alternativo: cam.ip_alternativo || "",
      dominio_ddns: cam.dominio_ddns || "",
      registro_auto_id: cam.registro_auto_id || "",
      porta_servico: cam.porta_servico?.toString() || "37777",
      porta_web: cam.porta_web?.toString() || "80",
      usuario: cam.usuario || "admin",
      senha: cam.senha || "",
      canal: cam.canal?.toString() || "1",
    });
    setEditingId(cam.id);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const clinicaId = isAdmin ? form.clinica_id : profile?.clinica_id;
    if (!form.nome) {
      toast({ title: "Informe o nome do dispositivo", variant: "destructive" });
      return;
    }
    if (!clinicaId) {
      toast({ title: "Selecione uma clínica", variant: "destructive" });
      return;
    }
    const payload = {
      nome: form.nome,
      localizacao: form.localizacao || null,
      stream_url: form.stream_url || null,
      tipo: form.tipo,
      fabricante: form.fabricante || null,
      modo_conexao: form.modo_conexao || null,
      cloud_id: form.cloud_id || null,
      ip_principal: form.ip_principal || null,
      ip_alternativo: form.ip_alternativo || null,
      dominio_ddns: form.dominio_ddns || null,
      registro_auto_id: form.registro_auto_id || null,
      porta_servico: form.porta_servico ? parseInt(form.porta_servico, 10) : null,
      porta_web: form.porta_web ? parseInt(form.porta_web, 10) : null,
      usuario: form.usuario || null,
      senha: form.senha || null,
      canal: form.canal ? parseInt(form.canal, 10) : null,
    };
    try {
      if (editingId) {
        await update.mutateAsync({ id: editingId, ...payload });
        toast({ title: "Câmera atualizada" });
      } else {
        await create.mutateAsync({ ...payload, clinica_id: clinicaId });
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
    await update.mutateAsync({ id: cam.id, status: (cam.status === "ativa" ? "inativa" : "ativa") as "ativa" | "inativa" });
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
              <Button className="gap-2"><Plus className="w-4 h-4" /> Novo</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar dispositivo" : "Novo dispositivo"}</DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="conexao" className="mt-2">
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="conexao">Conexão</TabsTrigger>
                  <TabsTrigger value="stream">Stream / Avançado</TabsTrigger>
                </TabsList>

                <TabsContent value="conexao" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Nome do dispositivo *</Label>
                      <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Sala 1" />
                    </div>
                    <div>
                      <Label>Localização</Label>
                      <Input value={form.localizacao} onChange={(e) => setForm({ ...form, localizacao: e.target.value })} placeholder="Sala de terapia A" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Fabricante</Label>
                      <Select value={form.fabricante} onValueChange={(v) => setForm({ ...form, fabricante: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="intelbras">Intelbras</SelectItem>
                          <SelectItem value="hikvision">Hikvision</SelectItem>
                          <SelectItem value="dahua">Dahua</SelectItem>
                          <SelectItem value="generico">Genérico / ONVIF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Modo de conexão</Label>
                      <Select value={form.modo_conexao} onValueChange={(v) => setForm({ ...form, modo_conexao: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ip">IP</SelectItem>
                          <SelectItem value="registro_auto">Registro Automático</SelectItem>
                          <SelectItem value="ddns">Domínio DDNS</SelectItem>
                          <SelectItem value="ip_alternativo">IP Alternativo</SelectItem>
                          <SelectItem value="cloud">Intelbras Cloud</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {form.modo_conexao === "ip" && (
                    <div>
                      <Label>IP Principal</Label>
                      <Input value={form.ip_principal} onChange={(e) => setForm({ ...form, ip_principal: e.target.value })} placeholder="192.168.1.108" />
                    </div>
                  )}

                  {form.modo_conexao === "registro_auto" && (
                    <div>
                      <Label>ID Registro Automático</Label>
                      <Input value={form.registro_auto_id} onChange={(e) => setForm({ ...form, registro_auto_id: e.target.value })} />
                    </div>
                  )}

                  {form.modo_conexao === "ddns" && (
                    <div>
                      <Label>Domínio DDNS</Label>
                      <Input value={form.dominio_ddns} onChange={(e) => setForm({ ...form, dominio_ddns: e.target.value })} placeholder="meudvr.ddns.net" />
                    </div>
                  )}

                  {form.modo_conexao === "ip_alternativo" && (
                    <div>
                      <Label>IP Alternativo</Label>
                      <Input value={form.ip_alternativo} onChange={(e) => setForm({ ...form, ip_alternativo: e.target.value })} />
                    </div>
                  )}

                  {form.modo_conexao === "cloud" && (
                    <div>
                      <Label>ID (Cloud)</Label>
                      <Input value={form.cloud_id} onChange={(e) => setForm({ ...form, cloud_id: e.target.value })} placeholder="Número de série do dispositivo" />
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Porta de Serviço *</Label>
                      <Input type="number" value={form.porta_servico} onChange={(e) => setForm({ ...form, porta_servico: e.target.value })} />
                    </div>
                    <div>
                      <Label>Porta Web</Label>
                      <Input type="number" value={form.porta_web} onChange={(e) => setForm({ ...form, porta_web: e.target.value })} />
                    </div>
                    <div>
                      <Label>Canal</Label>
                      <Input type="number" value={form.canal} onChange={(e) => setForm({ ...form, canal: e.target.value })} placeholder="1" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Usuário *</Label>
                      <Input value={form.usuario} onChange={(e) => setForm({ ...form, usuario: e.target.value })} placeholder="admin" />
                    </div>
                    <div>
                      <Label>Senha *</Label>
                      <Input type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
                    </div>
                  </div>

                  {isAdmin && !editingId && (
                    <div>
                      <Label>Clínica</Label>
                      <Select value={form.clinica_id} onValueChange={(v) => setForm({ ...form, clinica_id: v })}>
                        <SelectTrigger><SelectValue placeholder="Selecione a clínica" /></SelectTrigger>
                        <SelectContent>
                          {clinicas.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="stream" className="space-y-4 mt-4">
                  <div>
                    <Label>Tipo de stream</Label>
                    <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v as "hls" | "mjpeg" | "rtsp" })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hls">HLS (m3u8)</SelectItem>
                        <SelectItem value="mjpeg">MJPEG</SelectItem>
                        <SelectItem value="rtsp">RTSP</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>URL do Stream (opcional)</Label>
                    <Input
                      value={form.stream_url}
                      onChange={(e) => setForm({ ...form, stream_url: e.target.value })}
                      placeholder="rtsp://usuario:senha@ip:porta/cam/realmonitor?channel=1&subtype=0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Se preenchida, será usada diretamente. Caso contrário, pode ser montada a partir das informações da aba Conexão.
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-2 pt-4 border-t mt-4">
                <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={create.isPending || update.isPending}>
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
