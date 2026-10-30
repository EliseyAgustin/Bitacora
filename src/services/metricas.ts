import { conContexto, mensajeDeError } from '@/lib/errores';
import type { DatosTendencias } from '@/lib/tendencias';
import { coincideFuente, FUENTES_OFERTA } from '@/lib/fuentes';
import { listarCriterios } from '@/services/criteriosScoring';
import { listarTodasLasInteracciones } from '@/services/interacciones';
import { listarOfertasParaMetricas } from '@/services/ofertas';
import { listarHistorialEstados, listarPostulaciones } from '@/services/postulaciones';
import { estadoEsFinal, listarTodosLosRecordatorios } from '@/services/recordatorios';
import type { CriterioScoring } from '@/types/criterioScoring';
import type { HistorialEstado } from '@/types/historialEstado';
import type { Interaccion, TipoInteraccion } from '@/types/interaccion';
import type { Oferta } from '@/types/oferta';
import type { EstadoPostulacion, Postulacion } from '@/types/postulacion';
import type { Recordatorio } from '@/types/recordatorio';

const DIA_MS = 24 * 60 * 60 * 1000;
const SEMANA_MS = 7 * DIA_MS;

export const SEMANAS_ACTIVIDAD = 8;
const FRANJA_ALTA = 0.75;
const FRANJA_MEDIA = 0.5;

type PostulacionMin = Pick<Postulacion, 'id' | 'estado' | 'fecha_postulacion'>;
type InteraccionMin = Pick<Interaccion, 'postulacion_id' | 'tipo' | 'fecha'>;

export interface DatosMetricas {
  ofertas: Pick<Oferta, 'created_at' | 'fuente' | 'puntaje_scoring'>[];
  postulaciones: PostulacionMin[];
  interacciones: InteraccionMin[];
  recordatorios: Pick<Recordatorio, 'postulacion_id' | 'estado'>[];
  historial: Pick<HistorialEstado, 'postulacion_id' | 'estado_nuevo'>[];
  criterios: Pick<CriterioScoring, 'peso' | 'activo'>[];
}

const ESTADOS: EstadoPostulacion[] = ['por_aplicar', 'aplicado', 'en_proceso', 'entrevista', 'oferta', 'rechazado'];

export function resumenPostulaciones(postulaciones: PostulacionMin[]) {
  const porEstado = Object.fromEntries(ESTADOS.map((e) => [e, 0])) as Record<EstadoPostulacion, number>;
  for (const p of postulaciones) porEstado[p.estado]++;

  return { activas: postulaciones.filter((p) => !estadoEsFinal(p.estado)).length, porEstado };
}

export function tasaDeRespuesta(postulaciones: PostulacionMin[]) {
  const aplicadas = postulaciones.filter((p) => p.estado !== 'por_aplicar').length;
  const respondidas = postulaciones.filter((p) =>
    ['en_proceso', 'entrevista', 'oferta', 'rechazado'].includes(p.estado)
  ).length;

  return { respondidas, aplicadas, tasa: aplicadas === 0 ? null : respondidas / aplicadas };
}

// Rechazado no es una etapa del camino: sin más información se asume que al menos salió de "por aplicar".
const RANGO_ETAPA: Record<EstadoPostulacion, number> = {
  por_aplicar: 0,
  aplicado: 1,
  en_proceso: 2,
  entrevista: 3,
  oferta: 4,
  rechazado: 1,
};

const ETAPAS_EMBUDO: EstadoPostulacion[] = ['por_aplicar', 'aplicado', 'en_proceso', 'entrevista', 'oferta'];

export function embudo(
  postulaciones: PostulacionMin[],
  historial: Pick<HistorialEstado, 'postulacion_id' | 'estado_nuevo'>[]
) {
  const mejorRango = new Map<string, number>();
  for (const p of postulaciones) mejorRango.set(p.id, RANGO_ETAPA[p.estado]);
  for (const h of historial) {
    const actual = mejorRango.get(h.postulacion_id);
    if (actual !== undefined) mejorRango.set(h.postulacion_id, Math.max(actual, RANGO_ETAPA[h.estado_nuevo]));
  }

  const rangos = [...mejorRango.values()];
  const etapas = ETAPAS_EMBUDO.map((estado, i) => ({
    estado,
    alcanzadas: rangos.filter((r) => r >= i).length,
    conversionDesdeAnterior: null as number | null,
  }));
  for (let i = 1; i < etapas.length; i++) {
    const anterior = etapas[i - 1].alcanzadas;
    etapas[i].conversionDesdeAnterior = anterior === 0 ? null : etapas[i].alcanzadas / anterior;
  }

  return { etapas, rechazadas: postulaciones.filter((p) => p.estado === 'rechazado').length };
}

