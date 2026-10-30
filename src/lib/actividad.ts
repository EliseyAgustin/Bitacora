// Aviso de actividad: mira el ritmo general de la búsqueda (no una postulación en particular, para eso están los recordatorios)
// y, si bajó, se lo cuenta a la persona con buen tono y la lleva a donde retomar. Todo se calcula en el navegador con datos
// que ya existen: postulaciones, interacciones y el historial de cambios de estado. No toca la base ni el motor de scoring.

const DIA_MS = 24 * 60 * 60 * 1000;

// Umbrales: constantes con nombre, fáciles de ajustar después de ver cómo se siente.
export const MOVIMIENTOS_MINIMOS = 3; // con menos movimientos en total, todavía no hay un ritmo que medir
export const DIAS_HISTORIAL_MINIMO = 7; // el primer movimiento tiene que tener al menos una semana
export const DIAS_SIN_ACTIVIDAD = 10; // sin ningún movimiento en este tiempo, se invita a retomar
export const MOVIMIENTOS_SEMANA_PREVIA = 4; // para decir que esta semana fue más tranquila, la anterior tiene que haber tenido al menos 4
export const CAIDA_DEL_RITMO = 0.5; // esta semana con la mitad o menos de la anterior es «más tranquila»

// «parecido» es todo lo que no merece un aviso: el ritmo es similar o mayor.
export type EstadoActividad = 'recien-empieza' | 'sin-actividad' | 'bajo-ritmo' | 'parecido';
export type EstadoAvisable = 'sin-actividad' | 'bajo-ritmo';

export interface ResultadoActividad {
  estado: EstadoActividad;
  // Movimientos de los últimos 7 días y de los 7 anteriores.
  esta: number;
  anterior: number;
  // Días desde el último movimiento (null si no hubo ninguno).
  diasSinActividad: number | null;
}

interface DatosDeMovimientos {
  postulaciones: { created_at: string }[];
  interacciones: { fecha: string }[];
  historial: { estado_anterior: string | null; es_estimado: boolean; fecha: string }[];
}

// Un «movimiento» es una postulación creada, una interacción registrada (mail, llamada, entrevista o nota) o un cambio de
// estado de verdad. Del historial no se cuenta la fila de la creación (ya cuenta la postulación) ni las reconstruidas.
export function movimientosDe({ postulaciones, interacciones, historial }: DatosDeMovimientos): Date[] {
  return [
    ...postulaciones.map((p) => new Date(p.created_at)),
    ...interacciones.map((i) => new Date(i.fecha)),
    ...historial.filter((h) => h.estado_anterior !== null && !h.es_estimado).map((h) => new Date(h.fecha)),
  ];
}

export function estadoDeActividad(movimientos: Date[], ahora: Date): ResultadoActividad {
  const t = ahora.getTime();
  const tiempos = movimientos.map((m) => m.getTime()).filter((x) => !Number.isNaN(x) && x <= t);

  const esta = tiempos.filter((x) => x > t - 7 * DIA_MS).length;
  const anterior = tiempos.filter((x) => x > t - 14 * DIA_MS && x <= t - 7 * DIA_MS).length;
  const ultimo = tiempos.length > 0 ? Math.max(...tiempos) : null;
  const primero = tiempos.length > 0 ? Math.min(...tiempos) : null;
  const diasSinActividad = ultimo === null ? null : Math.floor((t - ultimo) / DIA_MS);

  const resultado = (estado: EstadoActividad): ResultadoActividad => ({ estado, esta, anterior, diasSinActividad });

  if (tiempos.length < MOVIMIENTOS_MINIMOS || primero === null || t - primero < DIAS_HISTORIAL_MINIMO * DIA_MS) {
    return resultado('recien-empieza');
  }
  if (ultimo !== null && t - ultimo >= DIAS_SIN_ACTIVIDAD * DIA_MS) return resultado('sin-actividad');
  if (anterior >= MOVIMIENTOS_SEMANA_PREVIA && esta <= anterior * CAIDA_DEL_RITMO) return resultado('bajo-ritmo');
  return resultado('parecido');
}

export interface MensajeActividad {
  titulo: string;
  texto: string;
}

const movimientos = (n: number) => (n === 1 ? '1 movimiento' : `${n} movimientos`);

// Tono amable, sin reproche ni órdenes: dice qué pasó y deja la puerta abierta («cuando quieras»). Solo dos estados tienen aviso.
export function mensajeDeActividad(r: ResultadoActividad): MensajeActividad | null {
  switch (r.estado) {
    case 'bajo-ritmo':
      return {
        titulo: 'Esta semana fue más tranquila',
        texto:
          r.esta === 0
            ? `Esta semana no registraste movimientos; la anterior hiciste ${r.anterior}. Cuando quieras, una postulación nueva te ayuda a retomar el ritmo.`
            : `Hiciste ${movimientos(r.esta)} y la semana anterior ${r.anterior}. Cuando quieras, una postulación nueva te ayuda a retomar el ritmo.`,
      };
    case 'sin-actividad':
      return {
        titulo: '¿Retomamos?',
        texto: `Hace ${r.diasSinActividad} días que no registrás actividad. Cuando quieras, una postulación o una novedad alcanza para volver a arrancar.`,
      };
    default:
      return null;
  }
}

// ---- Cerrar el aviso: se recuerda en el navegador de cada persona, por estado ----

type Almacen = Pick<Storage, 'getItem' | 'setItem'>;

// Cerrado un aviso, no vuelve por tres días. La clave incluye el estado, así que pasar de uno a otro es un aviso nuevo.
export const OCULTAR_DIAS: Record<EstadoAvisable, number> = { 'bajo-ritmo': 3, 'sin-actividad': 3 };

const clave = (userId: string, estado: EstadoAvisable) => `laburin:aviso:${userId}:${estado}`;

// La clave incluye el estado: si pasa de «bajó el ritmo» a «sin actividad», es otro aviso y vuelve a aparecer.
export function avisoCerrado(userId: string, estado: EstadoAvisable, ahora: Date, almacen: Almacen | null): boolean {
  if (!almacen) return false;
  try {
    const hasta = Number(almacen.getItem(clave(userId, estado)));
    return Number.isFinite(hasta) && hasta > ahora.getTime();
  } catch {
    return false;
  }
}

export function cerrarAviso(userId: string, estado: EstadoAvisable, ahora: Date, almacen: Almacen | null): void {
  if (!almacen) return;
  try {
    almacen.setItem(clave(userId, estado), String(ahora.getTime() + OCULTAR_DIAS[estado] * DIA_MS));
  } catch {
    // sin almacenamiento, el aviso simplemente se vuelve a mostrar
  }
}

export function almacenLocal(): Almacen | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function esAvisable(estado: EstadoActividad): estado is EstadoAvisable {
  return estado === 'sin-actividad' || estado === 'bajo-ritmo';
}

// Qué aviso se le muestra a la persona: el del estado actual, con su mensaje, salvo que no merezca aviso o lo haya cerrado hace poco.
export function avisoVisible(
  resultado: ResultadoActividad | null,
  userId: string,
  ahora: Date,
  almacen: Almacen | null
): { estado: EstadoAvisable; mensaje: MensajeActividad } | null {
  if (!resultado || !esAvisable(resultado.estado)) return null;
  const mensaje = mensajeDeActividad(resultado);
  if (!mensaje || avisoCerrado(userId, resultado.estado, ahora, almacen)) return null;
  return { estado: resultado.estado, mensaje };
}
