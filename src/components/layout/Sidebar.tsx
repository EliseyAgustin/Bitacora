import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Briefcase, LayoutDashboard, BarChart2, Settings, LogOut, X, UserCircle, Mail, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RUTAS } from '@/lib/rutas';
import { useAuth } from '@/hooks/useAuth';
import { useRol } from '@/hooks/useRol';
import { useMensajesNoLeidos } from '@/hooks/useMensajesNoLeidos';
import { CuentaModal } from '@/components/CuentaModal';
import logoIcono from '@/assets/logo/laburin-logo-icono.svg';

const NAV_CANDIDATO = [
  { icon: Briefcase, label: 'Ofertas', path: RUTAS.ofertas },
  { icon: LayoutDashboard, label: 'Mis postulaciones', path: RUTAS.postulaciones },
  { icon: BarChart2, label: 'Mi progreso', path: RUTAS.progreso },
  { icon: Settings, label: 'Mi perfil de búsqueda', path: RUTAS.perfil },
  { icon: Mail, label: 'Mensajes', path: RUTAS.mensajes },
];

const NAV_ADMINISTRADOR = [{ icon: Users, label: 'Candidatos', path: RUTAS.candidatos }];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { rol } = useRol();
  const noLeidos = useMensajesNoLeidos(rol === 'candidato');
  const navItems = rol === 'administrador' ? NAV_ADMINISTRADOR : rol === 'candidato' ? NAV_CANDIDATO : [];
  const [cuentaAbierta, setCuentaAbierta] = useState(false);

  // Evita que el fondo scrollee detrás del drawer mientras está abierto en mobile.
  useEffect(() => {
    if (!open) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previo;
    };
  }, [open]);

  async function handleLogout() {
    await signOut();
    navigate('/', { replace: true });
  }

  return (
    <>
      {open && (
        <div onClick={onClose} aria-hidden="true" className="fixed inset-0 z-40 bg-black/40 md:hidden" />
      )}

      <aside
        className={cn(
          'fixed h-screen w-60 left-0 top-0 bg-background border-r border-outline-variant flex flex-col py-md px-sm z-50 transition-transform duration-200 md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="px-sm mb-xl flex flex-col gap-sm mt-sm">
          <div className="flex items-center justify-between gap-sm">
            <div className="flex items-center gap-sm">
              <img src={logoIcono} alt="" className="w-9 h-9 rounded-full shrink-0" />
              <div className="font-heading font-bold text-2xl leading-tight text-primary">Laburin</div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar menú"
              className="md:hidden p-2.5 -mr-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="text-sm font-medium text-on-surface-variant">
            {rol === 'administrador' ? 'Panel de administración' : 'Tu búsqueda de empleo'}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-3 min-h-11 rounded-lg text-sm font-medium transition-colors duration-150",
                  isActive
                    ? "bg-primary-container text-on-primary-container font-semibold"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low"
                )
              }
            >
              <item.icon strokeWidth={1.75} className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
              {item.path === RUTAS.mensajes && noLeidos > 0 && (
                <span
                  aria-label={noLeidos === 1 ? '1 mensaje sin leer' : `${noLeidos} mensajes sin leer`}
                  className="num ml-auto bg-primary text-on-primary text-xs font-semibold min-w-6 h-6 px-1.5 rounded-full flex items-center justify-center"
                >
                  {noLeidos}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="mt-auto pt-4 border-t border-outline-variant space-y-1">
          <button
            type="button"
            onClick={() => setCuentaAbierta(true)}
            className="w-full flex items-center gap-3 px-3 min-h-11 rounded-lg text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors duration-150 cursor-pointer"
          >
            <UserCircle strokeWidth={1.75} className="w-5 h-5" />
            <span>Mi cuenta</span>
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 min-h-11 rounded-lg text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low transition-colors duration-150 cursor-pointer"
          >
            <LogOut strokeWidth={1.75} className="w-5 h-5" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {cuentaAbierta && <CuentaModal onClose={() => setCuentaAbierta(false)} />}
    </>
  );
}
