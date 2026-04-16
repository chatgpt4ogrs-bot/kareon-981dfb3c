import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Loader2, Camera } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface CameraFamiliarModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  profileNome: string;
  clinicaId: string;
}

export default function CameraFamiliarModal({
  open,
  onOpenChange,
  profileId,
  profileNome,
  clinicaId,
}: CameraFamiliarModalProps) {
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string[]>([]);

  const { data: cameras = [], isLoading: loadingCameras } = useQuery({
    queryKey: ["cameras-clinica", clinicaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cameras")
        .select("id, nome, localizacao")
        .eq("clinica_id", clinicaId)
        .order("nome");
      if (error) throw error;
      return data;
    },
    enabled: open && !!clinicaId,
  });

  const { data: existing = [], isLoading: loadingExisting } = useQuery({
    queryKey: ["camera-usuarios", profileId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("camera_usuarios")
        .select("camera_id")
        .eq("profile_id", profileId);
      if (error) throw error;
      return data.map((r) => r.camera_id);
    },
    enabled: open && !!profileId,
  });

  useEffect(() => {
    if (open) setSelected(existing);
  }, [existing, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const toAdd = selected.filter((id) => !existing.includes(id));
      const toRemove = existing.filter((id) => !selected.includes(id));

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("camera_usuarios")
          .delete()
          .eq("profile_id", profileId)
          .in("camera_id", toRemove);
        if (error) throw error;
      }
      if (toAdd.length > 0) {
        const { error } = await supabase.from("camera_usuarios").insert(
          toAdd.map((camera_id) => ({ camera_id, profile_id: profileId }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["camera-usuarios", profileId] });
      toast({ title: "Permissões de câmera atualizadas" });
      onOpenChange(false);
    },
    onError: (e: any) => {
      toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" });
    },
  });

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const isLoading = loadingCameras || loadingExisting;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Câmeras — {profileNome}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : cameras.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhuma câmera cadastrada nesta clínica
          </p>
        ) : (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {cameras.map((cam) => (
              <label
                key={cam.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={selected.includes(cam.id)}
                  onCheckedChange={() => toggle(cam.id)}
                />
                <div>
                  <p className="text-sm font-medium text-foreground">{cam.nome}</p>
                  {cam.localizacao && (
                    <p className="text-xs text-muted-foreground">{cam.localizacao}</p>
                  )}
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || isLoading}
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
