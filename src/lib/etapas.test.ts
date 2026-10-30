import { describe, expect, it } from 'vitest';
import { DESCRIPCION_ETAPA, ETAPA_CLASES } from '@/lib/etapas';

describe('colores de las etapas', () => {
  it('cada una de las seis etapas tiene su marca y su etiqueta, con los colores del sistema de diseño', () => {
    expect(Object.keys(ETAPA_CLASES).sort()).toEqual(['aplicado', 'en_proceso', 'entrevista', 'oferta', 'por_aplicar', 'rechazado']);
    for (const [estado, clases] of Object.entries(ETAPA_CLASES)) {
      const nombre = estado.replace('_', '-');
      expect(clases.punto, estado).toBe(`bg-etapa-${nombre}`);
      expect(clases.chip, estado).toBe(`bg-etapa-${nombre}-fondo text-etapa-${nombre}-tinta`);
    }
  });
});

describe('descripción corta de cada etapa', () => {
  it('dice en una frase qué significa cada columna del tablero', () => {
    expect(DESCRIPCION_ETAPA).toEqual({
      por_aplicar: 'Las guardaste, todavía no te postulaste.',
      aplicado: 'Ya te postulaste. Esperá una respuesta.',
      en_proceso: 'Te respondieron y hay pasos en curso.',
      entrevista: 'Tenés una entrevista pendiente o ya hecha.',
      oferta: 'Te hicieron una propuesta.',
      rechazado: 'No siguieron adelante. Queda como registro.',
    });
  });
});
