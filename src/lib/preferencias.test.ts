import { describe, expect, it } from 'vitest';
import { leerPreferencia, guardarPreferencia, PREFERENCIAS_INICIALES } from './preferencias';

function almacenEnMemoria() {
  const datos = new Map<string, string>();
  return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v) };
}

describe('preferencias', () => {
  it('por defecto todo está activado', () => {
    expect(PREFERENCIAS_INICIALES).toEqual({ avisoActividad: true, preguntaPostulacion: true });
    expect(leerPreferencia('u1', 'avisoActividad', almacenEnMemoria())).toBe(true);
  });
  it('se guarda por persona y por preferencia', () => {
    const a = almacenEnMemoria();
    guardarPreferencia('u1', 'avisoActividad', false, a);
    expect(leerPreferencia('u1', 'avisoActividad', a)).toBe(false);
    expect(leerPreferencia('u1', 'preguntaPostulacion', a)).toBe(true);
    expect(leerPreferencia('u2', 'avisoActividad', a)).toBe(true);
    guardarPreferencia('u1', 'avisoActividad', true, a);
    expect(leerPreferencia('u1', 'avisoActividad', a)).toBe(true);
  });
  it('sin almacenamiento o con almacenamiento roto, usa el valor por defecto y no falla', () => {
    expect(leerPreferencia('u1', 'avisoActividad', null)).toBe(true);
    const roto = { getItem: () => { throw new Error('x'); }, setItem: () => { throw new Error('x'); } };
    expect(leerPreferencia('u1', 'preguntaPostulacion', roto)).toBe(true);
    expect(() => guardarPreferencia('u1', 'avisoActividad', false, roto)).not.toThrow();
  });
});