export function ofertasCargadas(ofertas: Pick<Oferta, 'created_at'>[], ahora: Date) {
  const t = ahora.getTime();
  let ultimos7 = 0;
  let previos7 = 0;

  for (const o of ofertas) {
    const creada = new Date(o.created_at).getTime();
    if (creada > t - SEMANA_MS && creada <= t) ultimos7++;
    else if (creada > t - 2 * SEMANA_MS && creada <= t - SEMANA_MS) previos7++;
  }

  return { total: ofertas.length, ultimos7, previos7 };
}

// El score es la suma de pesos de criterios que matchean: su escala depende del usuario, por eso las franjas son relativas al máximo posible.
export function distribucionScore(
  ofertas: Pick<Oferta, 'puntaje_scoring'>[],
  criterios: Pick<CriterioScoring, 'peso' | 'activo'>[]
) {
  const maximo = criterios.filter((c) => c.activo).reduce((suma, c) => suma + Number(c.peso), 0);
  const conScore = ofertas
    .map((o) => o.puntaje_scoring)
    .filter((s): s is number => s !== null)
    .map(Number);

  const promedio = conScore.length === 0 ? null : conScore.reduce((a, b) => a + b, 0) / conScore.length;

  let bandas: { alto: number; medio: number; bajo: number; sinScore: number } | null = null;
  if (maximo > 0) {
    bandas = { alto: 0, medio: 0, bajo: 0, sinScore: ofertas.length - conScore.length };
    for (const score of conScore) {
      const relativo = score / maximo;
      if (relativo >= FRANJA_ALTA) bandas.alto++;
      else if (relativo >= FRANJA_MEDIA) bandas.medio++;
      else bandas.bajo++;
    }
  }

  return {
    maximo,
    promedio,
    promedioPct: promedio === null || maximo <= 0 ? null : promedio / maximo,
    bandas,
  };
}

export function ofertasPorFuente(ofertas: Pick<Oferta, 'fuente'>[]) {
  const porFuente = FUENTES_OFERTA.map((fuente) => ({
    fuente: fuente as string,
    cantidad: ofertas.filter((o) => coincideFuente(o.fuente, fuente)).length,
  }));
  const otras = ofertas.length - porFuente.reduce((suma, f) => suma + f.cantidad, 0);

  return otras > 0 ? [...porFuente, { fuente: 'Otras', cantidad: otras }] : porFuente;
}

export type SemanaActividad = { inicio: Date } & Record<TipoInteraccion, number>;

// Ventanas móviles de 7 días terminando en "ahora" (no semanas calendario), de la más vieja a la más nueva.
export function interaccionesPorSemana(
  interacciones: Pick<Interaccion, 'tipo' | 'fecha'>[],
  ahora: Date,
  semanas = SEMANAS_ACTIVIDAD
): SemanaActividad[] {
  const desde = ahora.getTime() - semanas * SEMANA_MS;
  const resultado: SemanaActividad[] = Array.from({ length: semanas }, (_, i) => ({
    inicio: new Date(desde + i * SEMANA_MS),
    mail: 0,
    llamada: 0,
    entrevista: 0,
    nota: 0,
  }));

  for (const i of interacciones) {
    const t = new Date(i.fecha).getTime();
    if (t < desde || t > ahora.getTime()) continue;
    resultado[Math.min(Math.floor((t - desde) / SEMANA_MS), semanas - 1)][i.tipo]++;
  }

  return resultado;
}

export function recordatoriosResumen(
  recordatorios: Pick<Recordatorio, 'postulacion_id' | 'estado'>[],
  postulaciones: PostulacionMin[]
) {
  const estadoPorId = new Map(postulaciones.map((p) => [p.id, p.estado]));
  const activos = recordatorios.filter((r) => {
    if (r.estado !== 'activo') return false;
    const estado = estadoPorId.get(r.postulacion_id);
    return estado === undefined || !estadoEsFinal(estado);
  }).length;

  return { activos, resueltos: recordatorios.filter((r) => r.estado === 'resuelto').length };
}

