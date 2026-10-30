import { useEffect, useState, type FormEvent } from 'react';
import { Timer, Terminal, Briefcase, MapPin, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { mensajeDeError } from '@/lib/errores';
import { normalizarTag } from '@/lib/tags';
import { cn } from '@/lib/utils';
import {
  actualizarCriterio,
  clampPeso,
  construirCriterio,
  crearCriterio,
  eliminarCriterio,
  listarCriterios,
  MODALIDAD_LABEL,
  PESO_DEFECTO,
  PESO_MAXIMO,
  PESO_MINIMO,
} from '@/services/criteriosScoring';
import {
  DIAS_INACTIVIDAD_DEFECTO,
  DIAS_INACTIVIDAD_MAX,
  DIAS_INACTIVIDAD_MIN,
  guardarDiasInactividad,
  obtenerMisDiasInactividad,
  validarDiasInactividad,
} from '@/services/recordatorios';
import type { CriterioScoring } from '@/types/criterioScoring';
import type { Modalidad } from '@/types/oferta';

const MODALIDADES: { value: Modalidad; label: string }[] = [
  { value: 'remoto', label: 'Remoto' },
  { value: 'hibrido', label: 'Híbrido' },
  { value: 'presencial', label: 'Presencial' },
];

function ToggleActivo({
  activo,
  nombre,
  onClick,
  disabled,
}: {
  activo: boolean;
  nombre: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const Icon = activo ? ToggleRight : ToggleLeft;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${activo ? 'Desactivar' : 'Activar'} criterio ${nombre}`}
      title={activo ? 'Activo' : 'Inactivo'}
      className={cn(
        'w-11 h-11 -m-1.5 flex items-center justify-center rounded-md transition-colors disabled:opacity-50 cursor-pointer',
        activo ? 'text-primary' : 'text-on-surface-variant'
      )}
    >
      <Icon className="w-7 h-7" />
    </button>
  );
}

function etiquetaCriterio(c: CriterioScoring): string {
  if (c.campo_objetivo === 'modalidad') return MODALIDAD_LABEL[c.valor_comparacion as Modalidad] ?? c.valor_comparacion ?? c.nombre;
  return c.valor_comparacion ?? c.nombre;
}

export function Settings() {
  const [criterios, setCriterios] = useState<CriterioScoring[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  // Texto crudo que el usuario está escribiendo en el peso de un criterio existente, por id.
  // Separado de criterios[].peso para poder dejar el campo momentáneamente vacío mientras edita
  // (Number('') es 0, no NaN: si escribiéramos directo sobre el criterio, el input controlado
  // se repintaba a "0" antes de que el usuario terminara de borrar).
  const [pesoDrafts, setPesoDrafts] = useState<Record<string, string>>({});

  const [stackDraft, setStackDraft] = useState('');
  const [stackPesoDraft, setStackPesoDraft] = useState(String(PESO_DEFECTO.stack));
  const [modalidadDraft, setModalidadDraft] = useState<Modalidad | ''>('');
  const [modalidadPesoDraft, setModalidadPesoDraft] = useState(String(PESO_DEFECTO.modalidad));
  const [ubicacionDraft, setUbicacionDraft] = useState('');
  const [ubicacionPesoDraft, setUbicacionPesoDraft] = useState(String(PESO_DEFECTO.ubicacion));
  const [agregando, setAgregando] = useState(false);

  // Mismo patrón que pesoDrafts: texto crudo mientras se escribe, se valida y guarda al salir del campo.
  const [diasGuardados, setDiasGuardados] = useState(DIAS_INACTIVIDAD_DEFECTO);
  const [diasDraft, setDiasDraft] = useState<string | null>(null);
  const [diasError, setDiasError] = useState<string | null>(null);
  const [guardandoDias, setGuardandoDias] = useState(false);

  useEffect(() => {
    refetch();
  }, []);

  async function refetch() {
    setLoading(true);
    try {
      const [data, dias] = await Promise.all([listarCriterios(), obtenerMisDiasInactividad()]);
      setCriterios(data);
      setDiasGuardados(dias);
      setLoadError(null);
    } catch (err) {
      setLoadError(mensajeDeError(err, 'No se pudieron cargar los criterios.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleDiasBlur() {
    if (diasDraft === null) return;
    const resultado = validarDiasInactividad(diasDraft);
    setDiasDraft(null);

    if (resultado.ok === false) {
      setDiasError(resultado.error);
      return;
    }
    setDiasError(null);
    if (resultado.valor === diasGuardados) return;

    setGuardandoDias(true);
    try {
      setDiasGuardados(await guardarDiasInactividad(resultado.valor));
      setActionError(null);
    } catch (err) {
      setActionError(mensajeDeError(err, 'No se pudo guardar el umbral de inactividad.'));
    } finally {
      setGuardandoDias(false);
    }
  }

  function marcarGuardando(id: string, guardando: boolean) {
    setSavingIds((prev) => {
      const next = new Set(prev);
      if (guardando) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function valorPesoMostrado(criterio: CriterioScoring): string {
    return pesoDrafts[criterio.id] ?? String(criterio.peso);
  }

  function handlePesoChange(id: string, valor: string) {
    setPesoDrafts((prev) => ({ ...prev, [id]: valor }));
  }

  async function handlePesoBlur(criterio: CriterioScoring) {
    const draft = pesoDrafts[criterio.id];
    setPesoDrafts((prev) => {
      const { [criterio.id]: _quitado, ...resto } = prev;
      return resto;
    });
    if (draft === undefined) return;

    const peso = clampPeso(Number(draft));
    if (peso === criterio.peso) return;

    marcarGuardando(criterio.id, true);
    try {
      const actualizado = await actualizarCriterio(criterio.id, { peso });
      setCriterios((prev) => prev.map((c) => (c.id === actualizado.id ? actualizado : c)));
      setActionError(null);
    } catch (err) {
      setActionError(mensajeDeError(err, 'No se pudo actualizar el peso.'));
      await refetch();
    } finally {
      marcarGuardando(criterio.id, false);
    }
  }

  async function handleToggleActivo(criterio: CriterioScoring) {
    marcarGuardando(criterio.id, true);
    try {
      const actualizado = await actualizarCriterio(criterio.id, { activo: !criterio.activo });
      setCriterios((prev) => prev.map((c) => (c.id === actualizado.id ? actualizado : c)));
      setActionError(null);
    } catch (err) {
      setActionError(mensajeDeError(err, 'No se pudo actualizar el criterio.'));
    } finally {
      marcarGuardando(criterio.id, false);
    }
  }

  async function handleDelete(criterio: CriterioScoring) {
    if (!window.confirm(`¿Eliminar el criterio "${criterio.nombre}"?`)) return;

    marcarGuardando(criterio.id, true);
    try {
      await eliminarCriterio(criterio.id);
      setCriterios((prev) => prev.filter((c) => c.id !== criterio.id));
      setActionError(null);
    } catch (err) {
      setActionError(mensajeDeError(err, 'No se pudo eliminar el criterio.'));
      marcarGuardando(criterio.id, false);
    }
  }

  async function handleAddStack(e: FormEvent) {
    e.preventDefault();
    if (agregando) return;
    const valor = normalizarTag(stackDraft);
    const peso = Number(stackPesoDraft);
    if (!valor || Number.isNaN(peso)) return;
    if (criterios.some((c) => c.campo_objetivo === 'stack_tecnologico' && c.valor_comparacion?.toLowerCase() === valor.toLowerCase())) {
      setActionError(`Ya tenés un criterio para "${valor}".`);
      return;
    }

    setAgregando(true);
    try {
      const nuevo = await crearCriterio(construirCriterio('stack', valor, clampPeso(peso)));
      setCriterios((prev) => [...prev, nuevo]);
      setStackDraft('');
      setStackPesoDraft(String(PESO_DEFECTO.stack));
      setActionError(null);
    } catch (err) {
      setActionError(mensajeDeError(err, 'No se pudo crear el criterio.'));
    } finally {
      setAgregando(false);
    }
  }

  async function handleAddModalidad(e: FormEvent) {
    e.preventDefault();
    if (agregando) return;
    const peso = Number(modalidadPesoDraft);
    if (!modalidadDraft || Number.isNaN(peso)) return;

    setAgregando(true);
    try {
      const nuevo = await crearCriterio(construirCriterio('modalidad', modalidadDraft, clampPeso(peso)));
      setCriterios((prev) => [...prev, nuevo]);
      setModalidadDraft('');
      setModalidadPesoDraft(String(PESO_DEFECTO.modalidad));
      setActionError(null);
    } catch (err) {
      setActionError(mensajeDeError(err, 'No se pudo crear el criterio.'));
    } finally {
      setAgregando(false);
    }
  }

  async function handleAddUbicacion(e: FormEvent) {
    e.preventDefault();
    if (agregando) return;
    const valor = ubicacionDraft.trim();
    const peso = Number(ubicacionPesoDraft);
    if (!valor || Number.isNaN(peso)) return;

    setAgregando(true);
    try {
      const nuevo = await crearCriterio(construirCriterio('ubicacion', valor, clampPeso(peso)));
      setCriterios((prev) => [...prev, nuevo]);
      setUbicacionDraft('');
      setUbicacionPesoDraft(String(PESO_DEFECTO.ubicacion));
      setActionError(null);
    } catch (err) {
      setActionError(mensajeDeError(err, 'No se pudo crear el criterio.'));
    } finally {
      setAgregando(false);
    }
  }

  const stackCriterios = criterios.filter((c) => c.campo_objetivo === 'stack_tecnologico');
  const modalidadCriterios = criterios.filter((c) => c.campo_objetivo === 'modalidad');
  const ubicacionCriterios = criterios.filter((c) => c.campo_objetivo === 'ubicacion');
  const modalidadesDisponibles = MODALIDADES.filter(
    (m) => !modalidadCriterios.some((c) => c.valor_comparacion === m.value)
  );

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-margin min-h-full">
        <div className="max-w-7xl mx-auto text-center text-on-surface-variant text-sm py-16">
          Cargando criterios de scoring…
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-margin min-h-full">
      <div className="max-w-7xl mx-auto flex flex-col gap-6 pb-6">
        {/* Page Header */}
        <PageHeader
          title="Mi perfil de búsqueda"
          help="Contanos qué buscás. Con estos datos calculamos el puntaje de cada oferta. Los cambios se guardan solos."
        />

        {loadError && (
          <div className="p-4 bg-error-container text-on-error-container rounded-lg text-sm">{loadError}</div>
        )}
        {actionError && (
          <div className="p-4 bg-error-container text-on-error-container rounded-lg text-sm">{actionError}</div>
        )}

        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-2xl font-heading font-bold text-on-surface">¿Qué estoy buscando?</h2>
            <p className="text-base text-on-surface-variant mt-0.5">Elegí cómo y dónde querés trabajar. Las ofertas que coinciden suman puntos.</p>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* MODALIDAD */}
              <section className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm">
                <div className="p-4 border-b border-outline-variant bg-surface rounded-t-xl flex items-center gap-2">
                  <Briefcase className="w-6 h-6 text-tertiary" />
                  <h3 className="text-xl font-heading font-semibold text-on-surface">Modalidad</h3>
                </div>
                <div className="p-4 flex flex-col gap-2">
                  {modalidadCriterios.length === 0 && (
                    <p className="text-sm text-on-surface-variant text-center py-2">
                      Todavía no elegiste ninguna modalidad.
                    </p>
                  )}

                  {modalidadCriterios.map((c) => (
                    <div
                      key={c.id}
                      className={cn(
                        'flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg hover:bg-surface-container-low transition-colors group',
                        !c.activo && 'opacity-50'
                      )}
                    >
                      <div className="flex items-center gap-2 text-base font-semibold text-on-surface">
                        {MODALIDAD_LABEL[c.valor_comparacion as Modalidad] ?? c.valor_comparacion}
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-1 bg-surface border border-outline-variant rounded-md px-2.5 min-h-11 focus-within:border-primary">
                          <input
                            type="number"
                            min={PESO_MINIMO}
                            max={PESO_MAXIMO}
                            aria-label={`Peso de ${etiquetaCriterio(c)}`}
                        value={valorPesoMostrado(c)}
                            disabled={savingIds.has(c.id)}
                            onChange={(e) => handlePesoChange(c.id, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onBlur={() => handlePesoBlur(c)}
                            className="w-12 text-center text-base font-semibold text-primary bg-transparent border-none p-0 outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-on-surface-variant text-sm">puntos</span>
                        </div>
                        <ToggleActivo
                          activo={c.activo}
                          nombre={etiquetaCriterio(c)}
                          disabled={savingIds.has(c.id)}
                          onClick={() => handleToggleActivo(c)}
                        />
                        <button
                          type="button"
                          disabled={savingIds.has(c.id)}
                          onClick={() => handleDelete(c)}
                        aria-label={`Eliminar criterio ${etiquetaCriterio(c)}`}
                          className="text-error hover:bg-error-container w-11 h-11 -m-1.5 flex items-center justify-center rounded-md transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {modalidadesDisponibles.length > 0 && (
                    <form onSubmit={handleAddModalidad} className="flex items-center gap-2 pt-2 border-t border-outline-variant mt-1">
                      <select
                        value={modalidadDraft}
                        aria-label="Modalidad del nuevo criterio"
                        onChange={(e) => setModalidadDraft(e.target.value as Modalidad | '')}
                        className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg px-3 min-h-11 text-base focus:border-primary focus:outline-none cursor-pointer"
                      >
                        <option value="">Elegir modalidad…</option>
                        {modalidadesDisponibles.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={PESO_MINIMO}
                        max={PESO_MAXIMO}
                        value={modalidadPesoDraft}
                        aria-label="Peso de la nueva modalidad"
                        onChange={(e) => setModalidadPesoDraft(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        placeholder="Puntos"
                        className="w-16 bg-surface-container-lowest border border-outline-variant rounded-lg px-3 min-h-11 text-base focus:border-primary focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="submit"
                        aria-label="Agregar modalidad"
                        disabled={agregando}
                        className="bg-surface-container-low text-primary border border-outline-variant rounded-lg px-2 py-2 hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </form>
                  )}
                </div>
              </section>
              {/* UBICACIÓN */}
              <section className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm flex-1 flex flex-col">
                <div className="p-4 border-b border-outline-variant bg-surface rounded-t-xl flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-secondary" />
                  <h3 className="text-xl font-heading font-semibold text-on-surface">Ubicación</h3>
                </div>
                <div className="p-4 flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-2">
                  <p className="text-sm text-on-surface-variant">
                  Ojo: con ofertas remotas la ubicación casi nunca suma puntos, porque muchas dicen «Worldwide» o solo un país.
                </p>
                {ubicacionCriterios.length === 0 && (
                    <p className="text-sm text-on-surface-variant text-center py-2">
                      Todavía no agregaste ninguna ubicación.
                    </p>
                  )}

                  {ubicacionCriterios.map((c) => (
                    <div
                      key={c.id}
                      className={cn(
                        'flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg border border-outline-variant bg-surface-bright group',
                        !c.activo && 'opacity-50'
                      )}
                    >
                      <span className="text-base font-semibold text-on-surface">{c.valor_comparacion}</span>
                      <div className="flex items-center gap-1">
                        <div className="flex items-center gap-1 bg-surface border border-outline-variant rounded-md px-2.5 min-h-11">
                          <span className="text-outline text-sm">+</span>
                          <input
                            type="number"
                            min={PESO_MINIMO}
                            max={PESO_MAXIMO}
                            aria-label={`Peso de ${etiquetaCriterio(c)}`}
                        value={valorPesoMostrado(c)}
                            disabled={savingIds.has(c.id)}
                            onChange={(e) => handlePesoChange(c.id, e.target.value)}
                            onFocus={(e) => e.target.select()}
                            onBlur={() => handlePesoBlur(c)}
                            className="w-12 text-center text-base font-semibold text-on-secondary-container bg-transparent border-none p-0 outline-none focus:ring-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-on-surface-variant text-sm">puntos</span>
                        </div>
                        <ToggleActivo
                          activo={c.activo}
                          nombre={etiquetaCriterio(c)}
                          disabled={savingIds.has(c.id)}
                          onClick={() => handleToggleActivo(c)}
                        />
                        <button
                          type="button"
                          disabled={savingIds.has(c.id)}
                          onClick={() => handleDelete(c)}
                        aria-label={`Eliminar criterio ${etiquetaCriterio(c)}`}
                          className="text-error hover:bg-error-container w-11 h-11 -m-1.5 flex items-center justify-center rounded-md transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handleAddUbicacion} className="p-2 border-t border-outline-variant bg-surface rounded-b-xl flex gap-2">
                  <input
                    type="text"
                    maxLength={100}
                    value={ubicacionDraft}
                    onChange={(e) => setUbicacionDraft(e.target.value)}
                    aria-label="Nueva ubicación"
                    placeholder="Ej: Buenos Aires, Argentina"
                    className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg px-3 min-h-11 text-base focus:border-primary focus:outline-none"
                  />
                  <input
                    type="number"
                    min={PESO_MINIMO}
                    max={PESO_MAXIMO}
                    value={ubicacionPesoDraft}
                    aria-label="Peso de la nueva ubicación"
                    onChange={(e) => setUbicacionPesoDraft(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    placeholder="Puntos"
                    className="w-16 bg-surface-container-lowest border border-outline-variant rounded-lg px-3 min-h-11 text-base focus:border-primary focus:outline-none text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="submit"
                    aria-label="Agregar ubicación"
                    disabled={agregando}
                    className="bg-surface-container-low text-primary border border-outline-variant rounded-lg px-2 py-2 hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </form>
              </section>
          </div>
        </section>
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-2xl font-heading font-bold text-on-surface">Mis tecnologías y cuánto pesan</h2>
            <p className="text-base text-on-surface-variant mt-0.5">Las tecnologías que te interesan. Cuanto más peso tiene una, más arriba aparecen las ofertas que la mencionan.</p>
          </div>
          {/* STACK: Keywords & Weights */}
          <section className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm flex flex-col h-125">
            <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface rounded-t-xl">
              <div className="flex items-center gap-2">
                <Terminal className="w-6 h-6 text-primary" />
                <h3 className="text-xl font-heading font-semibold text-on-surface">Tecnologías</h3>
              </div>
              <span className="bg-primary-container text-on-primary-container text-sm font-semibold px-3 py-1 rounded-full">
                Más peso, más puntos
              </span>
            </div>

            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar flex flex-col gap-2">
              <div className="grid grid-cols-12 gap-2 px-4 pb-2 border-b border-outline-variant text-sm font-medium text-on-surface-variant">
                <div className="col-span-6">Tecnología</div>
                <div className="col-span-3 text-center">Peso (puntos)</div>
                <div className="col-span-1 text-center">Activo</div>
                <div className="col-span-2"></div>
              </div>

              {stackCriterios.length === 0 && (
                <p className="text-sm text-on-surface-variant text-center py-6">
                  Todavía no agregaste tecnologías. Escribí una abajo y apretá «+» para sumarla.
                </p>
              )}

              {stackCriterios.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    'grid grid-cols-12 gap-2 items-center p-4 rounded-lg hover:bg-surface-container-low transition-colors group',
                    !c.activo && 'opacity-50'
                  )}
                >
                  <div className="col-span-6">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container border border-outline-variant rounded-md text-base font-semibold text-on-surface">
                      {c.valor_comparacion}
                    </div>
                  </div>
                  <div className="col-span-3 flex justify-center">
                    <input
                      type="number"
                      min={PESO_MINIMO}
                      max={PESO_MAXIMO}
                      aria-label={`Peso de ${etiquetaCriterio(c)}`}
                      value={valorPesoMostrado(c)}
                      disabled={savingIds.has(c.id)}
                      onChange={(e) => handlePesoChange(c.id, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onBlur={() => handlePesoBlur(c)}
                      className="w-16 text-center text-base font-semibold text-on-surface bg-transparent border-b border-outline-variant focus:border-primary focus:outline-none pb-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <ToggleActivo
                      activo={c.activo}
                      nombre={etiquetaCriterio(c)}
                      disabled={savingIds.has(c.id)}
                      onClick={() => handleToggleActivo(c)}
                    />
                  </div>
                  <div className="col-span-2 flex justify-end">
                    <button
                      type="button"
                      disabled={savingIds.has(c.id)}
                      onClick={() => handleDelete(c)}
                      aria-label={`Eliminar criterio ${etiquetaCriterio(c)}`}
                      className="text-error hover:bg-error-container w-11 h-11 -m-1.5 flex items-center justify-center rounded-md transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New */}
            <form onSubmit={handleAddStack} className="p-4 border-t border-outline-variant bg-surface-bright rounded-b-xl">
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  maxLength={50}
                  value={stackDraft}
                  onChange={(e) => setStackDraft(e.target.value)}
                  aria-label="Nueva tecnología"
                  placeholder="Ej: React, Python, SQL"
                  className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-lg px-4 min-h-11 text-base focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                />
                <input
                  type="number"
                  min={PESO_MINIMO}
                  max={PESO_MAXIMO}
                  value={stackPesoDraft}
                  aria-label="Peso de la nueva tecnología"
                  onChange={(e) => setStackPesoDraft(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  placeholder="Peso"
                  className="w-24 bg-surface-container-lowest border border-outline-variant rounded-lg px-4 min-h-11 text-base focus:border-primary focus:ring-1 focus:ring-primary outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="submit"
                  aria-label="Agregar tecnología"
                  disabled={agregando}
                  className="bg-surface-container-low text-primary border border-outline-variant hover:border-primary hover:bg-surface-container transition-colors rounded-lg p-2 flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </form>
          </section>
        </section>
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="text-2xl font-heading font-bold text-on-surface">Avisos de seguimiento</h2>
            <p className="text-base text-on-surface-variant mt-0.5">Cuándo querés que te recordemos una postulación sin novedades.</p>
          </div>
        {/* Global Settings Section */}
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-surface-container rounded-lg flex items-center justify-center">
              <Timer className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-heading font-semibold text-on-surface">Recordatorio por falta de novedades</h3>
              <p className="text-sm text-on-surface-variant">
                Avisarme cuando una postulación lleve esta cantidad de días sin novedades.
              </p>
              <p className="text-sm text-on-surface-variant">
                Solo te mostramos un recordatorio en Mis postulaciones; no se borra nada.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={DIAS_INACTIVIDAD_MIN}
              max={DIAS_INACTIVIDAD_MAX}
              aria-label="Umbral de inactividad en días"
              aria-invalid={diasError !== null}
              value={diasDraft ?? String(diasGuardados)}
              disabled={guardandoDias}
              onChange={(e) => setDiasDraft(e.target.value)}
              onBlur={handleDiasBlur}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              className="w-20 text-center text-xl font-semibold text-on-surface bg-surface border border-outline-variant rounded-lg px-2 py-2 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-sm font-medium text-on-surface-variant">días</span>
          </div>
          {diasError && (
            <p role="alert" className="basis-full text-sm text-error">
              {diasError}
            </p>
          )}
        </div>

        </section>
      </div>
    </div>
  );
}
