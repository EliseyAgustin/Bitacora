import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { Topo } from '@/components/publica/Topo';
import { useActividad } from '@/hooks/useActividad';
import { RUTAS } from '@/lib/rutas';
import { cn } from '@/lib/utils';
import type { EstadoAvisable } from '@/lib/actividad';

// Cada estado usa el color de una etapa para su fondo suave: cálido si hay que retomar, verde si va bien.
const TONOS: Record<EstadoAvisable, string> = {
  'bajo-ritmo': 'bg-etapa-en-proceso-fondo text-etapa-en-proceso-tinta',
  'sin-actividad': 'bg-etapa-aplicado-fondo text-etapa-aplicado-tinta',
  'vas-bien': 'bg-etapa-oferta-fondo text-etapa-oferta-tinta',
};

interface AvisoActividadProps {
  // Dónde se muestra: arriba de Mis postulaciones o en Mi progreso. Cambia a dónde lleva el botón.
  donde: 'postulaciones' | 'progreso';
}

// Aviso del sistema sobre el ritmo de la búsqueda: amable, con la mascota, y con un botón que lleva a retomar.
export function AvisoActividad({ donde }: AvisoActividadProps) {
  const { aviso, cerrar } = useActividad();
  if (!aviso) return null;

  const { estado, mensaje } = aviso;
  const accion =
    estado === 'vas-bien'
      ? null
      : donde === 'postulaciones'
        ? { texto: 'Buscar más ofertas', ruta: RUTAS.ofertas }
        : { texto: 'Ver Mis postulaciones', ruta: RUTAS.postulaciones };

  return (
    <section
      role="status"
      aria-label="Aviso de actividad"
      data-estado={estado}
      className={cn('entrada relative flex items-center gap-5 rounded-xl p-5 pr-14', TONOS[estado])}
    >
      <Topo className="hidden sm:block w-24 shrink-0 -mb-5" />
      <div className="min-w-0">
        <h2 className="text-xl font-heading font-bold leading-tight">{mensaje.titulo}</h2>
        <p className="mt-1 text-base max-w-prose">{mensaje.texto}</p>
        {accion && (
          <Link
            to={accion.ruta}
            className="mt-3 inline-flex h-11 items-center px-5 rounded-lg bg-cta text-on-cta text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            {accion.texto}
          </Link>
        )}
      </div>
      <button
        type="button"
        onClick={cerrar}
        aria-label="Cerrar el aviso"
        className="absolute top-2 right-2 w-11 h-11 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors cursor-pointer"
      >
        <X className="w-5 h-5" />
      </button>
    </section>
  );
}
