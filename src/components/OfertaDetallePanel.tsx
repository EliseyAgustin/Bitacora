import { useEffect, useRef } from 'react';
import { Building2, CalendarDays, Check, Clock, ExternalLink, MapPin, Minus, Pencil, Send, X } from 'lucide-react';
import { MODALIDAD_ETIQUETA } from '@/lib/etiquetas';
import { urlSegura } from '@/lib/ofertaDetalle';
import { scoreBandClasses } from '@/lib/utils';
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

const chip =
  'bg-surface-container-low text-on-surface-variant px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 border border-outline-variant';

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
  const enlace = urlSegura(oferta.url);
  const desglose = desglosarScoring({ ...oferta }, criterios);
  const maximo = puntajeMaximoPosible(criterios);
  const score = oferta.puntaje_scoring;

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
      className="fixed right-0 top-14 md:top-0 bottom-0 w-130 max-w-full bg-surface-container-lowest border-l border-outline-variant shadow-[0_0_40px_rgba(0,0,0,0.1)] z-50 flex flex-col"
    >
      <div className="px-6 py-6 border-b border-outline-variant flex items-start justify-between gap-3 bg-surface-bright">
        <div className="min-w-0">
          <h2 id="titulo-oferta-detalle" className="text-2xl font-semibold text-on-surface mb-1 wrap-break-word">
            {oferta.rol}
          </h2>
          <div className="flex items-center gap-2 text-on-surface-variant text-sm">
            <Building2 className="w-4.5 h-4.5 shrink-0" aria-hidden="true" />
            <span className="wrap-break-word">{oferta.empresa}</span>
          </div>
        </div>
        <button
          ref={cerrarRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar detalle de la oferta"
          className="w-11 h-11 md:w-8 md:h-8 shrink-0 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
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
        <div className="flex flex-wrap gap-2">
          {oferta.ubicacion && (
            <span className={chip}>
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" /> {oferta.ubicacion}
            </span>
          )}
          {oferta.modalidad && (
            <span className={chip}>
              <Clock className="w-3.5 h-3.5" aria-hidden="true" /> {MODALIDAD_ETIQUETA[oferta.modalidad]}
            </span>
          )}
          <span className={chip}>
            <CalendarDays className="w-3.5 h-3.5" aria-hidden="true" /> {oferta.fecha_publicacion ?? 'Sin fecha'}
          </span>
          {oferta.fuente && <span className={chip}>Fuente: {oferta.fuente}</span>}
        </div>

        {oferta.stack_tecnologico.length > 0 && (
          <section aria-labelledby="detalle-tecnologias">
            <h3 id="detalle-tecnologias" className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
              Tecnologías
            </h3>
            <div className="flex flex-wrap gap-2">
              {oferta.stack_tecnologico.map((tech) => (
                <span key={tech} className="bg-primary-container text-on-primary-container px-2 py-1 rounded text-[11px] font-medium">
                  {tech}
                </span>
              ))}
            </div>
          </section>
        )}

        <section aria-labelledby="detalle-puntaje">
          <h3 id="detalle-puntaje" className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
            Por qué tiene este puntaje
          </h3>
          <div className="flex items-center gap-4 mb-4">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold shrink-0 border ${scoreBandClasses(score)}`}
            >
              {score !== null ? Math.round(score) : '—'}
            </div>
            <p className="text-sm text-on-surface-variant">
              {desglose.length === 0
                ? 'Todavía no armaste tu perfil de búsqueda, por eso no hay puntaje que explicar.'
                : `Suma los pesos de tu perfil que esta oferta cumple, sobre un máximo posible de ${maximo} puntos.`}
            </p>
          </div>
          {desglose.length > 0 && (
            <ul className="flex flex-col divide-y divide-outline-variant border border-outline-variant rounded-lg overflow-hidden">
              {desglose.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm bg-surface-container-lowest">
                  <span className="flex items-center gap-2 min-w-0">
                    {c.coincide ? (
                      <Check className="w-4 h-4 shrink-0 text-success" aria-hidden="true" />
                    ) : (
                      <Minus className="w-4 h-4 shrink-0 text-on-surface-variant" aria-hidden="true" />
                    )}
                    <span className={`wrap-break-word ${c.coincide ? 'text-on-surface' : 'text-on-surface-variant'}`}>{c.nombre}</span>
                  </span>
                  <span className={`shrink-0 text-xs font-medium ${c.coincide ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                    {c.coincide ? `Coincide · suma ${c.peso}` : 'No coincide'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="detalle-descripcion">
          <h3 id="detalle-descripcion" className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
            Descripción
          </h3>
          {oferta.descripcion ? (
            // Texto plano: se muestra tal cual, sin interpretar nada como HTML.
            <p className="text-sm text-on-surface leading-relaxed whitespace-pre-line wrap-break-word">{oferta.descripcion}</p>
          ) : (
            <p className="text-sm text-on-surface-variant">
              Esta oferta no tiene descripción guardada.{' '}
              {enlace ? 'Abrila en el sitio de origen para ver el detalle completo.' : 'Podés agregarla desde Editar.'}
            </p>
          )}
        </section>
      </div>

      <div className="px-6 py-4 border-t border-outline-variant bg-surface-bright flex flex-col gap-3">
        {enlace ? (
          <a
            href={enlace}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-11 bg-primary text-on-primary text-sm font-medium px-5 rounded-lg shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
            Ver oferta y postularme
            <span className="sr-only"> (se abre en una pestaña nueva{oferta.fuente ? `, en ${oferta.fuente}` : ''})</span>
          </a>
        ) : (
          <div className="flex items-center justify-between gap-3 text-sm text-on-surface-variant">
            <p>Esta oferta no tiene enlace para postularse.</p>
            <button
              type="button"
              onClick={() => onEditar(oferta)}
              className="min-h-11 px-3 flex items-center gap-1.5 text-sm font-medium text-primary hover:underline cursor-pointer shrink-0"
            >
              <Pencil className="w-4 h-4" aria-hidden="true" />
              Agregar enlace
            </button>
          </div>
        )}

        {postulacion ? (
          <button
            type="button"
            onClick={() => onVerFicha(postulacion.id)}
            className="min-h-11 bg-primary-container text-on-primary-container text-sm font-medium px-5 rounded-lg hover:opacity-80 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            En seguimiento: {ESTADO_POSTULACION_LABEL[postulacion.estado]} · Ver ficha
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onPostularme(oferta)}
            disabled={postulando}
            className="min-h-11 bg-surface-container-high text-on-surface text-sm font-medium px-5 rounded-lg border border-outline-variant hover:bg-surface-variant transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            {postulando ? 'Guardando…' : 'Guardar en Mis postulaciones'}
          </button>
        )}

        {enlace && oferta.fuente && oferta.fuente !== 'Carga manual' && (
          <p className="text-xs text-on-surface-variant">
            La oferta original está publicada en {oferta.fuente}: ahí se completa la postulación.
          </p>
        )}
      </div>
    </aside>
  );
}
