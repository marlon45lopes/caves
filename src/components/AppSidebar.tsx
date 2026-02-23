import { Calendar, Users, Building2, Stethoscope, Briefcase, Home, LogOut, FileText, Shield } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const menuItems = [
  { title: 'Dashboard', url: '/', icon: Home },
  { title: 'Agenda', url: '/agenda', icon: Calendar },
  { title: 'Pacientes', url: '/pacientes', icon: Users },
  { title: 'Clínicas', url: '/clinicas', icon: Building2 },
  { title: 'Especialidades', url: '/especialidades', icon: Stethoscope },
  { title: 'Empresas', url: '/empresas', icon: Briefcase },
  { title: 'Relatório', url: '/relatorio', icon: FileText },
  { title: 'Painel do Administrador', url: '/admin', icon: Shield },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const isCollapsed = state === 'collapsed';

  const isAdmin = profile?.role === 'ADMIN';
  const isAtendente = profile?.role === 'ATENDENTE';
  const isClinica = profile?.role === 'CLINICA';

  const filteredMenuItems = menuItems.filter(item => {
    if (item.title === 'Painel do Administrador') {
      return isAdmin;
    }
    if (isClinica) {
      return ['Dashboard', 'Agenda'].includes(item.title);
    }
    if (isAtendente) {
      // Atendente usually manages clinics/specialties/companies too, but maybe not reports?
      // User didn't specify, let's keep it broad for them but restricted for clinic.
      return item.title !== 'Relatório' || isAdmin;
    }
    return true; // Admin sees all
  });

  const handleSignOut = async () => {
    await signOut();
    toast.success('Logout realizado com sucesso!');
    navigate('/auth');
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img
            src="/caves-logo.jpg"
            alt="CAVES"
            className="h-10 w-10 object-contain rounded-lg"
          />
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold text-sidebar-foreground">CAVES</h1>
              <p className="text-xs text-sidebar-foreground/70">Sistema de Agendamentos</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60 text-xs uppercase tracking-wider">
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sidebar-foreground/80 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      activeClassName="bg-sidebar-accent text-sidebar-foreground font-medium"
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border">
        {!isCollapsed && user && (
          <div className="mb-3 px-1">
            <p className="text-xs text-sidebar-foreground/60 truncate">{user.email}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size={isCollapsed ? 'icon' : 'default'}
          onClick={handleSignOut}
          className="w-full justify-start gap-3 text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!isCollapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
