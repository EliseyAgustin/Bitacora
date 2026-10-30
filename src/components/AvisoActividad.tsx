import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { Topo } from '@/components/publica/Topo';
import { useAvisoActividad } from '@/hooks/useActividad';
import { RUTAS } from '@/lib/rutas';
import { cn } from '@/lib/utils';
import type { EstadoAvisable, MensajeActividad } from '@/lib/actividad';

// Cada estado usa el color de una etapa para su fondo suave, cálido y sin alarma.
const TONOS: Record<EstadoAvisable, string> = {
  'bajo-ritmo': 'bg-etapa-en-proceso-fondo text-etapa-en-proceso-tinta',
  'sin-actividad': 'bg-etapa-aplicado-fondo text-etapa-aplicado-tinta',
};

interface VistaProps {
  estado: EstadoAvisable;
  mensaje: MensajeActividad;
  // Con ruta es un enlace de verdad; sin ruta se dibuja el botón solo (la página de inicio lo muestra de ejemplo).
  accion: { texto: string; ruta?: string } | null;
  // Sin esta función no hay botón de cerrar.
  onCerrar?: () => void;
  // El aviso real avisa a lectores de pantalla; la muestra de la página de inicio no.
  anunciar?: boolean;
}

const BOTON = 'mt-3 inline-flex h-11 items-center px-5 rounded-lg bg-cta text-on-cta text-sm font-semibold hover:opacity-90 transition-opacity';

// Cómo se ve un aviso: la mascota, el mensaje y el botón que lleva a retomar. Es lo que muestra la aplicación y también la muestra
// de la página de inicio, así las dos son la misma pieza.
export function AvisoActividadVista({ estado, mensaje, accion, onCerrar, anunciar = true }: VistaProps) {
  return (
    <section
      role={anunciar ? 'status' : undefined}
      aria-label={anunciar ? 'Aviso de actividad' : undefined}
      data-estado={estado}
      className={cn('entrada relative flex items-center gap-5 rounded-xl p-5', onCerrar && 'pr-14', TONOS[estado])}
    >
      <Topo className="hidden sm:block w-24 shrink-0 -mb-5" />
      <div className="min-w-0">
        <h2 className="text-xl font-heading font-bold leading-tight">{mensaje.titulo}</h2>
        <p className="mt-1 text-base max-w-prose">{mensaje.texto}</p>
        {accion &&
          (accion.ruta ? (
            <Link to={accion.ruta} className={BOTON}>
              {accion.texto}
            </Link>
          ) : (
            <span aria-hidden="true" className={BOTON}>
              {accion.texto}
            </span>
          ))}
      </div>
      {onCerrar && (
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar el aviso"
          className="absolute top-2 right-2 w-11 h-11 rounded-full flex items-center justify-center hover:bg-black/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </section>
  );
}

interface AvisoActividadProps {
  // Dónde se muestra: arriba de Mis postulaciones o en Mi progreso. Cambia a dónde lleva el botón.
  donde: 'postulaciones' | 'progreso';
}

// Aviso del sistema sobre el ritmo de la búsqueda: amable, con la mascota, y con un botón que lleva a retomar.
export function AvisoActividad({ donde }: AvisoActividadProps) {
  const { aviso, cerrar } = useAvisoActividad();
  if (!aviso) return null;

  const accion =
    donde === 'postulaciones'
      ? { texto: 'Buscar más ofertas', ruta: RUTAS.ofertas }
      : { texto: 'Ver Mis postulaciones', ruta: RUTAS.postulaciones };

  return <AvisoActividadVista estado={aviso.estado} mensaje={aviso.mensaje} accion={accion} onCerrar={cerrar} />;
}
