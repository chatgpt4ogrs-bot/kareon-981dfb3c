import { useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  Heart,
  Building2,
  Shield,
  Camera,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavItems } from "@/lib/permissions";
import { useIdleLogout } from "@/hooks/use-idle-logout";
import { useLogout } from "@/hooks/use-logout";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Users, CalendarDays, Camera, Building2, Shield,
};

const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, signOut, isAdmin, hasRole, roles } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Auto-logout após 10 min de inatividade
  useIdleLogout(10 * 60 * 1000);
  const logout = useLogout();

  const handleLogout = async () => {
    await logout("manual");
  };

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const { main: navItems, admin: adminItems } = getNavItems(roles);

  const roleLabel = isAdmin
    ? "Admin Master"
    : hasRole("clinica_admin")
    ? "Admin Clínica"
    : hasRole("responsavel_clinica")
    ? "Responsável"
    : hasRole("familiar")
    ? "Familiar"
    : "Terapeuta";

  const allItems = [...navItems, ...adminItems];

  const initials = profile?.nome
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";

  const UserMenu = ({ align = "end" as const }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-muted/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Menu do usuário"
        >
          <Avatar className="w-8 h-8">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile?.nome || ""} />}
            <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="text-sm font-medium truncate">{profile?.nome || "Usuário"}</span>
          <span className="text-xs text-muted-foreground font-normal truncate">{roleLabel}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/perfil")} className="cursor-pointer">
          <UserIcon className="w-4 h-4 mr-2" /> Meu perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
          <LogOut className="w-4 h-4 mr-2" /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="min-h-screen flex bg-background">
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Expandir menu"
          className="hidden md:flex fixed left-0 top-1/2 -translate-y-1/2 z-20 h-10 w-6 items-center justify-center rounded-r-lg bg-primary text-primary-foreground shadow-md hover:bg-primary/90 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
      <aside
        className={cn(
          "hidden md:flex w-60 flex-col border-r border-primary/20 bg-primary text-primary-foreground transition-all",
          collapsed && "md:hidden",
        )}
      >
        {/* Topo — usuário */}
        <Link
          to="/perfil"
          className="flex items-center gap-2.5 px-4 py-3 border-b border-white/15 hover:bg-white/10 transition-colors"
        >
          <Avatar className="w-9 h-9 ring-2 ring-white/20">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile?.nome || ""} />}
            <AvatarFallback className="text-xs font-semibold bg-white/15 text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold truncate text-primary-foreground">{profile?.nome || "Usuário"}</p>
            <p className="text-[11px] truncate text-primary-foreground/70">{profile?.email || roleLabel}</p>
          </div>
        </Link>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            const active = isActive(item.to);
            if (item.disabled) {
              return (
                <div
                  key={item.to}
                  aria-disabled="true"
                  title={item.badge || "Em breve"}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium text-primary-foreground/50 cursor-not-allowed select-none"
                >
                  <Icon className="w-[18px] h-[18px]" strokeWidth={1.85} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-white/15 text-primary-foreground/80">
                      {item.badge}
                    </span>
                  )}
                </div>
              );
            }
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-150",
                  active
                    ? "bg-white text-primary shadow-sm"
                    : "text-primary-foreground/85 hover:bg-white/10 hover:text-primary-foreground",
                )}
              >
                <Icon className={cn("w-[18px] h-[18px]", active ? "text-primary" : "")} strokeWidth={active ? 2.25 : 1.85} />
                {item.label}
              </Link>
            );
          })}

          {adminItems.length > 0 && (
            <>
              <div className="pt-5 pb-1.5 px-3">
                <p className="text-[10.5px] text-primary-foreground/70 uppercase tracking-[0.08em] border-0 border-none shadow-none opacity-100 text-left font-extrabold">Administração</p>
              </div>
              {adminItems.map((item) => {
                const Icon = iconMap[item.icon] || Shield;
                const active = isActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium transition-all duration-150",
                      active
                        ? "bg-white text-primary shadow-sm"
                        : "text-primary-foreground/85 hover:bg-white/10 hover:text-primary-foreground",
                    )}
                  >
                    <Icon className={cn("w-[18px] h-[18px]", active ? "text-primary" : "")} strokeWidth={active ? 2.25 : 1.85} />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Rodapé — logo Kareon + botão recolher */}
        <div className="px-4 py-3 border-t border-white/15 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center ring-1 ring-white/20">
              <Heart className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight text-primary-foreground">Kareon</span>
          </div>
          <button
            onClick={() => setCollapsed(true)}
            aria-label="Recolher menu"
            className="w-7 h-7 rounded-md flex items-center justify-center hover:bg-white/15 text-primary-foreground/90 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="hidden md:flex items-center justify-end h-14 px-6 border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-10">
          <UserMenu />
        </header>
        <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-border/60 bg-card">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
              <Heart className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-foreground">Kareon</span>
          </div>
          <div className="flex items-center gap-2">
            <UserMenu />
            <Button variant="ghost" size="icon" aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </header>

        {mobileOpen && (
          <div className="md:hidden bg-card border-b border-border/60 p-3 space-y-1 animate-fade-in">
            {allItems.map((item) => {
              const Icon = iconMap[item.icon] || LayoutDashboard;
              if (item.disabled) {
                return (
                  <div
                    key={item.to}
                    aria-disabled="true"
                    className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-muted-foreground/60 cursor-not-allowed select-none"
                  >
                    <Icon className="w-[18px] h-[18px]" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {item.badge}
                      </span>
                    )}
                  </div>
                );
              }
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive(item.to) ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  <Icon className="w-[18px] h-[18px]" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <div key={location.pathname} className="animate-page-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
