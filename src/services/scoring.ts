import { leerEnLotes } from '@/lib/lotes';
import { supabase } from '@/lib/supabase';
import type { CriterioScoring } from '@/types/criterioScoring';
import type { OfertaInput } from '@/types/oferta';

type OfertaParaScoring = Partial<OfertaInput> & Record<string, unknown>;

function matchContiene(valorCampo: unknown, valorComparacion: string): boolean {
  const objetivo = valorComparacion.toLowerCase();

  if (Array.isArray(valorCampo)) {
    return valorCampo.some(
      (item) => typeof item === 'string' && item.toLowerCase().includes(objetivo)
    );
  }

  if (typeof valorCampo === 'string') {
    return valorCampo.toLowerCase().includes(objetivo);
  }

  return false;
}

function matchExacto(valorCampo: unknown, valorComparacion: string): boolean {
  if (typeof valorCampo !== 'string') return false;
  return valorCampo.toLowerCase() === valorComparacion.toLowerCase();
}

function matchRangoNumerico(valorCampo: unknown, rangoMin: number | null, rangoMax: number | null): boolean {
  if (rangoMin === null || rangoMax === null) return false;

  const numero = typeof valorCampo === 'number' ? valorCampo : Number(valorCampo);
  if (Number.isNaN(numero)) return false;

  return numero >= rangoMin && numero <= rangoMax;
}

function criterioMatchea(oferta: OfertaParaScoring, criterio: CriterioScoring): boolean {
  const valorCampo = oferta[criterio.campo_objetivo];

  switch (criterio.tipo_coincidencia) {
    case 'contiene':
      return criterio.valor_comparacion !== null && matchContiene(valorCampo, criterio.valor_comparacion);
    case 'exacto':
      return criterio.valor_comparacion !== null && matchExacto(valorCampo, criterio.valor_comparacion);
    case 'rango_numerico':
      return matchRangoNumerico(valorCampo, criterio.rango_min, criterio.rango_max);
    default:
      return false;
  }
}

export function calcularScoring(oferta: OfertaParaScoring, criterios: CriterioScoring[]): number {
  return criterios
    .filter((criterio) => criterio.activo)
    .filter((criterio) => criterioMatchea(oferta, criterio))
    .reduce((total, criterio) => total + criterio.peso, 0);
}

// Para explicar un puntaje: cada criterio activo y si la oferta lo cumple. Lo que coincide suma exactamente el puntaje.
export function desglosarScoring(
  oferta: OfertaParaScoring,
  criterios: CriterioScoring[]
): { id: string; nombre: string; peso: number; coincide: boolean }[] {
  return criterios
    .filter((criterio) => criterio.activo)
    .map((criterio) => ({ id: criterio.id, nombre: criterio.nombre, peso: criterio.peso, coincide: criterioMatchea(oferta, criterio) }));
}

export async function obtenerCriteriosActivos(userId: string): Promise<CriterioScoring[]> {
  const { data, error } = await supabase
    .from('criterios_scoring')
    .select('*')
    .eq('user_id', userId)
    .eq('activo', true);

  if (error) throw error;
  return data as CriterioScoring[];
}

export function scoresDesactualizados(
  ofertas: (OfertaParaScoring & { id: string; puntaje_scoring: number | null })[],
  criterios: CriterioScoring[]
): { id: string; puntaje_scoring: number }[] {
  const cambios: { id: string; puntaje_scoring: number }[] = [];
  for (const oferta of ofertas) {
    const puntaje_scoring = calcularScoring(oferta, criterios);
    if (oferta.puntaje_scoring !== puntaje_scoring) cambios.push({ id: oferta.id, puntaje_scoring });
  }
  return cambios;
}

const ACTUALIZACIONES_CONCURRENTES = 10;

// Lee todas las ofertas por lotes (el techo de 1000 filas dejaría scores viejos más allá de esa fila)
// y escribe solo las que cambiaron, en grupos concurrentes en vez de una request serial por fila.
export async function recalcularTodosLosScores(userId: string): Promise<void> {
  const criterios = await obtenerCriteriosActivos(userId);

  const ofertas = await leerEnLotes((desde, hasta) =>
    supabase.from('ofertas').select('*').eq('user_id', userId).order('id').range(desde, hasta)
  );

  const cambios = scoresDesactualizados(ofertas as Parameters<typeof scoresDesactualizados>[0], criterios);

  for (let i = 0; i < cambios.length; i += ACTUALIZACIONES_CONCURRENTES) {
    const grupo = cambios.slice(i, i + ACTUALIZACIONES_CONCURRENTES);
    const resultados = await Promise.all(
      grupo.map(({ id, puntaje_scoring }) => supabase.from('ofertas').update({ puntaje_scoring }).eq('id', id))
    );
    const fallo = resultados.find((r) => r.error);
    if (fallo?.error) throw fallo.error;
  }
}
