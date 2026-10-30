import { describe, expect, it } from 'vitest';
import {
  DIAS_SIN_ACTIVIDAD,
  MOVIMIENTOS_SEMANA_PREVIA,
  OCULTAR_DIAS,
  avisoCerrado,
  avisoVisible,
  cerrarAviso,
  estadoDeActividad,
  mensajeDeActividad,
  movimientosDe,
} from '@/lib/actividad';

const AHORA = new Date('2026-10-30T15:00:00Z');
const DIA = 24 * 60 * 60 * 1000;
const hace = (dias: number) => new Date(AHORA.getTime() - dias * DIA);
const variosHace = (...dias: number[]) => dias.map(hace);

function almacenFalso() {
  const datos = new Map<string, string>();
  return { getItem: (k: string) => datos.get(k) ?? null, setItem: (k: string, v: string) => void datos.set(k, v) };
}

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
  it('el umbral de la semana previa es de 4 movimientos', () => {
    expect(MOVIMIENTOS_SEMANA_PREVIA).toBe(4);
  });

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

  it('bajó el ritmo: la semana anterior tuvo 4 o más y esta tiene la mitad o menos', () => {
    // anterior (de 7 a 14 días atrás): 4 movimientos; esta (últimos 7 días): 2
    const r = estadoDeActividad(variosHace(30, 13, 12, 10, 9, 5, 2), AHORA);
    expect(r).toMatchObject({ estado: 'bajo-ritmo', esta: 2, anterior: 4 });
  });

  it('el borde de la semana previa: con 4 hay aviso; con 3 no, aunque esta semana sea la mitad', () => {
    expect(estadoDeActividad(variosHace(30, 13, 12, 10, 9, 5, 2), AHORA).estado).toBe('bajo-ritmo'); // 4 anteriores, 2 esta
    expect(estadoDeActividad(variosHace(30, 13, 12, 10, 5), AHORA).estado).toBe('parecido'); // 3 anteriores, 1 esta: poco para comparar
  });

  it('el borde de la caída: justo la mitad ya es «bajó»; un poco más, no', () => {
    expect(estadoDeActividad(variosHace(30, 13, 12, 10, 9, 5, 3), AHORA).estado).toBe('bajo-ritmo'); // 4 anteriores, 2 esta (50 %)
    expect(estadoDeActividad(variosHace(30, 13, 12, 10, 9, 5, 4, 3), AHORA).estado).toBe('parecido'); // 4 anteriores, 3 esta
  });

  it('una semana sin ningún movimiento tras una semana movida también cuenta', () => {
    const r = estadoDeActividad(variosHace(30, 13, 12, 10, 9, 8), AHORA); // anterior: 5, esta: 0, el último fue hace 8 días
    expect(r).toMatchObject({ estado: 'bajo-ritmo', esta: 0, anterior: 5 });
  });

  it('si esta semana la actividad es igual o mayor, no hay nada que avisar (ya no existe «vas muy bien»)', () => {
    expect(estadoDeActividad(variosHace(30, 12, 11, 5, 4, 3, 2), AHORA).estado).toBe('parecido');
    expect(estadoDeActividad(variosHace(30, 13, 12, 10, 9, 6, 5, 3, 2), AHORA).estado).toBe('parecido');
  });

  it('las fechas futuras no cuentan', () => {
    const futuro = new Date(AHORA.getTime() + 2 * DIA);
    expect(estadoDeActividad([...variosHace(30, 25), futuro], AHORA).estado).toBe('recien-empieza');
  });
});

