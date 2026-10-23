import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { BrandMark } from "@/components/BrandMark";

type Item = {
  senha: string | null;
  patient_mask: string;
  room_nome: string | null;
  status: string;
  chamado_at: string | null;
  professional_nome?: string | null;
};

export default function PainelTV() {
  const [params] = useSearchParams();
  const unitId = params.get("unit_id") || "";
  const [items, setItems] = useState<Item[]>([]);
  const [clock, setClock] = useState(new Date());
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!unitId) {
      setError("Informe ?unit_id=UUID da clínica na URL");
      return;
    }
    let alive = true;
    const load = async () => {
      try {
        const base = import.meta.env.VITE_API_URL || "/api";
        const res = await fetch(`${base}/waiting/public?unit_id=${unitId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Erro");
        if (alive) {
          setItems(data.items || []);
          setError("");
        }
      } catch (e: any) {
        if (alive) setError(e.message || "Falha ao carregar");
      }
    };
    load();
    const iv = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [unitId]);

  const chamado = items.filter((i) => i.status === "chamado");
  const fila = items.filter((i) => i.status === "aguardando_atendimento");
  const emAtend = items.filter((i) => i.status === "em_atendimento");

  return (
    <div className="min-h-screen brand-gradient-soft text-white flex flex-col">
      <header className="flex items-center justify-between px-8 py-5 border-b border-white/15">
        <BrandMark variant="wordmark" tone="dark" size="lg" />
        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums">{format(clock, "HH:mm:ss")}</p>
          <p className="text-sm text-white/70">{format(clock, "dd/MM/yyyy")}</p>
        </div>
      </header>

      {error ? (
        <div className="flex-1 flex items-center justify-center text-xl text-white/80 px-6 text-center">
          {error}
        </div>
      ) : (
        <main className="flex-1 grid lg:grid-cols-2 gap-6 p-6 lg:p-8">
          <section className="rounded-3xl bg-black/25 backdrop-blur border border-white/10 p-6 flex flex-col">
            <h2 className="text-sm uppercase tracking-[0.2em] text-cyan-200 mb-4">
              Chamando agora
            </h2>
            {chamado.length === 0 ? (
              <p className="text-white/50 text-lg m-auto">Aguardando chamada…</p>
            ) : (
              <div className="space-y-4 m-auto w-full">
                {chamado.slice(0, 3).map((c, idx) => (
                  <div
                    key={`${c.senha}-${idx}`}
                    className="rounded-2xl bg-white/10 px-6 py-5 ring-1 ring-cyan-300/40 animate-pulse"
                  >
                    <p className="text-5xl font-bold tracking-tight">
                      {c.senha || c.patient_mask}
                    </p>
                    <p className="text-xl mt-2 text-white/85">
                      {c.room_nome || "Consultório"}
                      {c.professional_nome ? ` · ${c.professional_nome}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl bg-black/20 backdrop-blur border border-white/10 p-6">
            <h2 className="text-sm uppercase tracking-[0.2em] text-white/60 mb-4">
              Na fila / em atendimento
            </h2>
            <ul className="space-y-2 max-h-[70vh] overflow-y-auto">
              {[...emAtend, ...fila].map((i, idx) => (
                <li
                  key={`${i.patient_mask}-${idx}`}
                  className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3"
                >
                  <span className="font-medium text-lg">
                    {i.senha || i.patient_mask}
                  </span>
                  <span className="text-sm text-white/60 capitalize">
                    {i.status.replace(/_/g, " ")}
                    {i.room_nome ? ` · ${i.room_nome}` : ""}
                  </span>
                </li>
              ))}
              {emAtend.length + fila.length === 0 && (
                <li className="text-white/40 py-8 text-center">Fila vazia</li>
              )}
            </ul>
          </section>
        </main>
      )}

      <footer className="px-8 py-3 text-xs text-white/50 border-t border-white/10">
        Kareon · Marca Darevo · Atualização automática a cada 5s
      </footer>
    </div>
  );
}
