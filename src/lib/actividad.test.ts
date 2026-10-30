import { describe, expect, it } from 'vitest';
import {
  DIAS_SIN_ACTIVIDAD,
  avisoCerrado,
  cerrarAviso,
  debeFelicitar,
  estadoDeActividad,
  mensajeDeActividad,
  movimientosDe,
} from '@/lib/actividad';

const AHORA = new Date('2026-10-30T15:00:00Z');
const DIA = 24 * 60 * 60 * 1000;
const hace = (dias: number) => new Date(AHORA.getTime() - dias * DIA);
const variosHace = (...dias: number[]) => dias.map(hace);

describe('movimientosDe', () => {
  it('cuenta postulaciones creadas, interacciones registradas y cambios de estado reales', () => {
    const fechas = movimientosDe({
      postulaciones: [{ created_at: hace(20).toISOString() }, { created_at: hace(3).toISOString() }],
      interacciones: [{ fecha: hace(2).toISOString() }],
      historial: [
        { estado_anterior: null, es_estimado: false, fecha: hace(20).toISOString() }, // la creación: ya cuenta como postulación
        { estado_anterior: 'por_aplicar', es_estimado: false, fecha: hace(1).toISOString() },
        { estado_anterior: null, es_estimado: true, fecha: hace(40).toISOString() }, // reconstruido, no es un movimiento real
        { estado_anterior: 'aplicado', es_estimado: true, fecha: hace(30).toISOString() },
      ],
    });
    expect(fechas).toHaveLength(4);
    expect(fechas.map((f) => Math.round((AHORA.getTime() - f.getTime()) / DIA)).sort((a, b) => a - b)).toEqual([1, 2, 3, 20]);
  });

  it('sin datos no hay movimientos', () => {
    expect(movimientosDe({ postulaciones: [], interacciones: [], historial: [] })).toEqual([]);
  });
});

describe('estadoDeActividad', () => {
  it('recién empieza: menos de 3 movimientos en total', () => {
    expect(estadoDeActividad(variosHace(1, 2), AHORA).estado).toBe('recien-empieza');
    expect(estadoDeActividad([], AHORA).estado).toBe('recien-empieza');
  });

  it('recién empieza: aunque haya 3 movimientos, si todo es de la última semana todavía no hay historial', () => {
    expect(estadoDeActividad(variosHace(0.5, 1, 2), AHORA).estado).toBe('recien-empieza');
    expect(estadoDeActividad(variosHace(1, 2, 6.9), AHORA).estado).toBe('recien-empieza'); // el primero tiene menos de 7 días
  });

  it('sin actividad: nada en los últimos 10 días y antes sí hubo', () => {
    const r = estadoDeActividad(variosHace(30, 25, 20, 12), AHORA);
    expect(r.estado).toBe('sin-actividad');
    expect(r.diasSinActividad).toBe(12);
  });

  it('el borde de los 10 días: justo 10 días es sin actividad; 9 días todavía no', () => {
    expect(estadoDeActividad(variosHace(30, 25, 20, DIAS_SIN_ACTIVIDAD), AHORA).estado).toBe('sin-actividad');
    expect(estadoDeActividad(variosHace(30, 25, 20, DIAS_SIN_ACTIVIDAD - 1), AHORA).estado).not.toBe('sin-actividad');
  });

  it('bajó el ritmo: la semana anterior tuvo 3 o más y esta tiene la mitad o menos', () => {
    // anterior (de 7 a 14 días atrás): 4 movimientos; esta (últimos 7 días): 2
    const r = estadoDeActividad(variosHace(30, 13, 12, 10, 9, 5, 2), AHORA);
    expect(r).toMatchObject({ estado: 'bajo-ritmo', esta: 2, anterior: 4 });
  });

  it('el borde de la caída: justo la mitad ya es «bajó»; un poco más, no', () => {
    expect(estadoDeActividad(variosHace(30, 13, 12, 10, 9, 5, 3), AHORA).estado).toBe('bajo-ritmo'); // 4 anteriores, 2 esta (50 %)
    expect(estadoDeActividad(variosHace(30, 13, 12, 10, 9, 5, 4, 3), AHORA).estado).not.toBe('bajo-ritmo'); // 4 anteriores, 3 esta
  });

  it('con menos de 3 la semana anterior no hay caída que contar', () => {
    expect(estadoDeActividad(variosHace(30, 25, 10, 9, 1), AHORA).estado).toBe('parecido'); // anterior: 2 (el de 10 y el de 9), esta: 1
  });

  it('vas muy bien: esta semana igual o mayor que la anterior y al menos 3', () => {
    const r = estadoDeActividad(variosHace(30, 12, 11, 5, 4, 3, 2), AHORA);
    expect(r).toMatchObject({ estado: 'vas-bien', esta: 4, anterior: 2 });
    expect(estadoDeActividad(variosHace(30, 13, 12, 10, 6, 5, 2), AHORA).estado).toBe('vas-bien'); // 3 y 3: igual
  });

  it('con menos de 3 esta semana no es «vas muy bien» aunque supere la anterior', () => {
    expect(estadoDeActividad(variosHace(30, 25, 20, 3, 2), AHORA).estado).toBe('parecido');
  });

  it('ritmo parecido en cualquier otro caso', () => {
    expect(estadoDeActividad(variosHace(30, 13, 12, 10, 9, 5, 4, 3), AHORA).estado).toBe('parecido'); // 4 anteriores y 3 esta
  });

  it('las fechas futuras no cuentan', () => {
    const futuro = new Date(AHORA.getTime() + 2 * DIA);
    expect(estadoDeActividad([...variosHace(30, 25), futuro], AHORA).estado).toBe('recien-empieza');
  });
});

