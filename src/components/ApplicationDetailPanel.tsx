import { useEffect, useState, type FormEvent } from 'react';
import {
  X,
  Building2,
  Globe,
  Mail,
  Phone,
  Video,
  StickyNote,
  CalendarDays,
  AlertTriangle,
  PlusCircle,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { mensajeDeError } from '@/lib/errores';
import { DESCRIPCION_ETAPA, ETAPA_CLASES } from '@/lib/etapas';
import { cn, datetimeLocalValue, scoreBandClasses } from '@/lib/utils';
import { crearInteraccion, eliminarInteraccion, listarInteracciones } from '@/services/interacciones';
import {
  actualizarEstadoPostulacion,
  ESTADOS_POSTULACION,
  obtenerPostulacionConOferta,
} from '@/services/postulaciones';
import {
  estadoEsFinal,
  obtenerRecordatorioActivo,
  resolverRecordatorio,
  resolverRecordatoriosDePostulacion,
} from '@/services/recordatorios';
import type { Interaccion, TipoInteraccion } from '@/types/interaccion';
import type { EstadoPostulacion, PostulacionConOferta } from '@/types/postulacion';
import type { Recordatorio } from '@/types/recordatorio';

interface PanelProps {
  postulacionId: string | null;
  onClose: () => void;
  onRecordatorioResuelto?: (postulacionId: string) => void;
  onEstadoChange?: (postulacionId: string, estado: EstadoPostulacion, fechaPostulacion: string | null) => void;
}

const TIPO_INTERACCION: Record<TipoInteraccion, { label: string; icon: LucideIcon }> = {
  mail: { label: 'Mail', icon: Mail },
  llamada: { label: 'Llamada', icon: Phone },
  entrevista: { label: 'Entrevista', icon: Video },
  nota: { label: 'Nota', icon: StickyNote },
};

function formatearFechaHora(iso: string) {
  return new Date(iso).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });
}

