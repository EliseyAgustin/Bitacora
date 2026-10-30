import { describe, expect, it } from 'vitest';
import { marcarVisitada, yaVisitada } from '@/lib/visitas';

function almacenFalso() {
  const datos = new Map<string, string>();
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
  };
}

describe('visitas a las pantallas', () => {
  it('una pantalla no se considera visitada hasta que se la marca', () => {
    const almacen = almacenFalso();
    expect(yaVisitada('/ofertas', almacen)).toBe(false);
    marcarVisitada('/ofertas', almacen);
    expect(yaVisitada('/ofertas', almacen)).toBe(true);
  });

  it('cada pantalla se recuerda por separado', () => {
    const almacen = almacenFalso();
    marcarVisitada('/ofertas', almacen);
    expect(yaVisitada('/mis-postulaciones', almacen)).toBe(false);
  });

  it('si el navegador no deja guardar, no rompe y no se anima de más', () => {
    const roto = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(() => marcarVisitada('/ofertas', roto)).not.toThrow();
    // Sin poder recordar, se considera visitada: así las entradas no se repiten en cada navegación.
    expect(yaVisitada('/ofertas', roto)).toBe(true);
    expect(yaVisitada('/ofertas', null)).toBe(true);
  });
});
