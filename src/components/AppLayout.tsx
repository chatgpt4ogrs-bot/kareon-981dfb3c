import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import VisitModeBanner from "@/components/VisitModeBanner";
import {
  Users,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Building2,
  Shield,
  Camera,
  FileText,
  Package,
  Stethoscope,
  ClipboardCheck,
  Timer,
  User as UserIcon,
  ChevronDown,
  Bell,
  Search,
  Plus,
  Settings,
  UserCheck,
  Wallet,
  ListOrdered,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavItems } from "@/lib/permissions";
import { useIdleLogout } from "@/hooks/use-idle-logout";
import { useLogout } from "@/hooks/use-logout";
import { usePerfis } from "@/hooks/use-perfis";
import { BrandMark } from "@/components/BrandMark";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  CalendarDays,
  Camera,
  FileText,
  Package,
  Building2,
  Shield,
  Stethoscope,
  ClipboardCheck,
  Timer,
  UserCheck,
  Wallet,
  Settings,
  ListOrdered,
  Monitor,
};

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    profile,
    isAdmin,
    hasTab,
    roles,
    tabs,
    isVisitor,
    isPlatformSupervisor,
    activeTenantId,
    activeTenantName,
    leaveTenant,
  } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  useIdleLogout(10 * 60 * 1000);
  const logout = useLogout();
  const { nomeDoPerfil } = usePerfis();

  const { main: navItems, admin: adminItems } = getNavItems(roles, isVisitor, tabs);
  const roleLabel = isVisitor
    ? "Modo visita"
    : nomeDoPerfil(profile?.perfil_id, roles[0]);

  const initials =
    profile?.nome
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const clinicLabel = useMemo(() => {
    if (isAdmin && activeTenantName) return activeTenantName;
    if (isAdmin) return "Todas as unidades";
    if (profile?.clinica_id) return "Unidade atual";
    return "Sem unidade";
  }, [isAdmin, activeTenantName, profile?.clinica_id]);

  const pageTitle = useMemo(() => {
    const all = [...navItems, ...adminItems, { to: "/", label: "Dashboard" }];
    const hit = all.find((i) => isActive(i.to) && i.to !== "/") || all.find((i) => i.to === "/");
    return hit?.label || "Dashboard";
  }, [location.pathname, navItems, adminItems]);

  const NavLinkItem = ({
    item,
    onClick,
  }: {
    item: { to: string; icon: string; label: string; disabled?: boolean; badge?: string; tooltip?: string };
    onClick?: () => void;
  }) => {
    const Icon = iconMap[item.icon] || LayoutDashboard;
    const active = isActive(item.to);

    if (item.disabled) {
      return (
        <Tooltip delayDuration={150}>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-muted-foreground/50 cursor-not-allowed">
              <Icon className="w-4 h-4" />
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted">{item.badge}</span>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="text-xs max-w-xs">
            {item.tooltip || "Indisponível"}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Link
        to={item.to}
        onClick={onClick}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-sidebar-foreground hover:bg-muted"
        )}
      >
        <Icon className="w-4 h-4" strokeWidth={active ? 2.25 : 1.85} />
        {item.label}
      </Link>
    );
  };

  const Sidebar = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-5 pb-4 border-b border-sidebar-border">
        <Link to="/" className="inline-flex mb-4" onClick={onNavigate}>
          <BrandMark variant="wordmark" size="md" showTagline={false} />
        </Link>

        <button
          type="button"
          className="w-full flex items-center gap-2.5 rounded-xl border border-border bg-card px-2.5 py-2 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold truncate text-foreground">
              {profile?.nome?.split(" ")[0] || "Clínica"}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">{clinicLabel}</p>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        <TooltipProvider>
          <div>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Principal
            </p>
            <div className="space-y-0.5">
              <NavLinkItem
                item={{ to: "/", icon: "LayoutDashboard", label: "Dashboard" }}
                onClick={onNavigate}
              />
              {navItems
                .filter((i) => i.to !== "/")
                .map((item) => (
                  <NavLinkItem key={item.to} item={item} onClick={onNavigate} />
                ))}
            </div>
          </div>

          {adminItems.length > 0 && (
            <div>
              <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                Administração
              </p>
              <div className="space-y-0.5">
                {adminItems.map((item) => (
                  <NavLinkItem key={item.to} item={item} onClick={onNavigate} />
                ))}
              </div>
            </div>
          )}
        </TooltipProvider>
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl">
          <Avatar className="w-8 h-8">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold truncate">{profile?.nome}</p>
            <p className="text-[10px] text-muted-foreground truncate">{roleLabel}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground"
            onClick={() => logout("manual")}
            aria-label="Sair"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {isVisitor && <VisitModeBanner />}
      {isAdmin && activeTenantId && activeTenantName && (
        <div className="bg-primary text-primary-foreground text-sm px-4 py-2 flex flex-wrap items-center justify-between gap-2">
          <span>
            Modo tenant: <strong>{activeTenantName}</strong>
          </span>
          <button
            type="button"
            className="underline underline-offset-2 text-xs font-medium hover:opacity-90"
            onClick={() => {
              leaveTenant();
              navigate("/admin?tab=tenants");
            }}
          >
            Sair e voltar aos tenants
          </button>
        </div>
      )}
      <div className="flex flex-1 min-h-0">
        <aside className="hidden lg:flex w-[260px] shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
          <Sidebar />
        </aside>

        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <header className="sticky top-0 z-30 h-14 md:h-16 border-b border-border/80 bg-card/90 backdrop-blur-md px-3 md:px-6 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </Button>

            <div className="hidden sm:block min-w-0">
              <p className="text-[11px] text-muted-foreground">Clínica</p>
              <p className="text-sm font-semibold truncate leading-tight">{pageTitle}</p>
            </div>

            <div className="flex-1 max-w-xl mx-auto hidden md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && search.trim()) {
                      navigate(`/pacientes?q=${encodeURIComponent(search.trim())}`);
                    }
                  }}
                  placeholder="Buscar pacientes, consultas…"
                  className="pl-9 pr-12 h-10 bg-muted/40 border-transparent focus-visible:bg-card"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground border rounded px-1.5 py-0.5 bg-card">
                  ⌘K
                </kbd>
              </div>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <Button
                size="sm"
                className="hidden sm:inline-flex shadow-sm"
                onClick={() => navigate("/agenda")}
              >
                <Plus className="w-4 h-4 mr-1" />
                Nova consulta
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground relative" aria-label="Notificações">
                <Bell className="w-4.5 h-4.5" />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-destructive" />
              </Button>
              {(isAdmin || hasTab("clinica_detalhes")) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hidden sm:inline-flex"
                  onClick={() => navigate(isAdmin ? "/admin" : "/clinica/detalhes")}
                >
                  <Settings className="w-4.5 h-4.5" />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full pl-1 pr-1.5 py-1 hover:bg-muted transition-colors">
                    <Avatar className="w-8 h-8">
                      {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
                      <AvatarFallback className="text-[10px] bg-primary text-primary-foreground font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <p className="font-medium truncate">{profile?.nome}</p>
                    <p className="text-xs text-muted-foreground font-normal">{roleLabel}</p>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/perfil")}>
                    <UserIcon className="w-4 h-4 mr-2" /> Meu perfil
                  </DropdownMenuItem>
                  {isPlatformSupervisor && (
                    <DropdownMenuItem onClick={() => navigate("/admin/clinicas")}>
                      <Building2 className="w-4 h-4 mr-2" /> Clínicas
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => logout("manual")}
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {mobileOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <button
                className="absolute inset-0 bg-black/40"
                aria-label="Fechar"
                onClick={() => setMobileOpen(false)}
              />
              <div className="absolute inset-y-0 left-0 w-[280px] bg-card shadow-xl animate-page-in">
                <div className="flex justify-end p-2">
                  <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
                <Sidebar onNavigate={() => setMobileOpen(false)} />
              </div>
            </div>
          )}

          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto">
            <div key={location.pathname} className="animate-page-in max-w-[1400px] mx-auto">
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default AppLayout;
