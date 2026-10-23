import { supabase } from '@/lib/supabase';
import { mensajeDeError } from '@/lib/errores';
import { claveDedupeOferta, FUENTE_MANUAL } from '@/lib/fuentes';
import { escaparLike, leerEnLotes, rangoDePagina } from '@/lib/lotes';
import { ubicacionesDistintas } from '@/lib/ubicaciones';
import { calcularScoring, obtenerCriteriosActivos } from '@/services/scoring';
import type { Oferta, OfertaInput } from '@/types/oferta';

export interface FiltrosOfertas {
  fuente: string;
  ubicacion: string;
  score: number;
}

export const FILTROS_OFERTAS_VACIOS: FiltrosOfertas = { fuente: '', ubicacion: '', score: 0 };

// Misma semántica que los filtros que antes se aplicaban en memoria (coincideFuente, includes, score mínimo),
// pero resuelta en la base para que cuente con todas las filas y no solo con las cargadas.
function aplicarFiltros<Q>(query: Q, { fuente, ubicacion, score }: FiltrosOfertas): Q {
  // El builder de supabase-js cambia de tipo en cada llamada; acá solo encadenamos filtros.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = query;

  if (fuente === FUENTE_MANUAL) q = q.or(`fuente.is.null,fuente.eq."${FUENTE_MANUAL}"`);
  else if (fuente) q = q.eq('fuente', fuente);

  if (ubicacion) q = q.ilike('ubicacion', `%${escaparLike(ubicacion)}%`);
  if (score > 0) q = q.gte('puntaje_scoring', score);

  return q as Q;
}

export async function listarOfertasPagina(
  filtros: FiltrosOfertas,
  pagina: number,
  tamano: number
): Promise<{ ofertas: Oferta[]; total: number }> {
  const { desde, hasta } = rangoDePagina(pagina, tamano);

  const { data, error, count } = await aplicarFiltros(
    supabase.from('ofertas').select('*', { count: 'exact' }),
    filtros
  )
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(desde, hasta);

  if (error) throw error;
  return { ofertas: data as Oferta[], total: count ?? 0 };
}

// Ids de todas las ofertas que coinciden con los filtros (para "seleccionar las N que coinciden").
export function listarIdsOfertas(filtros: FiltrosOfertas): Promise<string[]> {
  return leerEnLotes<{ id: string }>((desde, hasta) =>
    aplicarFiltros(supabase.from('ofertas').select('id'), filtros).order('id').range(desde, hasta)
  ).then((filas) => filas.map((f) => f.id));
}

// Solo las columnas que usa Analytics, leídas por lotes.
export function listarOfertasParaMetricas(): Promise<Pick<Oferta, 'created_at' | 'fuente' | 'puntaje_scoring'>[]> {
  return leerEnLotes((desde, hasta) =>
    supabase.from('ofertas').select('created_at, fuente, puntaje_scoring').order('id').range(desde, hasta)
  );
}

// Claves de dedupe de las ofertas ya guardadas en las fuentes indicadas (comparación sin distinguir mayúsculas).
export async function listarClavesOfertasExistentes(fuentes: string[]): Promise<Set<string>> {
  const claves = new Set<string>();

  for (const fuente of fuentes) {
    const filas = await leerEnLotes((desde, hasta) =>
      supabase
        .from('ofertas')
        .select('empresa, rol, fuente')
        .ilike('fuente', escaparLike(fuente.trim()))
        .order('id')
        .range(desde, hasta)
    );
    for (const fila of filas) claves.add(claveDedupeOferta(fila));
  }

  return claves;
}

// Ofertas ya guardadas de las fuentes indicadas que todavía no tienen enlace (las importadas antes de que se guardara).
export async function listarOfertasSinEnlace(
  fuentes: string[]
): Promise<{ id: string; empresa: string; rol: string; fuente: string | null }[]> {
  const filas: { id: string; empresa: string; rol: string; fuente: string | null }[] = [];

  for (const fuente of fuentes) {
    filas.push(
      ...(await leerEnLotes<{ id: string; empresa: string; rol: string; fuente: string | null }>((desde, hasta) =>
        supabase
          .from('ofertas')
          .select('id, empresa, rol, fuente')
          .is('url', null)
          .ilike('fuente', escaparLike(fuente.trim()))
          .order('id')
          .range(desde, hasta)
      ))
    );
  }

  return filas;
}

