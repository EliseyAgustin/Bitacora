import { claveDedupeOferta } from '@/lib/fuentes';
import { textoPlano, urlSegura } from '@/lib/ofertaDetalle';
import {
  completarEnlaceOferta,
  crearOfertas,
  listarClavesOfertasExistentes,
  listarOfertasSinEnlace,
} from '@/services/ofertas';
import type { Oferta, OfertaInput } from '@/types/oferta';

const REMOTIVE_URL = 'https://remotive.com/api/remote-jobs?limit=100';
const ARBEITNOW_URL = 'https://www.arbeitnow.com/api/job-board-api';
const REMOTEOK_URL = 'https://remoteok.com/api';

// La base acepta hasta 5000 caracteres; el texto plano agrega un "…" si hubo que cortarlo.
const DESCRIPCION_MAXIMA = 4000;

function enlaceYDescripcion(url: string | undefined, html: string | undefined) {
  return { url: urlSegura(url), descripcion: textoPlano(html, DESCRIPCION_MAXIMA) || null };
}

export { claveDedupeOferta };

export interface RemotiveJob {
  title: string;
  company_name: string;
  candidate_required_location: string;
  tags: string[];
  publication_date: string;
  url?: string;
  description?: string;
}

interface RemotiveResponse {
  jobs: RemotiveJob[];
}

export interface ArbeitnowJob {
  company_name: string;
  title: string;
  location: string;
  remote: boolean;
  tags: string[];
  created_at: number;
  url?: string;
  description?: string;
}

// RemoteOK devuelve un arreglo: el primer elemento es el aviso legal y el resto son las ofertas.
export interface RemoteOKJob {
  company: string;
  position: string;
  location?: string;
  tags?: string[];
  date?: string;
  url?: string;
  description?: string;
}

interface ArbeitnowResponse {
  data: ArbeitnowJob[];
}

export function normalizarRemotive(job: RemotiveJob): OfertaInput {
  return {
    empresa: job.company_name,
    rol: job.title,
    ubicacion: job.candidate_required_location?.trim() || null,
    modalidad: 'remoto',
    stack_tecnologico: job.tags ?? [],
    fuente: 'Remotive',
    fecha_publicacion: job.publication_date ? job.publication_date.slice(0, 10) : null,
    ...enlaceYDescripcion(job.url, job.description),
  };
}

export function normalizarArbeitnow(job: ArbeitnowJob): OfertaInput {
  return {
    empresa: job.company_name,
    rol: job.title,
    ubicacion: job.location?.trim() || null,
    modalidad: 'remoto',
    stack_tecnologico: job.tags ?? [],
    fuente: 'Arbeitnow',
    fecha_publicacion: job.created_at ? new Date(job.created_at * 1000).toISOString().slice(0, 10) : null,
    ...enlaceYDescripcion(job.url, job.description),
  };
}

export function normalizarRemoteOK(job: RemoteOKJob): OfertaInput {
  return {
    empresa: job.company,
    rol: job.position,
    ubicacion: job.location?.trim() || null,
    modalidad: 'remoto',
    stack_tecnologico: job.tags ?? [],
    fuente: 'RemoteOK',
    fecha_publicacion: job.date ? job.date.slice(0, 10) : null,
    ...enlaceYDescripcion(job.url, job.description),
  };
}

export async function importarDeRemotive(): Promise<OfertaInput[]> {
  const res = await fetch(REMOTIVE_URL);
  if (!res.ok) throw new Error(`Remotive respondió ${res.status}`);

  const data = (await res.json()) as RemotiveResponse;
  return data.jobs.map(normalizarRemotive);
}

export async function importarDeArbeitnow(): Promise<OfertaInput[]> {
  const res = await fetch(ARBEITNOW_URL);
  if (!res.ok) throw new Error(`Arbeitnow respondió ${res.status}`);

  const data = (await res.json()) as ArbeitnowResponse;
  return data.data.filter((job) => job.remote).map(normalizarArbeitnow);
}

export async function importarDeRemoteOK(): Promise<OfertaInput[]> {
  const res = await fetch(REMOTEOK_URL);
  if (!res.ok) throw new Error(`RemoteOK respondió ${res.status}`);

  const data = (await res.json()) as Partial<RemoteOKJob>[];
  return data.filter((job): job is RemoteOKJob => !!job.position && !!job.company).map(normalizarRemoteOK);
}

export interface ResultadoImportacion {
  insertadas: Oferta[];
  omitidasPorDuplicado: number;
  erroresInsercion: number;
  fuentesFallidas: string[];
  // Ofertas que ya estaban guardadas sin enlace y ahora lo recibieron.
  enlacesCompletados: number;
}

