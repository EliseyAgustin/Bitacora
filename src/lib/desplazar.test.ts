import { describe, expect, it } from 'vitest';
import { duracionPara, DURACION_MAXIMA_MS, DURACION_MINIMA_MS, suavizado } from './desplazar';

describe('suavizado', () => {
  it('empieza en 0, pasa por la mitad y termina en 1', () => {
    expect(suavizado(0)).toBe(0);
    expect(suavizado(0.5)).toBeCloseTo(0.5);
    expect(suavizado(1)).toBe(1);
  });
  it('arranca despacio y no se sale de rango', () => {
    expect(suavizado(0.1)).toBeLessThan(0.1);
    expect(suavizado(-3)).toBe(0);
    expect(suavizado(7)).toBe(1);
  });
});

describe('duracionPara', () => {
  it('es lenta incluso en saltos cortos y tiene un tope en los largos', () => {
    expect(duracionPara(10)).toBe(DURACION_MINIMA_MS);
    expect(duracionPara(100000)).toBe(DURACION_MAXIMA_MS);
  });
  it('crece con la distancia', () => {
    expect(duracionPara(2000)).toBeGreaterThan(duracionPara(800));
  });
});
