export const FUENTE_MANUAL = 'Carga manual';

export const FUENTES_OFERTA = ['Remotive', 'Arbeitnow', 'RemoteOK', FUENTE_MANUAL] as const;

export function coincideFuente(fuenteOferta: string | null, filtro: string): boolean {
  if (!filtro) return true;
  if (filtro === FUENTE_MANUAL) return !fuenteOferta || fuenteOferta === FUENTE_MANUAL;
  return fuenteOferta === filtro;
}

export function claveDedupeOferta(oferta: {
  empresa: string;
  rol: string;
  fuente: string | null;
}): string {
  return [oferta.empresa, oferta.rol, oferta.fuente ?? '']
    .map((parte) => parte.trim().toLowerCase())
    .join('|');
}