const numeroDeDiaLocal = (anio: number, mes0: number, dia: number) => Date.UTC(anio, mes0, dia) / DIA_MS;

export function diasAplicadoAPrimeraEntrevista(postulaciones: PostulacionMin[], interacciones: InteraccionMin[]) {
  const duraciones: number[] = [];

  for (const p of postulaciones) {
    if (!p.fecha_postulacion) continue;
    const [anio, mes, dia] = p.fecha_postulacion.split('-').map(Number);
    const diaPostulacion = numeroDeDiaLocal(anio, mes - 1, dia);

    const primeraEntrevista = interacciones
      .filter((i) => i.postulacion_id === p.id && i.tipo === 'entrevista')
      .map((i) => {
        const fecha = new Date(i.fecha);
        return numeroDeDiaLocal(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
      })
      .filter((dia) => dia >= diaPostulacion)
      .sort((a, b) => a - b)[0];

    if (primeraEntrevista !== undefined) duraciones.push(primeraEntrevista - diaPostulacion);
  }

  return {
    promedio: duraciones.length === 0 ? null : duraciones.reduce((a, b) => a + b, 0) / duraciones.length,
    n: duraciones.length,
  };
}

export function actividadReciente(postulaciones: PostulacionMin[], interacciones: InteraccionMin[], ahora: Date) {
  const t = ahora.getTime();
  const activas = postulaciones.filter((p) => !estadoEsFinal(p.estado));
  const conActividad = activas.filter((p) =>
    interacciones.some((i) => {
      const fecha = new Date(i.fecha).getTime();
      return i.postulacion_id === p.id && fecha >= t - SEMANA_MS && fecha <= t;
    })
  ).length;

  return {
    activas: activas.length,
    conActividad,
    porcentaje: activas.length === 0 ? null : conActividad / activas.length,
  };
}

export async function cargarDatosMetricas(): Promise<{ datos: DatosMetricas; tendencias: DatosTendencias; advertencias: string[] }> {
  const advertencias: string[] = [];

  // El historial solo refina el embudo: si no se puede leer, el panel sigue con el estado actual y avisa.
  const historial = conContexto('historial de estados', listarHistorialEstados()).catch((err) => {
    advertencias.push(`${mensajeDeError(err, 'no se pudo leer')}. El embudo usa solo el estado actual de cada postulación.`);
    return [] as HistorialEstado[];
  });

  const [ofertas, postulaciones, interacciones, recordatorios, criterios, historialEstados] = await Promise.all([
    conContexto('ofertas', listarOfertasParaMetricas()),
    conContexto('postulaciones', listarPostulaciones()),
    conContexto('interacciones', listarTodasLasInteracciones()),
    conContexto('recordatorios', listarTodosLosRecordatorios()),
    conContexto('criterios de scoring', listarCriterios()),
    historial,
  ]);

  return {
    datos: { ofertas, postulaciones, interacciones, recordatorios, historial: historialEstados, criterios },
    // Las mismas lecturas, con las fechas que necesita la comparación contra la semana anterior.
    tendencias: {
      postulaciones,
      historial: historialEstados,
      ofertas,
      interacciones,
      abiertas: postulaciones.filter((p) => !estadoEsFinal(p.estado)).map((p) => p.id),
    },
    advertencias,
  };
}

export function calcularMetricas(datos: DatosMetricas, ahora: Date) {
  return {
    postulaciones: resumenPostulaciones(datos.postulaciones),
    tasaRespuesta: tasaDeRespuesta(datos.postulaciones),
    embudo: embudo(datos.postulaciones, datos.historial),
    ofertas: ofertasCargadas(datos.ofertas, ahora),
    score: distribucionScore(datos.ofertas, datos.criterios),
    fuentes: ofertasPorFuente(datos.ofertas),
    semanas: interaccionesPorSemana(datos.interacciones, ahora),
    recordatorios: recordatoriosResumen(datos.recordatorios, datos.postulaciones),
    diasHastaEntrevista: diasAplicadoAPrimeraEntrevista(datos.postulaciones, datos.interacciones),
    actividad: actividadReciente(datos.postulaciones, datos.interacciones, ahora),
  };
}
