import { useEffect, useState, type DragEvent } from 'react';
import { AlertTriangle, Building2, Clock, Inbox, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AvisoActividad } from '@/components/AvisoActividad';
import { PageHeader } from '@/components/PageHeader';
import { PrimerosPasos } from '@/components/PrimerosPasos';
import { RUTAS } from '@/lib/rutas';
import { mensajeDeError } from '@/lib/errores';
import { DESCRIPCION_ETAPA, ETAPA_CLASES } from '@/lib/etapas';
import { ApplicationDetailPanel } from '@/components/ApplicationDetailPanel';
import { useAuth } from '@/hooks/useAuth';
import { cn, scoreBorderClasses } from '@/lib/utils';
import { estadoEsFinal, generarRecordatorios, listarRecordatoriosActivos } from '@/services/recordatorios';
import type { Recordatorio } from '@/types/recordatorio';
import {
  actualizarEstadoPostulacion,
  eliminarPostulacion,
  ESTADOS_POSTULACION,
  listarPostulacionesConOferta,
} from '@/services/postulaciones';
import type { EstadoPostulacion, PostulacionConOferta } from '@/types/postulacion';

export function Tablero() {
  const { user } = useAuth();
  const [postulaciones, setPostulaciones] = useState<PostulacionConOferta[]>([]);
  const [recordatorios, setRecordatorios] = useState<Record<string, Recordatorio>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverEstado, setDragOverEstado] = useState<EstadoPostulacion | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Si el efecto se cancela (StrictMode lo monta dos veces en desarrollo), la respuesta de esa corrida se descarta.
  // Antes la primera respuesta mostraba las tarjetas y la segunda, tardía, pisaba con datos viejos
  // cualquier movimiento hecho mientras tanto: la tarjeta volvía a su columna aunque la base ya la había guardado.
  useEffect(() => {
    let cancelado = false;
    refetch(() => cancelado);
    return () => {
      cancelado = true;
    };
  }, []);

  async function refetch(cancelado: () => boolean = () => false) {
    setLoading(true);
    try {
      const data = await listarPostulacionesConOferta();
      if (cancelado()) return;
      setPostulaciones(data);
      setLoadError(null);
    } catch (err) {
      if (cancelado()) return;
      setLoadError(mensajeDeError(err, 'No se pudieron cargar las postulaciones.'));
    } finally {
      if (!cancelado()) setLoading(false);
    }

    if (cancelado()) return;
    await cargarRecordatorios();
  }

  async function cargarRecordatorios() {
    if (!user) return;

    try {
      await generarRecordatorios(user.id);
      const activos = await listarRecordatoriosActivos();
      setRecordatorios(Object.fromEntries(activos.map((r) => [r.postulacion_id, r])));
    } catch (err) {
      setActionError(mensajeDeError(err, 'No se pudieron cargar los recordatorios.'));
    }
  }

  async function handleDelete(postulacion: PostulacionConOferta) {
    if (!window.confirm(`¿Dejar de trackear la postulación a "${postulacion.oferta.rol}"?`)) return;

    try {
      await eliminarPostulacion(postulacion.id);
      setPostulaciones((prev) => prev.filter((p) => p.id !== postulacion.id));
      setSelectedId((prev) => (prev === postulacion.id ? null : prev));
      setActionError(null);
    } catch (err) {
      setActionError(mensajeDeError(err, 'No se pudo eliminar la postulación.'));
    }
  }

  function handleDragStart(e: DragEvent<HTMLDivElement>, id: string) {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(id);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverEstado(null);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>, estado: EstadoPostulacion) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverEstado(estado);
  }

  // Compartida entre el drop del drag nativo (desktop) y el <select> "Mover a..." (mobile, sin drag táctil).
  async function moverEstado(postulacion: PostulacionConOferta, estado: EstadoPostulacion) {
    if (postulacion.estado === estado) return;

    const estadoAnterior = postulacion.estado;
    setPostulaciones((prev) => prev.map((p) => (p.id === postulacion.id ? { ...p, estado } : p)));

    try {
      const actualizada = await actualizarEstadoPostulacion(postulacion.id, estado, postulacion.fecha_postulacion);
      setPostulaciones((prev) =>
        prev.map((p) => (p.id === postulacion.id ? { ...p, fecha_postulacion: actualizada.fecha_postulacion } : p))
      );
      setActionError(null);
    } catch (err) {
      setActionError(mensajeDeError(err, 'No se pudo actualizar el estado.'));
      setPostulaciones((prev) => prev.map((p) => (p.id === postulacion.id ? { ...p, estado: estadoAnterior } : p)));
    }
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>, estado: EstadoPostulacion) {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    setDraggingId(null);
    setDragOverEstado(null);

    const postulacion = postulaciones.find((p) => p.id === id);
    if (!postulacion) return;
    await moverEstado(postulacion, estado);
  }

  if (loading) {
    return (
      <div className="flex-1 h-full p-lg flex items-center justify-center text-on-surface-variant text-sm">
        Cargando postulaciones…
      </div>
    );
  }

  return (
    <div className="flex-1 h-full p-lg overflow-x-auto relative flex flex-col gap-sm">
      {loadError && (
        <div className="p-4 bg-error-container text-on-error-container rounded-lg text-sm shrink-0">
          {loadError}
        </div>
      )}
      {actionError && (
        <div className="p-4 bg-error-container text-on-error-container rounded-lg text-sm shrink-0">
          {actionError}
        </div>
      )}

      <div className="shrink-0 flex flex-col gap-4 sticky left-0 w-[calc(100vw-2rem)] md:w-[calc(100vw-240px-4rem)]">
        <PageHeader
          title="Mis postulaciones"
          help="Seguí en qué etapa está cada postulación. Arrastrá las tarjetas entre columnas, o usá el selector en el celular."
        />
        <AvisoActividad donde="postulaciones" />
        <PrimerosPasos />
        {Object.keys(recordatorios).length > 0 && (
          <p className="text-sm text-on-surface-variant">
            Las tarjetas con «Sin novedades» llevan un recordatorio: es solo un aviso, no se borra ni se cambia nada. Podés
            cambiar cada cuántos días avisamos en Mi perfil de búsqueda.
          </p>
        )}
        {postulaciones.length === 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-on-surface-variant">
              Todavía no te postulaste a ninguna oferta. Elegí una en Ofertas y apretá «Postularme»: va a aparecer acá.
            </p>
            <Link
              to={RUTAS.ofertas}
              className="bg-cta text-on-cta text-sm font-medium px-5 py-2.5 rounded-lg shadow-sm hover:opacity-90 transition-all"
            >
              Ir a Ofertas
            </Link>
          </div>
        )}
      </div>

      <div className="flex gap-lg flex-1 min-h-0 pb-sm w-max">
        {ESTADOS_POSTULACION.map(({ estado, label }) => {
          const items = postulaciones.filter((p) => p.estado === estado);

          return (
            <div
              key={estado}
              onDragOver={(e) => handleDragOver(e, estado)}
              onDragLeave={() => setDragOverEstado((prev) => (prev === estado ? null : prev))}
              onDrop={(e) => handleDrop(e, estado)}
              className={cn(
                'flex flex-col w-80 h-full rounded-lg bg-surface-container-low border border-outline-variant overflow-hidden transition-colors',
                dragOverEstado === estado && 'border-primary bg-primary-container/20'
              )}
            >
              <div className="px-md pt-md pb-sm border-b border-outline-variant bg-surface shrink-0">
                <div className="flex justify-between items-center gap-2">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-on-surface">
                    <span aria-hidden="true" className={cn('w-2.5 h-2.5 rounded-full', ETAPA_CLASES[estado].punto)} />
                    {label}
                  </h3>
                  <span className={cn('num px-2.5 py-0.5 rounded-full text-sm font-bold', ETAPA_CLASES[estado].chip)}>
                    {items.length}
                  </span>
                </div>
                <p className="mt-1 text-sm text-on-surface-variant leading-snug">{DESCRIPCION_ETAPA[estado]}</p>
              </div>

              {items.length === 0 ? (
                <div className="flex-1 overflow-y-auto p-sm space-y-sm flex flex-col items-center justify-center text-outline-variant custom-scrollbar">
                  <Inbox className="w-12 h-12 mb-1" />
                  <p className="text-sm font-medium text-on-surface-variant">Sin tarjetas por ahora</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto p-sm space-y-sm custom-scrollbar">
                  {items.map((postulacion) => (
                    <div
                      key={postulacion.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, postulacion.id)}
                      onDragEnd={handleDragEnd}
                      onClick={() => setSelectedId(postulacion.id)}
                      className={cn(
                        'bg-surface-container-lowest border border-outline-variant rounded-md p-md shadow-sm hover:shadow-md hover:border-primary transition-all cursor-grab active:cursor-grabbing border-t-4 flex flex-col min-h-30 group',
                        scoreBorderClasses(postulacion.oferta.puntaje_scoring),
                        draggingId === postulacion.id && 'opacity-40'
                      )}
                    >
                      <div className="flex justify-between items-start mb-sm">
                        <h4 className="text-sm font-medium text-on-surface leading-tight">{postulacion.oferta.rol}</h4>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(postulacion);
                          }}
                          aria-label="Eliminar postulación"
                          className="p-2.5 md:p-1 -m-2.5 md:-m-1 text-outline hover:text-error opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm font-medium text-on-surface-variant mb-sm flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" /> {postulacion.oferta.empresa}
                      </p>
                      {recordatorios[postulacion.id] && !estadoEsFinal(postulacion.estado) && (
                        <span
                          title="Recordatorio: no se borra nada. Registrá una novedad o marcalo como resuelto desde la ficha."
                          className="self-start mb-sm inline-flex items-center gap-1 bg-tertiary-container text-on-tertiary-container px-2 py-0.5 rounded-full text-sm font-semibold">
                          <AlertTriangle className="w-3 h-3" />
                          Sin novedades hace {recordatorios[postulacion.id].dias_inactividad} días
                        </span>
                      )}
                      {/* El drag nativo no dispara con touch: en mobile se mueve de estado con este select. */}
                      <select
                        value={postulacion.estado}
                        onChange={(e) => moverEstado(postulacion, e.target.value as EstadoPostulacion)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Mover "${postulacion.oferta.rol}" a otro estado`}
                        className="md:hidden mb-sm w-full min-h-11 bg-surface-container-lowest border border-outline-variant rounded-md px-2 text-sm font-medium text-on-surface focus:border-primary outline-none cursor-pointer"
                      >
                        {ESTADOS_POSTULACION.map(({ estado, label }) => (
                          <option key={estado} value={estado}>
                            {label}
                          </option>
                        ))}
                      </select>
                      <div className="flex justify-between items-end mt-auto">
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-primary"></span>
                          <span className="text-sm font-semibold text-on-surface-variant">
                            Puntaje: {postulacion.oferta.puntaje_scoring !== null ? Math.round(postulacion.oferta.puntaje_scoring) : '—'}
                          </span>
                        </div>
                        {postulacion.fecha_postulacion && (
                          <div className="flex items-center gap-1 text-on-surface-variant bg-surface-container px-2 py-1 rounded-sm">
                            <Clock className="w-3.5 h-3.5" />
                            <span className="text-sm font-semibold">{postulacion.fecha_postulacion}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ApplicationDetailPanel
        postulacionId={selectedId}
        onClose={() => setSelectedId(null)}
        onRecordatorioResuelto={(id) =>
          setRecordatorios((prev) => Object.fromEntries(Object.entries(prev).filter(([pid]) => pid !== id)))
        }
        onEstadoChange={(id, estado, fecha_postulacion) =>
          setPostulaciones((prev) => prev.map((p) => (p.id === id ? { ...p, estado, fecha_postulacion } : p)))
        }
      />
    </div>
  );
}