describe('mensajes del aviso', () => {
  it('«bajó el ritmo» dice los dos números y no culpa', () => {
    const m = mensajeDeActividad({ estado: 'bajo-ritmo', esta: 2, anterior: 7, diasSinActividad: 1 });
    expect(m?.titulo).toBe('Bajó tu ritmo');
    expect(m?.texto).toContain('Esta semana hiciste 2 movimientos y la anterior 7.');
  });

  it('concuerda en singular y cuando no hubo ninguno', () => {
    expect(mensajeDeActividad({ estado: 'bajo-ritmo', esta: 1, anterior: 3, diasSinActividad: 2 })?.texto).toContain('hiciste 1 movimiento ');
    expect(mensajeDeActividad({ estado: 'bajo-ritmo', esta: 0, anterior: 4, diasSinActividad: 8 })?.texto).toContain('Esta semana no registraste movimientos y la anterior hiciste 4.');
  });

  it('«sin actividad» cuenta los días y propone retomar', () => {
    const m = mensajeDeActividad({ estado: 'sin-actividad', esta: 0, anterior: 0, diasSinActividad: 12 });
    expect(m?.titulo).toBe('¿Retomamos?');
    expect(m?.texto).toContain('Hace 12 días que no registrás actividad.');
  });

  it('«vas muy bien» celebra y no pide nada', () => {
    const m = mensajeDeActividad({ estado: 'vas-bien', esta: 7, anterior: 5, diasSinActividad: 0 });
    expect(m?.titulo).toBe('Vas muy bien');
    expect(m?.texto).toContain('7 movimientos esta semana');
  });

  it('«recién empieza» y «ritmo parecido» no muestran ningún aviso', () => {
    expect(mensajeDeActividad({ estado: 'recien-empieza', esta: 0, anterior: 0, diasSinActividad: null })).toBeNull();
    expect(mensajeDeActividad({ estado: 'parecido', esta: 3, anterior: 4, diasSinActividad: 1 })).toBeNull();
  });
});

describe('cerrar el aviso', () => {
  function almacenFalso() {
    const datos = new Map<string, string>();
    return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v) };
  }

  it('no está cerrado hasta que se cierra', () => {
    expect(avisoCerrado('u1', 'bajo-ritmo', AHORA, almacenFalso())).toBe(false);
  });

  it('«bajó el ritmo» y «sin actividad» quedan cerrados 3 días; «vas muy bien», 7', () => {
    const almacen = almacenFalso();
    cerrarAviso('u1', 'bajo-ritmo', AHORA, almacen);
    cerrarAviso('u1', 'vas-bien', AHORA, almacen);
    const despues = (dias: number) => new Date(AHORA.getTime() + dias * DIA);
    expect(avisoCerrado('u1', 'bajo-ritmo', despues(2.9), almacen)).toBe(true);
    expect(avisoCerrado('u1', 'bajo-ritmo', despues(3.1), almacen)).toBe(false);
    expect(avisoCerrado('u1', 'vas-bien', despues(6.9), almacen)).toBe(true);
    expect(avisoCerrado('u1', 'vas-bien', despues(7.1), almacen)).toBe(false);
  });

  it('si el estado cambia, el aviso vuelve a aparecer (por ejemplo de «bajó» a «sin actividad»)', () => {
    const almacen = almacenFalso();
    cerrarAviso('u1', 'bajo-ritmo', AHORA, almacen);
    expect(avisoCerrado('u1', 'sin-actividad', AHORA, almacen)).toBe(false);
  });

  it('cada persona recuerda lo suyo', () => {
    const almacen = almacenFalso();
    cerrarAviso('u1', 'bajo-ritmo', AHORA, almacen);
    expect(avisoCerrado('u2', 'bajo-ritmo', AHORA, almacen)).toBe(false);
  });

  it('si el navegador no deja guardar, el aviso se muestra y no rompe nada', () => {
    const roto = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(() => cerrarAviso('u1', 'bajo-ritmo', AHORA, roto)).not.toThrow();
    expect(avisoCerrado('u1', 'bajo-ritmo', AHORA, roto)).toBe(false);
    expect(avisoCerrado('u1', 'bajo-ritmo', AHORA, null)).toBe(false);
  });
});

describe('debeFelicitar («vas muy bien» una vez por semana)', () => {
  function almacenFalso() {
    const datos = new Map<string, string>();
    return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v) };
  }

  it('la primera vez se muestra y se queda a la vista durante toda esa sesión', () => {
    const local = almacenFalso();
    const sesion = almacenFalso();
    expect(debeFelicitar('u1', AHORA, local, sesion)).toBe(true);
    expect(debeFelicitar('u1', new Date(AHORA.getTime() + 60_000), local, sesion)).toBe(true);
  });

  it('en otra sesión de la misma semana ya no aparece, y a los 7 días vuelve', () => {
    const local = almacenFalso();
    debeFelicitar('u1', AHORA, local, almacenFalso());
    const otraSesion = (dias: number) => debeFelicitar('u1', new Date(AHORA.getTime() + dias * DIA), local, almacenFalso());
    expect(otraSesion(2)).toBe(false);
    expect(otraSesion(6.9)).toBe(false);
    expect(otraSesion(7.1)).toBe(true);
  });

  it('si la persona la cerró, no vuelve a aparecer en la semana', () => {
    const local = almacenFalso();
    const sesion = almacenFalso();
    expect(debeFelicitar('u1', AHORA, local, sesion)).toBe(true);
    cerrarAviso('u1', 'vas-bien', AHORA, local);
    expect(debeFelicitar('u1', new Date(AHORA.getTime() + 60_000), local, sesion)).toBe(false);
  });

  it('sin almacenamiento en el navegador, se muestra', () => {
    expect(debeFelicitar('u1', AHORA, null, null)).toBe(true);
  });
});
