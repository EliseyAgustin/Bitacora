// Tendencia de Mi progreso: cada tarjeta compara los últimos 7 días con los 7 anteriores. Las fórmulas de las tarjetas no cambian:
// esto solo agrega la comparación, calculada con las mismas fechas que ya se leen.
const SEMANA_MS = 7 * 24 * 60 * 60 * 1000;

export interface Tendencia {
  delta: number;
  sentido: 'sube' | 'baja' | 'igual';
}

// Cuántos hubo en los últimos 7 días y en los 7 anteriores. Lo futuro y lo más viejo no cuentan.
export function contarPorSemana(fechas: Date[], ahora: Date): { esta: number; anterior: number } {
  const t = ahora.getTime();
  let esta = 0;
  let anterior = 0;
  for (const f of fechas) {
    const x = f.getTime();
    if (Number.isNaN(x) || x > t) continue;
    if (x > t - SEMANA_MS) esta++;
    else if (x > t - 2 * SEMANA_MS) anterior++;
  }
  return { esta, anterior };
}

// Promedio de esta semana contra el de todo lo anterior (hay pocas ofertas por semana: comparar contra todo da un dato más estable).
export function promedioPorSemana(
  datos: { fecha: Date; valor: number | null }[],
  ahora: Date
): { esta: number | null; anterior: number | null } {
  const t = ahora.getTime();
  const esta: number[] = [];
  const anterior: number[] = [];
  for (const { fecha, valor } of datos) {
    const x = fecha.getTime();
    if (valor === null || Number.isNaN(x) || x > t) continue;
    (x > t - SEMANA_MS ? esta : anterior).push(valor);
  }
  const promedio = (v: number[]) => (v.length === 0 ? null : v.reduce((a, b) => a + b, 0) / v.length);
  return { esta: promedio(esta), anterior: promedio(anterior) };
}

// Sin datos de un lado, o sin nada en ninguna semana, no hay tendencia que mostrar (se omite, no se inventa un «0»).
export function tendenciaDe(esta: number | null, anterior: number | null): Tendencia | null {
  if (esta === null || anterior === null) return null;
  if (esta === 0 && anterior === 0) return null;
  const delta = esta - anterior;
  return { delta, sentido: delta > 0 ? 'sube' : delta < 0 ? 'baja' : 'igual' };
}

export function textoDeTendencia({ delta, sentido }: Tendencia): string {
  if (sentido === 'igual') return 'Igual que la semana anterior';
  const numero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(Math.abs(delta));
  return `${sentido === 'sube' ? '+' : '−'}${numero} vs. la semana anterior`;
}

const ESTADOS_DE_RESPUESTA = ['en_proceso', 'entrevista', 'oferta', 'rechazado'];

export interface DatosTendencias {
  postulaciones: { id: string; created_at: string }[];
  historial: { estado_anterior: string | null; estado_nuevo: string; es_estimado: boolean; fecha: string }[];
  ofertas: { created_at: string; puntaje_scoring: number | null }[];
  interacciones: { postulacion_id: string; fecha: string }[];
  // Ids de las postulaciones abiertas (las mismas que cuenta «con movimiento»).
  abiertas: string[];
}

export function calcularTendencias(datos: DatosTendencias, ahora: Date) {
  // En curso: postulaciones nuevas. Respuestas: cambios de estado reales hacia una etapa de respuesta
  // (no cuentan la fila de creación ni las reconstruidas, que no tienen fecha de verdad).
  const nuevas = contarPorSemana(datos.postulaciones.map((p) => new Date(p.created_at)), ahora);
  const respuestas = contarPorSemana(
    datos.historial
      .filter((h) => h.estado_anterior !== null && !h.es_estimado && ESTADOS_DE_RESPUESTA.includes(h.estado_nuevo))
      .map((h) => new Date(h.fecha)),
    ahora
  );
  const encaje = promedioPorSemana(
    datos.ofertas.map((o) => ({ fecha: new Date(o.created_at), valor: o.puntaje_scoring })),
    ahora
  );

  // Con movimiento: cuántas de las postulaciones abiertas tuvieron una interacción en cada ventana.
  const abiertas = new Set(datos.abiertas);
  const t = ahora.getTime();
  const conInteraccion = (desde: number, hasta: number) =>
    new Set(
      datos.interacciones
        .filter((i) => abiertas.has(i.postulacion_id) && new Date(i.fecha).getTime() > desde && new Date(i.fecha).getTime() <= hasta)
        .map((i) => i.postulacion_id)
    ).size;
  const movEsta = conInteraccion(t - SEMANA_MS, t);
  const movAnterior = conInteraccion(t - 2 * SEMANA_MS, t - SEMANA_MS);

  return {
    enCurso: tendenciaDe(nuevas.esta, nuevas.anterior),
    respuestas: tendenciaDe(respuestas.esta, respuestas.anterior),
    encaje: tendenciaDe(encaje.esta, encaje.anterior),
    movimiento: tendenciaDe(movEsta, movAnterior),
  };
}
