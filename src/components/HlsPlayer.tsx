import { useEffect, useRef } from "react";
import Hls from "hls.js";

interface HlsPlayerProps {
  src: string;
  className?: string;
}

const HlsPlayer = ({ src, className }: HlsPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: false });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", () => {
        video.play().catch(() => {});
      });
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      className={className}
      muted
      playsInline
      controls
      style={{ width: "100%", height: "100%", objectFit: "cover", background: "black" }}
    />
  );
};

export default HlsPlayer;
