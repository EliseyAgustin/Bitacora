import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PreguntaPostulacion } from '@/components/PreguntaPostulacion';
import { almacenDeSesion, marcarVisitada, yaVisitada } from '@/lib/visitas';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppLayout() {
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Cualquier navegación cierra el drawer mobile, así no queda abierto tapando la vista de destino.
  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  // Las entradas animadas se muestran solo la primera vez que se abre cada pantalla en la sesión.
  // Se lee al renderizar y se marca al terminar de montar, así no depende de cuántas veces renderice React.
  const primeraVisita = useMemo(() => !yaVisitada(location.pathname, almacenDeSesion()), [location.pathname]);
  useEffect(() => {
    marcarVisitada(location.pathname, almacenDeSesion());
  }, [location.pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-cta focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-on-cta"
      >
        Saltar al contenido
      </a>

      <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col w-full md:ml-60 md:w-[calc(100%-240px)] h-screen overflow-hidden relative">
        <Topbar onMenuClick={() => setMobileNavOpen(true)} />
        <div className="pt-14 md:pt-0 shrink-0"><PreguntaPostulacion /></div>
        <main
          id="contenido"
          tabIndex={-1}
          data-entradas={primeraVisita ? 'si' : 'no'}
          className="flex-1 overflow-auto h-full focus:outline-none"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