// Solo completa el enlace y la descripción: no toca el puntaje ni nada más de la oferta.
export async function completarEnlaceOferta(
  id: string,
  { url, descripcion }: { url: string; descripcion: string | null }
): Promise<void> {
  const { error } = await supabase.from('ofertas').update({ url, descripcion }).eq('id', id);
  if (error) throw error;
}

// Cuántas de estas ofertas ya tienen una postulación (en tandas, para no armar una URL gigante).
export async function contarPostulacionesDeOfertas(ofertaIds: string[]): Promise<number> {
  let total = 0;
  for (let i = 0; i < ofertaIds.length; i += 100) {
    const { count, error } = await supabase
      .from('postulaciones')
      .select('id', { count: 'exact', head: true })
      .in('oferta_id', ofertaIds.slice(i, i + 100));
    if (error) throw error;
    total += count ?? 0;
  }
  return total;
}

export async function crearOferta(input: OfertaInput): Promise<Oferta> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('No hay sesión activa.');

  const criterios = await obtenerCriteriosActivos(user.id);
  const puntaje_scoring = calcularScoring(input, criterios);

  const { data, error } = await supabase
    .from('ofertas')
    .insert({ ...input, user_id: user.id, puntaje_scoring })
    .select()
    .single();

  if (error) throw error;
  return data as Oferta;
}

export async function actualizarOferta(id: string, input: Partial<OfertaInput>): Promise<Oferta> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('No hay sesión activa.');

  const { data: actual, error: actualError } = await supabase
    .from('ofertas')
    .select('*')
    .eq('id', id)
    .single();

  if (actualError) throw actualError;

  const criterios = await obtenerCriteriosActivos(user.id);
  const puntaje_scoring = calcularScoring({ ...(actual as Oferta), ...input }, criterios);

  const { data, error } = await supabase
    .from('ofertas')
    .update({ ...input, puntaje_scoring })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data as Oferta;
}

export async function eliminarOferta(id: string): Promise<void> {
  const { error } = await supabase.from('ofertas').delete().eq('id', id);
  if (error) throw error;
}

const TAMANO_LOTE_ELIMINACION = 50;

// Borra por lotes para no hacer una request por fila; si un lote falla, reintenta fila por fila
// para aislar la que falla. Las filas que la base no devuelve como borradas cuentan como fallidas.
export async function eliminarEnLotes(
  ids: string[],
  borrar: (lote: string[]) => Promise<string[]>,
  tamanoLote = TAMANO_LOTE_ELIMINACION
): Promise<{ eliminadas: string[]; fallidas: string[]; motivo: string | null }> {
  const eliminadas: string[] = [];
  const fallidas: string[] = [];
  let motivo: string | null = null;

  const registrar = (lote: string[], borradas: string[]) => {
    eliminadas.push(...borradas);
    fallidas.push(...lote.filter((id) => !borradas.includes(id)));
  };

  for (let i = 0; i < ids.length; i += tamanoLote) {
    const lote = ids.slice(i, i + tamanoLote);

    try {
      registrar(lote, await borrar(lote));
    } catch (err) {
      motivo ??= mensajeDeError(err, 'error desconocido');
      for (const id of lote) {
        try {
          registrar([id], await borrar([id]));
        } catch {
          fallidas.push(id);
        }
      }
    }
  }

  return { eliminadas, fallidas, motivo };
}

export function eliminarOfertas(ids: string[]) {
  return eliminarEnLotes(ids, async (lote) => {
    const { data, error } = await supabase.from('ofertas').delete().in('id', lote).select('id');
    if (error) throw error;
    return data.map((fila) => fila.id as string);
  });
}

// Ubicaciones que aparecen en las ofertas cargadas, para sugerirlas en el filtro (RLS: solo las del usuario).
export async function listarUbicacionesDeOfertas(): Promise<string[]> {
  const filas = await leerEnLotes<{ ubicacion: string | null }>((desde, hasta) =>
    supabase.from('ofertas').select('ubicacion').order('id').range(desde, hasta)
  );
  return ubicacionesDistintas(filas.map((f) => f.ubicacion));
}
