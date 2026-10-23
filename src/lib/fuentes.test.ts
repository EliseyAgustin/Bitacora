import { describe, expect, it } from 'vitest';
import { coincideFuente, FUENTE_MANUAL, FUENTES_OFERTA } from '@/lib/fuentes';

describe('FUENTES_OFERTA', () => {
  it('lista solo las fuentes reales del sistema: tres portales y la carga manual', () => {
    expect(FUENTES_OFERTA).toEqual(['Remotive', 'Arbeitnow', 'RemoteOK', 'Carga manual']);
  });
});

describe('coincideFuente', () => {
  it('sin filtro deja pasar cualquier oferta, incluso con fuente heredada', () => {
    expect(coincideFuente('Remotive', '')).toBe(true);
    expect(coincideFuente(null, '')).toBe(true);
    expect(coincideFuente('Himalayas', '')).toBe(true);
  });

  it('filtra por igualdad exacta para las fuentes importadas', () => {
    expect(coincideFuente('Remotive', 'Remotive')).toBe(true);
    expect(coincideFuente('Arbeitnow', 'Remotive')).toBe(false);
  });

  it('Carga manual incluye ofertas con esa fuente o sin fuente', () => {
    expect(coincideFuente(FUENTE_MANUAL, FUENTE_MANUAL)).toBe(true);
    expect(coincideFuente(null, FUENTE_MANUAL)).toBe(true);
    expect(coincideFuente('', FUENTE_MANUAL)).toBe(true);
  });

  it('Carga manual no incluye fuentes importadas ni plataformas heredadas', () => {
    expect(coincideFuente('Remotive', FUENTE_MANUAL)).toBe(false);
    expect(coincideFuente('LinkedIn', FUENTE_MANUAL)).toBe(false);
  });
});
