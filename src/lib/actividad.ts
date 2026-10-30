// Aviso de actividad: mira el ritmo general de la búsqueda (no una postulación en particular, para eso están los recordatorios)
// y, si bajó, se lo cuenta a la persona con buen tono y la lleva a donde retomar. Todo se calcula en el navegador con datos
// que ya existen: postulaciones, interacciones y el historial de cambios de estado. No toca la base ni el motor de scoring.

const DIA_MS = 24 * 60 * 60 * 1000;

// Umbrales: constantes con nombre, fáciles de ajustar después de ver cómo se siente.
export const MOVIMIENTOS_MINIMOS = 3; // con menos movimientos en total, todavía no hay un ritmo que medir
export const DIAS_HISTORIAL_MINIMO = 7; // el primer movimiento tiene que tener al menos una semana
export const DIAS_SIN_ACTIVIDAD = 10; // sin ningún movimiento en este tiempo, se invita a retomar
export const CAIDA_DEL_RITMO = 0.5; // esta semana con la mitad o menos de la anterior es «bajó el ritmo»

export type EstadoActividad = 'recien-empieza' | 'sin-actividad' | 'bajo-ritmo' | 'vas-bien' | 'parecido';
export type EstadoAvisable = 'sin-actividad' | 'bajo-ritmo' | 'vas-bien';

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
  if (anterior >= MOVIMIENTOS_MINIMOS && esta <= anterior * CAIDA_DEL_RITMO) return resultado('bajo-ritmo');
  if (esta >= anterior && esta >= MOVIMIENTOS_MINIMOS) return resultado('vas-bien');
  return resultado('parecido');
}

export interface MensajeActividad {
  titulo: string;
  texto: string;
}

const movimientos = (n: number) => (n === 1 ? '1 movimiento' : `${n} movimientos`);

// Tono cálido y motivador, sin culpar. Solo tres estados tienen aviso: los otros dos no muestran nada.
export function mensajeDeActividad(r: ResultadoActividad): MensajeActividad | null {
  switch (r.estado) {
    case 'bajo-ritmo':
      return {
        titulo: 'Bajó tu ritmo',
        texto:
          r.esta === 0
            ? `Esta semana no registraste movimientos y la anterior hiciste ${r.anterior}. Con una postulación más, volvés a tu ritmo.`
            : `Esta semana hiciste ${movimientos(r.esta)} y la anterior ${r.anterior}. Con una postulación más, volvés a tu ritmo.`,
      };
    case 'sin-actividad':
      return {
        titulo: '¿Retomamos?',
        texto: `Hace ${r.diasSinActividad} días que no registrás actividad. Una postulación o una novedad alcanza para volver a arrancar.`,
      };
    case 'vas-bien':
      return {
        titulo: 'Vas muy bien',
        texto: `${movimientos(r.esta)} esta semana, y la anterior ${r.anterior}. ¡Seguí así!`,
      };
    default:
      return null;
  }
}

// ---- Cerrar el aviso: se recuerda en el navegador de cada persona, por estado ----

type Almacen = Pick<Storage, 'getItem' | 'setItem'>;

// «Bajó el ritmo» y «sin actividad» insisten un poco más que «vas muy bien», que es solo una felicitación.
export const OCULTAR_DIAS: Record<EstadoAvisable, number> = { 'bajo-ritmo': 3, 'sin-actividad': 3, 'vas-bien': 7 };

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
  return estado === 'sin-actividad' || estado === 'bajo-ritmo' || estado === 'vas-bien';
}

// «Vas muy bien» es solo una felicitación: aparece una vez por semana. En la sesión en que apareció se queda a la vista; en las
// siguientes, no, hasta que pase una semana. Si la persona la cerró a mano, tampoco vuelve en ese tiempo.
export function debeFelicitar(userId: string, ahora: Date, local: Almacen | null, sesion: Almacen | null): boolean {
  if (avisoCerrado(userId, 'vas-bien', ahora, local)) return false;

  const claveVista = `laburin:felicitacion-vista:${userId}`;
  const claveSesion = `laburin:felicitacion-sesion:${userId}`;
  try {
    if (sesion?.getItem(claveSesion)) return true; // ya se mostró en esta sesión: sigue a la vista

    const vista = Number(local?.getItem(claveVista));
    const pasoUnaSemana = !Number.isFinite(vista) || vista <= 0 || ahora.getTime() - vista >= OCULTAR_DIAS['vas-bien'] * DIA_MS;
    if (!pasoUnaSemana) return false;

    local?.setItem(claveVista, String(ahora.getTime()));
    sesion?.setItem(claveSesion, '1');
  } catch {
    // sin almacenamiento no se puede recordar: se muestra
  }
  return true;
}
