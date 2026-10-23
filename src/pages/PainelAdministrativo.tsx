import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, IdCard, ScrollText, Shield, LayoutGrid } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import AdminTenants from "@/pages/AdminTenants";
import AdminClinicas from "@/pages/AdminClinicas";
import AdminUsuarios from "@/pages/AdminUsuarios";
import AuditoriaPanel from "@/components/admin/AuditoriaPanel";
import PerfisPanel from "@/components/admin/PerfisPanel";
import { useAuth } from "@/contexts/AuthContext";

const TABS = ["tenants", "clinicas", "usuarios", "perfis", "auditoria"] as const;
type PainelTab = (typeof TABS)[number];

const PainelAdministrativo = () => {
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const param = searchParams.get("tab");
  const defaultTab: PainelTab = isAdmin ? "tenants" : "clinicas";
  const tab: PainelTab = TABS.includes(param as PainelTab) ? (param as PainelTab) : defaultTab;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Painel administrativo</h1>
        <p className="text-sm text-muted-foreground">
          {isAdmin
            ? "Gerencie tenants (clínicas), usuários, perfis e a auditoria do sistema."
            : "Gerencie clínicas vinculadas, usuários e auditoria."}
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}
        className="w-full"
      >
        <TabsList className={`grid w-full max-w-3xl ${isAdmin ? "grid-cols-5" : "grid-cols-4"}`}>
          {isAdmin && (
            <TabsTrigger value="tenants" className="gap-2">
              <LayoutGrid className="w-4 h-4" /> Tenants
            </TabsTrigger>
          )}
          <TabsTrigger value="clinicas" className="gap-2">
            <Building2 className="w-4 h-4" /> Clínicas
          </TabsTrigger>
          <TabsTrigger value="usuarios" className="gap-2">
            <Shield className="w-4 h-4" /> Usuários
          </TabsTrigger>
          <TabsTrigger value="perfis" className="gap-2">
            <IdCard className="w-4 h-4" /> Perfis
          </TabsTrigger>
          <TabsTrigger value="auditoria" className="gap-2">
            <ScrollText className="w-4 h-4" /> Auditoria
          </TabsTrigger>
        </TabsList>

        {isAdmin && (
          <TabsContent value="tenants" className="mt-6">
            <AdminTenants />
          </TabsContent>
        )}
        <TabsContent value="clinicas" className="mt-6">
          <AdminClinicas />
        </TabsContent>
        <TabsContent value="usuarios" className="mt-6">
          <AdminUsuarios />
        </TabsContent>
        <TabsContent value="perfis" className="mt-6">
          <PerfisPanel />
        </TabsContent>
        <TabsContent value="auditoria" className="mt-6">
          <AuditoriaPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PainelAdministrativo;
