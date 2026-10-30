import type { CSSProperties } from 'react';
import { Building2, ChevronRight, Clock, MapPin, Pencil, Send, Trash2 } from 'lucide-react';
import { MODALIDAD_ETIQUETA } from '@/lib/etiquetas';
import { ETAPA_CLASES } from '@/lib/etapas';
import { cn, scoreBandClasses } from '@/lib/utils';
import { ESTADO_POSTULACION_LABEL } from '@/services/postulaciones';
import type { Oferta } from '@/types/oferta';
import type { Postulacion } from '@/types/postulacion';

const TECNOLOGIAS_VISIBLES = 5;

interface TarjetaOfertaProps {
  oferta: Oferta;
  // Posición en la lista: escalona la entrada de las primeras tarjetas.
  indice: number;
  seleccionada: boolean;
  onSeleccionar: () => void;
  postulacion: Postulacion | undefined;
  postulando: boolean;
  onAbrirDetalle: () => void;
  onPostularme: () => void;
  onVerFicha: () => void;
  onEditar: () => void;
  onEliminar: () => void;
}

// Una oferta en la lista: qué es, cuánto encaja con el perfil (el círculo) y qué se puede hacer con ella.
// Un clic en la tarjeta abre el detalle, salvo que sea sobre un control.
export function TarjetaOferta({
  oferta,
  indice,
  seleccionada,
  onSeleccionar,
  postulacion,
  postulando,
  onAbrirDetalle,
  onPostularme,
  onVerFicha,
  onEditar,
  onEliminar,
}: TarjetaOfertaProps) {
  const tecnologias = oferta.stack_tecnologico;
  const visibles = tecnologias.slice(0, TECNOLOGIAS_VISIBLES);
  const ocultas = tecnologias.length - visibles.length;

  return (
    <article
      onClick={(e) => {
        if (e.target instanceof Element && e.target.closest('button, input, a, label, select, textarea')) return;
        onAbrirDetalle();
      }}
      style={{ '--i': Math.min(indice, 8) } as CSSProperties}
      className={cn(
        'entrada group h-full flex flex-col gap-4 p-5 bg-surface border border-outline-variant rounded-xl cursor-pointer',
        'transition-colors duration-150 hover:border-primary',
        seleccionada && 'border-primary ring-2 ring-primary'
      )}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={seleccionada}
          onChange={onSeleccionar}
          aria-label={`Seleccionar la oferta ${oferta.rol} en ${oferta.empresa}`}
          className="w-5 h-5 mt-1 shrink-0 accent-primary cursor-pointer"
        />
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold leading-snug text-on-surface group-hover:text-primary transition-colors">
            <button type="button" onClick={onAbrirDetalle} className="text-left cursor-pointer wrap-break-word">
              {oferta.rol}
            </button>
          </h3>
          <div className="mt-1 flex items-center gap-2 text-on-surface-variant text-sm">
            <Building2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="wrap-break-word">{oferta.empresa}</span>
          </div>
        </div>
        <div
          className={cn(
            'num w-14 h-14 rounded-full flex flex-col items-center justify-center shrink-0 border font-bold text-xl leading-none',
            scoreBandClasses(oferta.puntaje_scoring)
          )}
        >
          {oferta.puntaje_scoring !== null ? Math.round(oferta.puntaje_scoring) : '—'}
          <span className="sr-only"> puntos</span>
        </div>
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-on-surface-variant">
        {oferta.ubicacion && (
          <li className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 shrink-0" aria-hidden="true" />
            {oferta.ubicacion}
          </li>
        )}
        {oferta.modalidad && (
          <li className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
            {MODALIDAD_ETIQUETA[oferta.modalidad]}
          </li>
        )}
        {oferta.fuente && <li>{oferta.fuente}</li>}
      </ul>

      {tecnologias.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Tecnologías de la oferta">
          {visibles.map((tech) => (
            <li key={tech} className="bg-primary-container text-on-primary-container px-2.5 py-1 rounded-md text-sm font-medium">
              {tech}
            </li>
          ))}
          {ocultas > 0 && (
            <li className="px-2 py-1 text-sm font-medium text-on-surface-variant" title={tecnologias.slice(TECNOLOGIAS_VISIBLES).join(', ')}>
              +{ocultas}
            </li>
          )}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {postulacion ? (
          <button
            type="button"
            onClick={onVerFicha}
            title="Ver ficha de la postulación"
            className={cn(
              'inline-flex items-center gap-2 px-3 h-9 rounded-lg text-sm font-semibold cursor-pointer hover:opacity-80 transition-opacity',
              ETAPA_CLASES[postulacion.estado].chip
            )}
          >
            <span aria-hidden="true" className={cn('w-2 h-2 rounded-full', ETAPA_CLASES[postulacion.estado].punto)} />
            {ESTADO_POSTULACION_LABEL[postulacion.estado]}
          </button>
        ) : (
          <button
            type="button"
            onClick={onPostularme}
            disabled={postulando}
            className="inline-flex items-center gap-1.5 bg-primary text-on-primary px-4 h-9 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" aria-hidden="true" />
            {postulando ? 'Postulando…' : 'Postularme'}
          </button>
        )}
        <button
          type="button"
          onClick={onAbrirDetalle}
          aria-label={`Ver detalle de ${oferta.rol} en ${oferta.empresa}`}
          className="inline-flex items-center gap-1 px-2 h-9 rounded-lg text-sm font-semibold text-primary hover:underline cursor-pointer"
        >
          Ver detalle
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-auto pt-3 flex justify-between items-center border-t border-outline-variant">
        <span className="num text-sm font-medium text-on-surface-variant">{oferta.fecha_publicacion ?? 'Sin fecha'}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEditar}
            aria-label="Editar oferta"
            className="p-2.5 md:p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onEliminar}
            aria-label="Eliminar oferta"
            className="p-2.5 md:p-2 rounded-lg text-error hover:bg-error-container transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </article>
  );
}