const clavePorOferta = (o: { empresa: string; rol: string; fuente: string | null }) => claveDedupeOferta(o);

// Las ofertas importadas antes de guardar el enlace quedaron sin él: si la fuente las vuelve a traer, se les completa.
export function emparejarEnlaces(
  candidatos: OfertaInput[],
  sinEnlace: { id: string; empresa: string; rol: string; fuente: string | null }[]
): { id: string; url: string; descripcion: string | null }[] {
  const idPorClave = new Map(sinEnlace.map((o) => [clavePorOferta(o), o.id]));
  const completadas = new Set<string>();
  const resultado: { id: string; url: string; descripcion: string | null }[] = [];

  for (const candidato of candidatos) {
    const id = idPorClave.get(clavePorOferta(candidato));
    if (!id || !candidato.url || completadas.has(id)) continue;
    completadas.add(id);
    resultado.push({ id, url: candidato.url, descripcion: candidato.descripcion ?? null });
  }

  return resultado;
}

// Separa las candidatas que todavía no existen. `existentes` son claves ya normalizadas con claveDedupeOferta.
export function separarNuevas(
  candidatos: OfertaInput[],
  existentes: Set<string>
): { nuevas: OfertaInput[]; omitidasPorDuplicado: number } {
  const vistos = new Set(existentes);
  const nuevas: OfertaInput[] = [];
  let omitidasPorDuplicado = 0;

  for (const candidato of candidatos) {
    const clave = claveDedupeOferta(candidato);
    if (vistos.has(clave)) {
      omitidasPorDuplicado++;
      continue;
    }
    vistos.add(clave);
    nuevas.push(candidato);
  }

  return { nuevas, omitidasPorDuplicado };
}

export async function importarOfertasRemotas(): Promise<ResultadoImportacion> {
  const fuentesFallidas: string[] = [];

  const [remotive, arbeitnow, remoteok] = await Promise.allSettled([
    importarDeRemotive(),
    importarDeArbeitnow(),
    importarDeRemoteOK(),
  ]);

  const candidatos: OfertaInput[] = [];
  if (remotive.status === 'fulfilled') candidatos.push(...remotive.value);
  else fuentesFallidas.push('Remotive');

  if (arbeitnow.status === 'fulfilled') candidatos.push(...arbeitnow.value);
  else fuentesFallidas.push('Arbeitnow');

  if (remoteok.status === 'fulfilled') candidatos.push(...remoteok.value);
  else fuentesFallidas.push('RemoteOK');

  // No depende de tener cargadas las ofertas: se consultan solo las claves de las fuentes candidatas.
  const fuentes = [...new Set(candidatos.map((c) => c.fuente).filter((f): f is string => !!f))];
  const existentes = await listarClavesOfertasExistentes(fuentes);
  const { nuevas, omitidasPorDuplicado } = separarNuevas(candidatos, existentes);

  const { insertadas, erroresInsercion } = await crearOfertas(nuevas);

  // Completar enlaces es un extra: si falla, la importación sigue valiendo.
  let enlacesCompletados = 0;
  try {
    const aCompletar = emparejarEnlaces(candidatos, await listarOfertasSinEnlace(fuentes));
    for (let i = 0; i < aCompletar.length; i += 10) {
      const grupo = await Promise.allSettled(aCompletar.slice(i, i + 10).map((o) => completarEnlaceOferta(o.id, o)));
      enlacesCompletados += grupo.filter((r) => r.status === 'fulfilled').length;
    }
  } catch {
    // se informa solo lo que se pudo completar
  }

  return { insertadas, omitidasPorDuplicado, erroresInsercion, fuentesFallidas, enlacesCompletados };
}

export function resumenImportacion(resultado: ResultadoImportacion): string {
  const { insertadas, omitidasPorDuplicado, erroresInsercion, fuentesFallidas, enlacesCompletados } = resultado;

  const partes = [
    insertadas.length === 1 ? '1 oferta nueva importada' : `${insertadas.length} ofertas nuevas importadas`,
  ];
  if (omitidasPorDuplicado > 0) {
    partes.push(omitidasPorDuplicado === 1 ? '1 duplicada omitida' : `${omitidasPorDuplicado} duplicadas omitidas`);
  }
  if (enlacesCompletados > 0) partes.push(`${enlacesCompletados} con enlace agregado`);
  if (erroresInsercion > 0) {
    partes.push(erroresInsercion === 1 ? '1 falló al guardar' : `${erroresInsercion} fallaron al guardar`);
  }
  if (fuentesFallidas.length > 0) {
    partes.push(`no se pudo consultar: ${fuentesFallidas.join(', ')}`);
  }
  return partes.join(' · ');
}
