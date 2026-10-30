import { useEffect, useRef } from 'react';
import { Building2, CalendarDays, Check, Clock, ExternalLink, MapPin, Minus, Send, X } from 'lucide-react';
import { EVENTO_PENDIENTE } from '@/components/PreguntaPostulacion';
import { useAuth } from '@/hooks/useAuth';
import { almacenLocal } from '@/lib/actividad';
import { agregarPendiente } from '@/lib/pendientes';
import { MODALIDAD_ETIQUETA } from '@/lib/etiquetas';
import { ETAPA_CLASES } from '@/lib/etapas';
import { resumenDeCoincidencias, urlSegura } from '@/lib/ofertaDetalle';
import { cn, scoreBandClasses } from '@/lib/utils';
import { puntajeMaximoPosible } from '@/services/criteriosScoring';
import { desglosarScoring } from '@/services/scoring';
import { ESTADO_POSTULACION_LABEL } from '@/services/postulaciones';
import type { CriterioScoring } from '@/types/criterioScoring';
import type { Oferta } from '@/types/oferta';
import type { Postulacion } from '@/types/postulacion';

interface OfertaDetallePanelProps {
  oferta: Oferta;
  criterios: CriterioScoring[];
  postulacion: Postulacion | undefined;
  postulando: boolean;
  onClose: () => void;
  onPostularme: (oferta: Oferta) => void;
  onVerFicha: (postulacionId: string) => void;
  onEditar: (oferta: Oferta) => void;
}

const dato = 'text-on-surface-variant text-sm flex items-center gap-1.5';
const titulo = 'text-base font-semibold text-on-surface mb-3';

