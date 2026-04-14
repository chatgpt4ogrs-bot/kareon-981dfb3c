import HlsPlayer from "./HlsPlayer";
import type { Camera } from "@/hooks/use-cameras";
import { Badge } from "@/components/ui/badge";
import { MapPin } from "lucide-react";

interface CameraFeedProps {
  camera: Camera;
}

const CameraFeed = ({ camera }: CameraFeedProps) => {
  return (
    <div className="rounded-xl overflow-hidden border border-border bg-card">
      <div className="aspect-video bg-black relative">
        {camera.status === "inativa" ? (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <p className="text-sm">Câmera inativa</p>
          </div>
        ) : camera.tipo === "mjpeg" ? (
          <img
            src={camera.stream_url}
            alt={camera.nome}
            className="w-full h-full object-cover"
          />
        ) : (
          <HlsPlayer src={camera.stream_url} className="w-full h-full" />
        )}
      </div>
      <div className="p-3 flex items-center justify-between">
        <div>
          <p className="font-medium text-sm text-foreground">{camera.nome}</p>
          {camera.localizacao && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3" /> {camera.localizacao}
            </p>
          )}
        </div>
        <Badge variant={camera.status === "ativa" ? "default" : "secondary"} className="text-[10px]">
          {camera.status === "ativa" ? "Ao vivo" : "Inativa"}
        </Badge>
      </div>
    </div>
  );
};

export default CameraFeed;