describe('mensajes del aviso', () => {
  it('«una semana más tranquila» dice los dos números y propone sin presionar', () => {
    const m = mensajeDeActividad({ estado: 'bajo-ritmo', esta: 2, anterior: 7, diasSinActividad: 1 });
    expect(m?.titulo).toBe('Esta semana fue más tranquila');
    expect(m?.texto).toContain('Hiciste 2 movimientos y la semana anterior 7.');
    expect(m?.texto).toContain('Cuando quieras');
  });

  it('concuerda en singular y cuando no hubo ninguno', () => {
    expect(mensajeDeActividad({ estado: 'bajo-ritmo', esta: 1, anterior: 4, diasSinActividad: 2 })?.texto).toContain('Hiciste 1 movimiento y');
    expect(mensajeDeActividad({ estado: 'bajo-ritmo', esta: 0, anterior: 4, diasSinActividad: 8 })?.texto).toContain(
      'Esta semana no registraste movimientos; la anterior hiciste 4.'
    );
  });

  it('«sin actividad» cuenta los días y propone retomar', () => {
    const m = mensajeDeActividad({ estado: 'sin-actividad', esta: 0, anterior: 0, diasSinActividad: 12 });
    expect(m?.titulo).toBe('¿Retomamos?');
    expect(m?.texto).toContain('Hace 12 días que no registrás actividad.');
    expect(m?.texto).toContain('Cuando quieras');
  });

  it('el tono es amable: ningún mensaje reprocha ni manda', () => {
    const textos = [
      mensajeDeActividad({ estado: 'bajo-ritmo', esta: 0, anterior: 6, diasSinActividad: 9 }),
      mensajeDeActividad({ estado: 'bajo-ritmo', esta: 2, anterior: 6, diasSinActividad: 1 }),
      mensajeDeActividad({ estado: 'sin-actividad', esta: 0, anterior: 0, diasSinActividad: 14 }),
    ].map((m) => `${m?.titulo} ${m?.texto}`);
    for (const t of textos) expect(t).not.toMatch(/deberías|tenés que|no hiciste|culpa|vagancia|abandon|falta de|bajó tu ritmo/i);
  });

  it('«recién empieza» y «ritmo parecido» no muestran ningún aviso', () => {
    expect(mensajeDeActividad({ estado: 'recien-empieza', esta: 0, anterior: 0, diasSinActividad: null })).toBeNull();
    expect(mensajeDeActividad({ estado: 'parecido', esta: 3, anterior: 4, diasSinActividad: 1 })).toBeNull();
  });
});

describe('cerrar el aviso', () => {
  it('no está cerrado hasta que se cierra', () => {
    expect(avisoCerrado('u1', 'bajo-ritmo', AHORA, almacenFalso())).toBe(false);
  });

  it('los dos avisos quedan cerrados 3 días y no hay más avisos que esos dos', () => {
    expect(OCULTAR_DIAS).toEqual({ 'bajo-ritmo': 3, 'sin-actividad': 3 });
    const almacen = almacenFalso();
    cerrarAviso('u1', 'bajo-ritmo', AHORA, almacen);
    const despues = (dias: number) => new Date(AHORA.getTime() + dias * DIA);
    expect(avisoCerrado('u1', 'bajo-ritmo', despues(2.9), almacen)).toBe(true);
    expect(avisoCerrado('u1', 'bajo-ritmo', despues(3.1), almacen)).toBe(false);
  });

  it('si el estado cambia, el aviso vuelve a aparecer (por ejemplo de «más tranquila» a «sin actividad»)', () => {
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

describe('avisoVisible: qué se le muestra a la persona', () => {
  const sinActividad = estadoDeActividad(variosHace(30, 25, 20, 12), AHORA);
  const masTranquila = estadoDeActividad(variosHace(30, 13, 12, 10, 9, 5, 2), AHORA);
  const parecido = estadoDeActividad(variosHace(30, 13, 12, 10, 9, 5, 4, 3), AHORA);

  it('muestra el aviso del estado con su mensaje', () => {
    expect(avisoVisible(sinActividad, 'u1', AHORA, almacenFalso())).toMatchObject({ estado: 'sin-actividad', mensaje: { titulo: '¿Retomamos?' } });
    expect(avisoVisible(masTranquila, 'u1', AHORA, almacenFalso())?.estado).toBe('bajo-ritmo');
  });

  it('no muestra nada si el ritmo es parecido, si recién empieza o si todavía no se calculó', () => {
    expect(avisoVisible(parecido, 'u1', AHORA, almacenFalso())).toBeNull();
    expect(avisoVisible(estadoDeActividad([], AHORA), 'u1', AHORA, almacenFalso())).toBeNull();
    expect(avisoVisible(null, 'u1', AHORA, almacenFalso())).toBeNull();
  });

  it('no muestra un aviso que la persona cerró hace menos de 3 días', () => {
    const almacen = almacenFalso();
    cerrarAviso('u1', 'sin-actividad', AHORA, almacen);
    expect(avisoVisible(sinActividad, 'u1', AHORA, almacen)).toBeNull();
    expect(avisoVisible(sinActividad, 'u1', new Date(AHORA.getTime() + 4 * DIA), almacen)).not.toBeNull();
  });
});
