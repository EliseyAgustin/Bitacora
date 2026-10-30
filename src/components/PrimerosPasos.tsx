import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { RUTAS } from '@/lib/rutas';
import { listarCriterios } from '@/services/criteriosScoring';
import { contarMisPostulaciones } from '@/services/postulaciones';
import { cn } from '@/lib/utils';
import { MARCA } from '@/lib/marca';

const PASOS = [
  { texto: 'Revisá tu perfil de búsqueda', enlace: 'Ir a Mi perfil de búsqueda', ruta: RUTAS.perfil },
  { texto: 'Importá o cargá ofertas', enlace: 'Ir a Ofertas', ruta: RUTAS.ofertas },
  { texto: 'Postulate a una de ellas', enlace: 'Ir a Ofertas', ruta: RUTAS.ofertas },
  { texto: 'Seguí su avance en Mis postulaciones', enlace: 'Ir a Mis postulaciones', ruta: RUTAS.postulaciones },
];

const clave = (userId: string) => `laburin:primeros-pasos-cerrado:${userId}`;

function leerCerrada(userId: string): boolean {
  try {
    return localStorage.getItem(clave(userId)) === '1';
  } catch {
    return false;
  }
}

// Visible mientras el usuario no tenga postulaciones, salvo que la haya cerrado (se recuerda por usuario).
export function PrimerosPasos() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  // null = todavía no se sabe. El paso 1 está hecho cuando el usuario ya tiene criterios en su perfil de búsqueda.
  const [tienePerfil, setTienePerfil] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || leerCerrada(user.id)) {
      setVisible(false);
      return;
    }
    let cancelado = false;
    contarMisPostulaciones()
      .then((n) => {
        if (!cancelado) setVisible(n === 0);
      })
      .catch(() => {
        if (!cancelado) setVisible(false);
      });
    listarCriterios()
      .then((criterios) => {
        if (!cancelado) setTienePerfil(criterios.length > 0);
      })
      .catch(() => undefined);
    return () => {
      cancelado = true;
    };
  }, [user]);

  if (!visible || !user) return null;

  function cerrar() {
    try {
      localStorage.setItem(clave(user!.id), '1');
    } catch {
      // Sin almacenamiento disponible: se cierra solo hasta la próxima visita.
    }
    setVisible(false);
  }

  return (
    <section
      aria-labelledby="primeros-pasos-titulo"
      className="bg-primary-container text-on-primary-container rounded-xl p-5 relative"
    >
      <button
        type="button"
        onClick={cerrar}
        aria-label="Cerrar Primeros pasos"
        className="absolute top-2 right-2 p-2.5 rounded-lg hover:bg-black/10 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
      <h2 id="primeros-pasos-titulo" className="text-lg font-heading font-semibold pr-8">
        Primeros pasos
      </h2>
      <p className="text-sm mt-1">Cuatro pasos para empezar a usar {MARCA.nombre}. Esta tarjeta desaparece cuando te postules.</p>
      <ol className="mt-3 grid gap-2 md:grid-cols-2">
        {PASOS.map((paso, i) => {
          const hecho = i === 0 && tienePerfil === true;
          const pendiente = i === 0 && tienePerfil === false;
          return (
            <li
              key={paso.texto}
              data-estado={hecho ? 'hecho' : pendiente ? 'pendiente' : undefined}
              className={cn(
                'flex items-start gap-3 text-sm rounded-lg',
                pendiente && 'bg-surface-container-lowest text-on-surface ring-2 ring-primary p-3 -m-1'
              )}
            >
              <span className="w-6 h-6 rounded-full bg-cta text-on-cta text-xs font-semibold flex items-center justify-center shrink-0">
                {hecho ? <Check className="w-3.5 h-3.5" aria-label="Hecho" /> : i + 1}
              </span>
              <span>
                {paso.texto}.{' '}
                {pendiente && (
                  <span className="inline-block text-sm font-semibold bg-tertiary-container text-on-tertiary-container rounded-full px-2 py-0.5 mr-1">
                    Pendiente
                  </span>
                )}
                <Link to={paso.ruta} className="font-medium underline underline-offset-2">
                  {paso.enlace}
                </Link>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
