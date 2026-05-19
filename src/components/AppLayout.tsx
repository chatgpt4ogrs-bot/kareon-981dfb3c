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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavItems } from "@/lib/permissions";
import { useIdleLogout } from "@/hooks/use-idle-logout";
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

  // Auto-logout após 30 min de inatividade
  useIdleLogout(30 * 60 * 1000);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
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
      <aside className="hidden md:flex w-60 flex-col border-r border-border/60 bg-sidebar">
        <div className="px-5 h-14 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Heart className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-foreground">Kareon</span>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            const active = isActive(item.to);
            if (item.disabled) {
              return (
                <div
                  key={item.to}
                  aria-disabled="true"
                  title={item.badge || "Em breve"}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13.5px] font-medium text-muted-foreground/60 cursor-not-allowed select-none"
                >
                  <Icon className="w-[18px] h-[18px]" strokeWidth={1.85} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
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
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                )}
              >
                <Icon className={cn("w-[18px] h-[18px]", active ? "text-sidebar-accent-foreground" : "")} strokeWidth={active ? 2.25 : 1.85} />
                {item.label}
              </Link>
            );
          })}

          {adminItems.length > 0 && (
            <>
              <div className="pt-5 pb-1.5 px-3">
                <p className="text-[10.5px] font-semibold text-muted-foreground/80 uppercase tracking-[0.08em]">Administração</p>
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
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <Icon className="w-[18px] h-[18px]" strokeWidth={active ? 2.25 : 1.85} />
                    {item.label}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-border/60">
          <Link
            to="/perfil"
            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/60 transition-colors"
          >
            <Avatar className="w-8 h-8">
              {profile?.avatar_url && <AvatarImage src={profile.avatar_url} alt={profile?.nome || ""} />}
              <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate text-foreground">{profile?.nome || "Usuário"}</p>
              <p className="text-[11px] text-muted-foreground truncate">{roleLabel}</p>
            </div>
          </Link>
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
