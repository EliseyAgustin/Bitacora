import { describe, expect, it } from 'vitest';
import {
  ESPERA_MINIMA_MS,
  agregarPendiente,
  listarPendientes,
  posponerPendiente,
  resolverPendiente,
  siguientePregunta,
} from '@/lib/pendientes';

const AHORA = 1_790_000_000_000;
const DIA = 24 * 60 * 60 * 1000;

function almacenFalso() {
  const datos = new Map<string, string>();
  return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v) };
}
const oferta = (id: string) => ({ ofertaId: id, empresa: `Empresa ${id}`, rol: `Rol ${id}` });

describe('ofertas pendientes de confirmar («¿ya te postulaste?»)', () => {
  it('guarda la oferta cuando se abre su enlace, y no la duplica si se abre de nuevo', () => {
    const almacen = almacenFalso();
    agregarPendiente('u1', oferta('a'), AHORA, almacen);
    agregarPendiente('u1', oferta('a'), AHORA + 5000, almacen);
    expect(listarPendientes('u1', almacen)).toEqual([{ ...oferta('a'), desde: AHORA + 5000 }]);
  });

  it('cada persona tiene sus pendientes', () => {
    const almacen = almacenFalso();
    agregarPendiente('u1', oferta('a'), AHORA, almacen);
    expect(listarPendientes('u2', almacen)).toEqual([]);
  });

  it('no pregunta enseguida: hay que dejar pasar un momento para que la persona llegue a postularse', () => {
    const almacen = almacenFalso();
    agregarPendiente('u1', oferta('a'), AHORA, almacen);
    expect(siguientePregunta('u1', AHORA + ESPERA_MINIMA_MS - 1, almacen)).toBeNull();
    expect(siguientePregunta('u1', AHORA + ESPERA_MINIMA_MS, almacen)?.ofertaId).toBe('a');
  });

  it('pregunta de a una, la más antigua primero', () => {
    const almacen = almacenFalso();
    agregarPendiente('u1', oferta('a'), AHORA, almacen);
    agregarPendiente('u1', oferta('b'), AHORA + 1000, almacen);
    expect(siguientePregunta('u1', AHORA + 60_000, almacen)?.ofertaId).toBe('a');
    resolverPendiente('u1', 'a', almacen);
    expect(siguientePregunta('u1', AHORA + 60_000, almacen)?.ofertaId).toBe('b');
  });

  it('«todavía no» la deja de preguntar por un día y después vuelve', () => {
    const almacen = almacenFalso();
    agregarPendiente('u1', oferta('a'), AHORA, almacen);
    posponerPendiente('u1', 'a', AHORA + 60_000 + DIA, almacen);
    expect(siguientePregunta('u1', AHORA + 60_000 + DIA - 1, almacen)).toBeNull();
    expect(siguientePregunta('u1', AHORA + 60_000 + DIA, almacen)?.ofertaId).toBe('a');
  });

  it('guarda como mucho cinco pendientes (los más recientes)', () => {
    const almacen = almacenFalso();
    for (let i = 0; i < 7; i++) agregarPendiente('u1', oferta(String(i)), AHORA + i, almacen);
    expect(listarPendientes('u1', almacen).map((p) => p.ofertaId)).toEqual(['2', '3', '4', '5', '6']);
  });

  it('si el navegador no deja guardar o lo guardado está dañado, no rompe', () => {
    const roto = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(() => agregarPendiente('u1', oferta('a'), AHORA, roto)).not.toThrow();
    expect(listarPendientes('u1', roto)).toEqual([]);
    expect(listarPendientes('u1', null)).toEqual([]);
    const danado = almacenFalso();
    danado.setItem('laburin:pendientes:u1', '{no es json');
    expect(listarPendientes('u1', danado)).toEqual([]);
    expect(siguientePregunta('u1', AHORA, danado)).toBeNull();
  });
});