export function ApplicationDetailPanel({ postulacionId, onClose, onEstadoChange, onRecordatorioResuelto }: PanelProps) {
  const [postulacion, setPostulacion] = useState<PostulacionConOferta | null>(null);
  const [interacciones, setInteracciones] = useState<Interaccion[]>([]);
  const [recordatorio, setRecordatorio] = useState<Recordatorio | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formAbierto, setFormAbierto] = useState(false);
  const [tipo, setTipo] = useState<TipoInteraccion>('mail');
  const [fechaHora, setFechaHora] = useState(() => datetimeLocalValue(new Date()));
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [resolviendo, setResolviendo] = useState(false);

  useEffect(() => {
    if (!postulacionId) return;

    let cancelado = false;
    setLoading(true);
    setError(null);
    setFormAbierto(false);
    setPostulacion(null);
    setInteracciones([]);
    setRecordatorio(null);

    Promise.all([
      obtenerPostulacionConOferta(postulacionId),
      listarInteracciones(postulacionId),
      obtenerRecordatorioActivo(postulacionId),
    ])
      .then(([p, i, r]) => {
        if (cancelado) return;
        setPostulacion(p);
        setInteracciones(i);
        setRecordatorio(r);
      })
      .catch((err) => {
        if (!cancelado) setError(mensajeDeError(err, 'No se pudo cargar la postulación.'));
      })
      .finally(() => {
        if (!cancelado) setLoading(false);
      });

    return () => {
      cancelado = true;
    };
  }, [postulacionId]);

  async function handleEstadoChange(estado: EstadoPostulacion) {
    if (!postulacion || estado === postulacion.estado) return;

    const estadoAnterior = postulacion.estado;
    setPostulacion({ ...postulacion, estado });
    try {
      const actualizada = await actualizarEstadoPostulacion(postulacion.id, estado, postulacion.fecha_postulacion);
      setPostulacion((prev) => (prev ? { ...prev, fecha_postulacion: actualizada.fecha_postulacion } : prev));
      onEstadoChange?.(postulacion.id, estado, actualizada.fecha_postulacion);
      setError(null);
    } catch (err) {
      setPostulacion((prev) => (prev ? { ...prev, estado: estadoAnterior } : prev));
      setError(mensajeDeError(err, 'No se pudo actualizar el estado.'));
    }
  }

  function abrirForm() {
    setTipo('mail');
    setFechaHora(datetimeLocalValue(new Date()));
    setNotas('');
    setFormAbierto(true);
  }

  async function handleAgregarInteraccion(e: FormEvent) {
    e.preventDefault();
    if (!postulacionId || !fechaHora) return;

    setGuardando(true);
    try {
      const nueva = await crearInteraccion({
        postulacion_id: postulacionId,
        tipo,
        fecha: new Date(fechaHora).toISOString(),
        notas: notas.trim() || null,
      });
      setInteracciones((prev) => [nueva, ...prev].sort((a, b) => b.fecha.localeCompare(a.fecha)));
      setFormAbierto(false);
      setError(null);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo guardar la interacción.'));
      setGuardando(false);
      return;
    }

    setGuardando(false);
    if (recordatorio) {
      try {
        await resolverRecordatoriosDePostulacion(postulacionId);
        setRecordatorio(null);
        onRecordatorioResuelto?.(postulacionId);
      } catch (err) {
        setError(
          `La interacción se guardó, pero no se pudo resolver el recordatorio: ${mensajeDeError(err, 'error desconocido')}`
        );
      }
    }
  }

  async function handleResolverRecordatorio() {
    if (!recordatorio || !postulacionId || resolviendo) return;

    setResolviendo(true);
    try {
      await resolverRecordatorio(recordatorio.id);
      setRecordatorio(null);
      onRecordatorioResuelto?.(postulacionId);
      setError(null);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo resolver el recordatorio.'));
    } finally {
      setResolviendo(false);
    }
  }

  async function handleEliminarInteraccion(interaccion: Interaccion) {
    if (!window.confirm('¿Eliminar esta interacción?')) return;

    try {
      await eliminarInteraccion(interaccion.id);
      setInteracciones((prev) => prev.filter((i) => i.id !== interaccion.id));
      setError(null);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo eliminar la interacción.'));
    }
  }

  if (!postulacionId) return null;

  const oferta = postulacion?.oferta;
  const score = oferta?.puntaje_scoring ?? null;

  return (
    <aside className="fixed right-0 top-14 md:top-0 bottom-0 w-130 max-w-full bg-surface-container-lowest border-l border-outline-variant shadow-[0_0_40px_rgba(0,0,0,0.1)] z-50 flex flex-col">
      <div className="px-6 py-6 border-b border-outline-variant flex items-start justify-between bg-surface-bright sticky top-0 z-10">
        <div className="min-w-0">
          <h2 className="text-2xl font-heading font-bold text-on-surface mb-1">{oferta?.rol ?? 'Cargando…'}</h2>
          {oferta && (
            <div className="flex items-center gap-2 text-on-surface-variant text-sm">
              <Building2 className="w-4.5 h-4.5" />
              <span>{oferta.empresa}</span>
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Cerrar ficha"
          className="w-11 h-11 md:w-8 md:h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-low transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 flex flex-col gap-8">
        {error && <div className="p-4 bg-error-container text-on-error-container rounded-lg text-sm">{error}</div>}

        {loading && <p className="text-sm text-on-surface-variant text-center py-8">Cargando ficha…</p>}

        {postulacion && oferta && (
          <>
            {recordatorio && !estadoEsFinal(postulacion.estado) && (
              <div className="flex items-center justify-between gap-3 p-4 bg-tertiary-container text-on-tertiary-container rounded-lg">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="w-4.5 h-4.5 shrink-0" />
                    Sin novedades hace {recordatorio.dias_inactividad} días
                  </div>
                  <p className="text-sm pl-6.5">Es solo un recordatorio: no se borró ni se cambió nada.</p>
                </div>
                <button
                  type="button"
                  onClick={handleResolverRecordatorio}
                  disabled={resolviendo}
                  className="shrink-0 min-h-11 px-2 text-sm font-semibold underline hover:no-underline cursor-pointer disabled:opacity-50"
                >
                  Marcar como resuelto
                </button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 p-4 bg-surface border border-outline-variant rounded-lg">
              <div>
                <div className="text-sm font-semibold text-on-surface-variant mb-1">
                  Puntaje
                </div>
                <div
                  className={cn(
                    'w-12 h-12 rounded-full border flex items-center justify-center text-xl font-semibold',
                    scoreBandClasses(score)
                  )}
                >
                  {score !== null ? Math.round(score) : '—'}
                </div>
              </div>
              <div>
                <div className="text-sm font-semibold text-on-surface-variant mb-1">
                  Fuente
                </div>
                <div className="flex items-center gap-2 text-sm text-on-surface h-12">
                  <Globe className="w-5 h-5 text-outline" />
                  {oferta.fuente ?? 'Sin fuente'}
                </div>
              </div>
              <div className="col-span-2 flex items-center gap-2 text-sm text-on-surface-variant">
                <CalendarDays className="w-4.5 h-4.5" />
                Fecha de postulación: {postulacion.fecha_postulacion ?? 'Sin registrar'}
              </div>
            </div>

            <div>
              <label htmlFor="ficha-estado" className="block text-sm font-semibold text-on-surface-variant mb-2">
                Estado de la postulación
              </label>
              <select
                id="ficha-estado"
                value={postulacion.estado}
                onChange={(e) => handleEstadoChange(e.target.value as EstadoPostulacion)}
                className="w-full appearance-none bg-surface-container-lowest border border-outline-variant text-on-surface text-base rounded-lg min-h-12 py-3 pl-4 pr-10 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary hover:border-outline transition-colors cursor-pointer shadow-sm"
              >
                {ESTADOS_POSTULACION.map(({ estado, label }) => (
                  <option key={estado} value={estado}>
                    {label}
                  </option>
                ))}
              </select>
              <p className={cn('mt-2 rounded-lg px-3 py-2 text-sm font-medium', ETAPA_CLASES[postulacion.estado].chip)}>
                {DESCRIPCION_ETAPA[postulacion.estado]}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-6 border-b border-outline-variant pb-2">
                <h3 className="text-xl font-heading font-semibold text-on-surface">Línea de tiempo de interacciones</h3>
              </div>

              {interacciones.length === 0 ? (
                <p className="text-sm text-on-surface-variant">Todavía no registraste interacciones.</p>
              ) : (
                <div className="ml-4.75 border-l border-outline-variant space-y-6 pb-4">
                  {interacciones.map((interaccion) => {
                    const { label, icon: Icon } = TIPO_INTERACCION[interaccion.tipo];
                    return (
                      <div key={interaccion.id} className="relative pl-6 group">
                        <div className="absolute -left-4.25 top-0 bg-surface-container-lowest border border-outline-variant rounded-full p-1 text-on-surface-variant shadow-sm">
                          <Icon className="w-4.5 h-4.5" />
                        </div>
                        <div className="text-[11px] font-semibold text-on-surface-variant mb-0.5">
                          {formatearFechaHora(interaccion.fecha)}
                        </div>
                        <div className="bg-surface border border-outline-variant rounded-lg p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="text-sm font-semibold text-on-surface">{label}</div>
                            <button
                              type="button"
                              onClick={() => handleEliminarInteraccion(interaccion)}
                              aria-label="Eliminar interacción"
                              className="p-2.5 md:p-1 -m-2.5 md:-m-1 text-outline hover:text-error opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          {interaccion.notas && (
                            <p className="text-sm text-on-surface-variant whitespace-pre-line">{interaccion.notas}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!formAbierto ? (
                <button
                  type="button"
                  onClick={abrirForm}
                  className="mt-6 w-full border border-outline-variant border-dashed rounded-lg bg-surface-container-lowest p-4 hover:bg-surface-container-low transition-colors cursor-pointer flex items-center justify-center gap-2 text-primary text-sm font-semibold"
                >
                  <PlusCircle className="w-5 h-5" />
                  Agregar interacción
                </button>
              ) : (
                <form
                  onSubmit={handleAgregarInteraccion}
                  className="mt-6 bg-surface border border-outline-variant rounded-lg p-4 shadow-sm"
                >
                  <h4 className="text-base font-semibold text-on-surface mb-4">Nueva interacción</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                    <label className="block text-[11px] font-semibold text-on-surface-variant">
                      Tipo
                      <select
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value as TipoInteraccion)}
                        className="mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-md py-1.5 px-2 text-sm font-normal text-on-surface focus:border-primary outline-none cursor-pointer"
                      >
                        {(Object.keys(TIPO_INTERACCION) as TipoInteraccion[]).map((t) => (
                          <option key={t} value={t}>
                            {TIPO_INTERACCION[t].label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-[11px] font-semibold text-on-surface-variant">
                      Fecha y hora
                      <input
                        type="datetime-local"
                        required
                        value={fechaHora}
                        onChange={(e) => setFechaHora(e.target.value)}
                        className="mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-md py-1.5 px-2 text-sm font-normal text-on-surface focus:border-primary outline-none"
                      />
                    </label>
                  </div>
                  <label className="block text-[11px] font-semibold text-on-surface-variant mb-4">
                    Notas
                    <textarea
                      value={notas}
                      onChange={(e) => setNotas(e.target.value)}
                      maxLength={500}
                      rows={2}
                      placeholder="Detalles de la interacción..."
                      className="mt-1 w-full bg-surface-container-lowest border border-outline-variant rounded-md py-2 px-3 text-sm font-normal text-on-surface focus:border-primary outline-none resize-none"
                    />
                  </label>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setFormAbierto(false)}
                      className="px-4 py-1.5 rounded-md text-on-surface-variant text-sm font-semibold min-h-11 hover:bg-surface-container-highest transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={guardando}
                      className="px-4 py-1.5 rounded-md bg-primary text-on-primary text-sm font-semibold min-h-11 hover:opacity-90 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                      {guardando ? 'Guardando…' : 'Guardar'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
