import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Shield } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import AdminClinicas from "@/pages/AdminClinicas";
import AdminUsuarios from "@/pages/AdminUsuarios";

const PainelAdministrativo = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "usuarios" ? "usuarios" : "clinicas";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel administrativo</h1>
        <p className="text-sm text-muted-foreground">Gerencie clínicas e usuários do sistema.</p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="clinicas" className="gap-2">
            <Building2 className="w-4 h-4" /> Clínicas
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-2">
            <Shield className="w-4 h-4" /> Usuários e permissões
          </TabsTrigger>
        </TabsList>

        <TabsContent value="clinicas" className="mt-6">
          <AdminClinicas />
        </TabsContent>
        <TabsContent value="usuarios" className="mt-6">
          <AdminUsuarios />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PainelAdministrativo;