// Detalle de una oferta: de dónde viene, por qué tiene ese puntaje, qué dice y el enlace para postularse en el sitio de origen.
export function OfertaDetallePanel({
  oferta,
  criterios,
  postulacion,
  postulando,
  onClose,
  onPostularme,
  onVerFicha,
  onEditar,
}: OfertaDetallePanelProps) {
  const cerrarRef = useRef<HTMLButtonElement>(null);
  const { user } = useAuth();
  const enlace = urlSegura(oferta.url);

  // Se recuerda que abrió el enlace para preguntarle, al volver, si llegó a postularse.
  function alAbrirEnlace() {
    if (!user || postulacion) return;
    agregarPendiente(user.id, { ofertaId: oferta.id, empresa: oferta.empresa, rol: oferta.rol }, Date.now(), almacenLocal());
    window.dispatchEvent(new Event(EVENTO_PENDIENTE));
  }
  const desglose = desglosarScoring({ ...oferta }, criterios);
  const { coinciden, total } = resumenDeCoincidencias(desglose);
  const maximo = puntajeMaximoPosible(criterios);
  const score = oferta.puntaje_scoring;
  const esDeFuenteExterna = Boolean(oferta.fuente && oferta.fuente !== 'Carga manual');

  // Al abrir, el foco pasa al panel; al cerrar vuelve a donde estaba. Escape lo cierra.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    cerrarRef.current?.focus();
    function alTeclear(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('keydown', alTeclear);
      anterior?.focus?.();
    };
  }, [onClose]);

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="titulo-oferta-detalle"
      className="fixed right-0 top-14 md:top-0 bottom-0 w-130 max-w-full bg-surface border-l border-outline-variant shadow-[0_0_40px_rgba(0,0,0,0.12)] z-50 flex flex-col"
    >
      <div className="px-6 py-5 border-b border-outline-variant flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="titulo-oferta-detalle" className="text-2xl font-heading font-bold leading-tight text-on-surface wrap-break-word">
            {oferta.rol}
          </h2>
          <div className="mt-1.5 flex items-center gap-2 text-on-surface-variant text-base">
            <Building2 className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span className="wrap-break-word">{oferta.empresa}</span>
          </div>
        </div>
        <button
          ref={cerrarRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle de la oferta"
          className="w-11 h-11 md:w-9 md:h-9 shrink-0 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* tabIndex: el contenido se desplaza, así que se tiene que poder recorrer con el teclado (sin controles adentro, no habría cómo). */}
      <div
        tabIndex={0}
        role="region"
        aria-label="Contenido de la oferta"
        className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-8 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      >
        <ul className="flex flex-wrap gap-x-5 gap-y-2">
          {oferta.ubicacion && (
            <li className={dato}>
              <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" /> {oferta.ubicacion}
            </li>
          )}
          {oferta.modalidad && (
            <li className={dato}>
              <Clock className="w-4 h-4 shrink-0" aria-hidden="true" /> {MODALIDAD_ETIQUETA[oferta.modalidad]}
            </li>
          )}
          <li className={cn(dato, 'num')}>
            <CalendarDays className="w-4 h-4 shrink-0" aria-hidden="true" /> {oferta.fecha_publicacion ?? 'Sin fecha'}
          </li>
          {oferta.fuente && <li className={dato}>Fuente: {oferta.fuente}</li>}
        </ul>

        {oferta.stack_tecnologico.length > 0 && (
          <section aria-labelledby="detalle-tecnologias">
            <h3 id="detalle-tecnologias" className={titulo}>
              Tecnologías
            </h3>
            <ul className="flex flex-wrap gap-2">
              {oferta.stack_tecnologico.map((tech) => (
                <li key={tech} className="bg-primary-container text-on-primary-container px-2.5 py-1 rounded-md text-sm font-medium">
                  {tech}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="detalle-puntaje">
          <h3 id="detalle-puntaje" className={titulo}>
            Por qué tiene este puntaje
          </h3>
          <div className="flex items-center gap-4 mb-4">
            <div
              className={cn(
                'num w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold shrink-0 border',
                scoreBandClasses(score)
              )}
            >
              {score !== null ? Math.round(score) : '—'}
            </div>
            <div className="text-base text-on-surface">
              {total === 0 ? (
                <p className="text-on-surface-variant">Todavía no armaste tu perfil de búsqueda, por eso no hay puntaje que explicar.</p>
              ) : (
                <>
                  <p className="font-semibold">
                    Coincide con {coinciden} de {total} {total === 1 ? 'criterio' : 'criterios'} de tu perfil.
                  </p>
                  <p className="text-sm text-on-surface-variant mt-0.5">
                    Suma los pesos de tu perfil que esta oferta cumple, sobre un máximo posible de {maximo} puntos.
                  </p>
                </>
              )}
            </div>
          </div>
          {total > 0 && (
            <ul className="flex flex-col divide-y divide-outline-variant border border-outline-variant rounded-lg overflow-hidden">
              {desglose.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 py-3 text-base">
                  <span className="flex items-center gap-2.5 min-w-0">
                    {c.coincide ? (
                      <span className="w-5 h-5 rounded-full bg-success-container text-on-success-container flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center shrink-0">
                        <Minus className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />
                      </span>
                    )}
                    <span className={cn('wrap-break-word', c.coincide ? 'text-on-surface font-medium' : 'text-on-surface-variant')}>{c.nombre}</span>
                  </span>
                  <span className={cn('num shrink-0 text-sm', c.coincide ? 'font-semibold text-on-success-container' : 'text-on-surface-variant')}>
                    {c.coincide ? `Coincide · suma ${c.peso}` : 'No coincide'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="detalle-descripcion">
          <h3 id="detalle-descripcion" className={titulo}>
            Descripción
          </h3>
          {oferta.descripcion ? (
            // Texto plano: se muestra tal cual, sin interpretar nada como HTML.
            <p className="text-base text-on-surface leading-relaxed whitespace-pre-line wrap-break-word">{oferta.descripcion}</p>
          ) : (
            <p className="text-base text-on-surface-variant">
              Esta oferta no tiene descripción guardada.{' '}
              {enlace ? 'Abrila en el sitio de origen para ver el detalle completo.' : 'Podés agregarla desde Editar.'}
            </p>
          )}
        </section>
      </div>

      <div className="px-6 py-3 md:py-4 border-t border-outline-variant flex flex-col gap-2 md:gap-3">
        {enlace ? (
          <a
            href={enlace}
            onClick={alAbrirEnlace}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-11 md:min-h-12 bg-primary text-on-primary text-base font-semibold px-5 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
          >
            <ExternalLink className="w-4.5 h-4.5" aria-hidden="true" />
            Ver oferta y postularme
            <span className="sr-only"> (se abre en una pestaña nueva{oferta.fuente ? `, en ${oferta.fuente}` : ''})</span>
          </a>
        ) : (
          <div className="flex items-center justify-between gap-3 text-base text-on-surface-variant">
            <p>Esta oferta no tiene enlace para postularse.</p>
            <button
              type="button"
              onClick={() => onEditar(oferta)}
              className="min-h-11 px-3 text-base font-semibold text-primary hover:underline cursor-pointer shrink-0"
            >
              Agregar enlace
            </button>
          </div>
        )}

        {postulacion ? (
          <button
            type="button"
            onClick={() => onVerFicha(postulacion.id)}
            className={cn(
              'min-h-11 md:min-h-12 text-base font-semibold px-5 rounded-lg hover:opacity-80 transition-opacity flex items-center justify-center gap-2 cursor-pointer',
              ETAPA_CLASES[postulacion.estado].chip
            )}
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            En seguimiento: {ESTADO_POSTULACION_LABEL[postulacion.estado]} · Ver ficha
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onPostularme(oferta)}
            disabled={postulando}
            className="min-h-11 md:min-h-12 bg-surface text-on-surface text-base font-semibold px-5 rounded-lg border border-outline hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            {postulando ? 'Guardando…' : 'Guardar para después'}
          </button>
        )}

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-on-surface-variant">
            {enlace && !postulacion
              ? 'Cuando vuelvas, te preguntamos si llegaste a postularte y la dejamos en Aplicado.'
              : esDeFuenteExterna && enlace
                ? `La oferta original está publicada en ${oferta.fuente}: ahí se completa la postulación.`
                : ''}
          </p>
          {enlace && (
            <button
              type="button"
              onClick={() => onEditar(oferta)}
              className="min-h-11 px-3 shrink-0 text-sm font-semibold text-on-surface-variant hover:text-primary hover:underline cursor-pointer"
            >
              Editar
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
