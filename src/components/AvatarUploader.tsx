import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const OUTPUT_SIZE = 512;
const MAX_SOURCE_DIM = 1600;
const JPEG_QUALITY = 0.85;
const VIEW = 280;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onUploaded?: (url: string) => void;
}

export const AvatarUploader = ({ open, onOpenChange, onUploaded }: Props) => {
  const { user, profile } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ x: number; y: number } | null>(null);
  const [uploading, setUploading] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null); setImgSrc(null); setImg(null);
    setScale(1); setOffset({ x: 0, y: 0 });
  };

  useEffect(() => { if (!open) reset(); }, [open]);

  // Read EXIF orientation (1-8) from a JPEG file. Returns 1 for non-JPEG or unknown.
  const readExifOrientation = async (file: File): Promise<number> => {
    if (file.type !== "image/jpeg" && file.type !== "image/jpg") return 1;
    try {
      const buf = await file.slice(0, 128 * 1024).arrayBuffer();
      const view = new DataView(buf);
      if (view.getUint16(0) !== 0xffd8) return 1;
      let offset = 2;
      const len = view.byteLength;
      while (offset < len) {
        const marker = view.getUint16(offset); offset += 2;
        if (marker === 0xffe1) {
          if (view.getUint32(offset + 2) !== 0x45786966) return 1; // "Exif"
          const tiff = offset + 8;
          const little = view.getUint16(tiff) === 0x4949;
          const get16 = (o: number) => view.getUint16(o, little);
          const get32 = (o: number) => view.getUint32(o, little);
          const ifd0 = tiff + get32(tiff + 4);
          const tags = get16(ifd0);
          for (let i = 0; i < tags; i++) {
            const entry = ifd0 + 2 + i * 12;
            if (get16(entry) === 0x0112) return get16(entry + 8);
          }
          return 1;
        } else if ((marker & 0xff00) !== 0xff00) {
          break;
        } else {
          offset += view.getUint16(offset);
        }
      }
    } catch { /* ignore */ }
    return 1;
  };

  // Apply EXIF orientation transform on a 2D context for an image of size w×h.
  const applyOrientation = (ctx: CanvasRenderingContext2D, orientation: number, w: number, h: number) => {
    switch (orientation) {
      case 2: ctx.translate(w, 0); ctx.scale(-1, 1); break;
      case 3: ctx.translate(w, h); ctx.rotate(Math.PI); break;
      case 4: ctx.translate(0, h); ctx.scale(1, -1); break;
      case 5: ctx.rotate(0.5 * Math.PI); ctx.scale(1, -1); break;
      case 6: ctx.rotate(0.5 * Math.PI); ctx.translate(0, -h); break;
      case 7: ctx.rotate(0.5 * Math.PI); ctx.translate(w, -h); ctx.scale(-1, 1); break;
      case 8: ctx.rotate(-0.5 * Math.PI); ctx.translate(-w, 0); break;
    }
  };

  // Loads an image file, applies EXIF rotation, and downscales it. Output image
 // bytes already have correct pixel orientation, so no further rotation needed.
  const downscaleSource = async (file: File): Promise<HTMLImageElement> => {
    const orientation = await readExifOrientation(file);
    const url = URL.createObjectURL(file);
    const raw = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const swap = orientation >= 5 && orientation <= 8;
    const srcW = swap ? raw.height : raw.width;
    const srcH = swap ? raw.width : raw.height;
    const maxDim = Math.max(srcW, srcH);
    const ratio = maxDim > MAX_SOURCE_DIM ? MAX_SOURCE_DIM / maxDim : 1;
    const outW = Math.round(srcW * ratio);
    const outH = Math.round(srcH * ratio);
    const c = document.createElement("canvas");
    c.width = outW; c.height = outH;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // Draw in a coordinate space sized to the original (unswapped) image and let
    // the orientation transform map it onto the output canvas.
    const drawW = swap ? outH : outW;
    const drawH = swap ? outW : outH;
    applyOrientation(ctx, orientation, drawW, drawH);
    ctx.drawImage(raw, 0, 0, drawW, drawH);
    URL.revokeObjectURL(url);
    const dataUrl = c.toDataURL("image/jpeg", 0.92);
    return await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = dataUrl;
    });
  };

  const handleFile = async (f: File) => {
    if (!ACCEPTED.includes(f.type)) {
      toast({ title: "Formato inválido", description: "Use JPG, PNG ou WEBP.", variant: "destructive" });
      return;
    }
    if (f.size > MAX_BYTES) {
      toast({ title: "Arquivo muito grande", description: "Máximo de 5MB.", variant: "destructive" });
      return;
    }
    try {
      setFile(f);
      const im = await downscaleSource(f);
      setImgSrc(im.src);
      setImg(im);
      const minScale = VIEW / Math.min(im.width, im.height);
      setScale(minScale);
      setOffset({ x: 0, y: 0 });
    } catch {
      toast({ title: "Erro ao ler imagem", variant: "destructive" });
    }
  };

  const draw = useCallback(() => {
    const c = canvasRef.current; if (!c || !img) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    ctx.clearRect(0, 0, VIEW, VIEW);
    ctx.fillStyle = "#f1f5f9";
    ctx.fillRect(0, 0, VIEW, VIEW);
    const w = img.width * scale;
    const h = img.height * scale;
    const x = (VIEW - w) / 2 + offset.x;
    const y = (VIEW - h) / 2 + offset.y;
    ctx.drawImage(img, x, y, w, h);
  }, [img, scale, offset]);

  useEffect(() => { draw(); }, [draw]);

  const onMouseDown = (e: React.MouseEvent) => setDragging({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragging.x, y: e.clientY - dragging.y });
  };
  const onMouseUp = () => setDragging(null);

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    setDragging({ x: t.clientX - offset.x, y: t.clientY - offset.y });
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return;
    const t = e.touches[0];
    setOffset({ x: t.clientX - dragging.x, y: t.clientY - dragging.y });
  };

  const exportBlob = (): Promise<Blob> => new Promise((resolve, reject) => {
    if (!img) return reject(new Error("no image"));
    const c = document.createElement("canvas");
    c.width = OUTPUT_SIZE; c.height = OUTPUT_SIZE;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const ratio = OUTPUT_SIZE / VIEW;
    const w = img.width * scale * ratio;
    const h = img.height * scale * ratio;
    const x = (OUTPUT_SIZE - w) / 2 + offset.x * ratio;
    const y = (OUTPUT_SIZE - h) / 2 + offset.y * ratio;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    ctx.drawImage(img, x, y, w, h);
    c.toBlob((b) => b ? resolve(b) : reject(new Error("blob fail")), "image/jpeg", JPEG_QUALITY);
  });

  const handleSave = async () => {
    if (!user || !img) return;
    setUploading(true);
    try {
      const blob = await exportBlob();
      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, blob, {
        contentType: "image/jpeg", upsert: true, cacheControl: "3600",
      });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
      const finalUrl = `${publicUrl}?t=${Date.now()}`;
      const { error: dbErr } = await supabase.from("profiles").update({ avatar_url: finalUrl }).eq("user_id", user.id);
      if (dbErr) throw dbErr;
      const kb = Math.round(blob.size / 1024);
      toast({ title: "Foto atualizada", description: `Imagem otimizada para ${OUTPUT_SIZE}px (~${kb} KB).` });
      onUploaded?.(finalUrl);
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro ao enviar", description: e.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    if (!user) return;
    setUploading(true);
    try {
      await supabase.from("profiles").update({ avatar_url: null }).eq("user_id", user.id);
      toast({ title: "Foto removida" });
      onUploaded?.("");
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  const minScale = img ? VIEW / Math.min(img.width, img.height) : 0.1;
  const maxScale = minScale * 5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Foto de perfil</DialogTitle>
          <DialogDescription>JPG, PNG ou WEBP. Máximo 5MB.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {!img ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="w-full border-2 border-dashed border-border rounded-lg p-10 flex flex-col items-center gap-3 cursor-pointer hover:bg-muted/50 transition"
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Clique para escolher uma imagem</p>
            </div>
          ) : (
            <>
              <div className="relative" style={{ width: VIEW, height: VIEW }}>
                <canvas
                  ref={canvasRef}
                  width={VIEW}
                  height={VIEW}
                  className="touch-none cursor-grab active:cursor-grabbing select-none"
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onMouseUp}
                />
                <div
                  className="absolute inset-0 pointer-events-none rounded-full ring-2 ring-primary/70"
                  style={{ boxShadow: "0 0 0 9999px hsl(var(--background) / 0.6)" }}
                />
              </div>
              <div className="w-full px-2">
                <p className="text-xs text-muted-foreground mb-2">Zoom</p>
                <Slider
                  min={minScale}
                  max={maxScale}
                  step={0.01}
                  value={[scale]}
                  onValueChange={(v) => setScale(v[0])}
                />
              </div>
              <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
                Trocar imagem
              </Button>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          />
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {profile?.avatar_url && !img && (
            <Button variant="outline" onClick={handleRemove} disabled={uploading} className="text-destructive">
              <Trash2 className="w-4 h-4" /> Remover foto
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={uploading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!img || uploading}>
            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
