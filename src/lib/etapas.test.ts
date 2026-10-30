import { describe, expect, it } from 'vitest';
import { ETAPA_CLASES } from '@/lib/etapas';

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
