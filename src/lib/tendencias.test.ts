import { describe, expect, it } from 'vitest';
import { contarPorSemana, promedioPorSemana, textoDeTendencia, tendenciaDe } from './tendencias';

const AHORA = new Date('2026-10-29T12:00:00Z');
const hace = (dias: number) => new Date(AHORA.getTime() - dias * 86400000);

describe('contarPorSemana', () => {
  it('separa los últimos 7 días de los 7 anteriores e ignora lo más viejo y lo futuro', () => {
    const r = contarPorSemana([hace(1), hace(6.9), hace(8), hace(13), hace(14.5), hace(-2)], AHORA);
    expect(r).toEqual({ esta: 2, anterior: 2 });
  });
  it('sin fechas da 0 y 0', () => {
    expect(contarPorSemana([], AHORA)).toEqual({ esta: 0, anterior: 0 });
  });
});

describe('promedioPorSemana', () => {
  it('promedia los valores de esta semana contra todo lo anterior y salta los vacíos', () => {
    const r = promedioPorSemana(
      [
        { fecha: hace(1), valor: 20 },
        { fecha: hace(2), valor: 10 },
        { fecha: hace(10), valor: 5 },
        { fecha: hace(30), valor: 15 },
        { fecha: hace(3), valor: null },
      ],
      AHORA
    );
    expect(r).toEqual({ esta: 15, anterior: 10 });
  });
  it('devuelve null en el lado que no tiene datos', () => {
    expect(promedioPorSemana([{ fecha: hace(1), valor: 4 }], AHORA)).toEqual({ esta: 4, anterior: null });
  });
});

describe('tendenciaDe', () => {
  it('no muestra tendencia si no hay nada en ninguna de las dos semanas', () => {
    expect(tendenciaDe(0, 0)).toBeNull();
  });
  it('sube, baja o queda igual', () => {
    expect(tendenciaDe(5, 3)).toEqual({ delta: 2, sentido: 'sube' });
    expect(tendenciaDe(1, 4)).toEqual({ delta: -3, sentido: 'baja' });
    expect(tendenciaDe(2, 2)).toEqual({ delta: 0, sentido: 'igual' });
  });
  it('sin dato de un lado no hay tendencia', () => {
    expect(tendenciaDe(null, 3)).toBeNull();
    expect(tendenciaDe(3, null)).toBeNull();
  });
});

describe('textoDeTendencia', () => {
  it('lleva signo y la referencia a la semana anterior', () => {
    expect(textoDeTendencia({ delta: 2, sentido: 'sube' })).toBe('+2 vs. la semana anterior');
    expect(textoDeTendencia({ delta: -3, sentido: 'baja' })).toBe('−3 vs. la semana anterior');
    expect(textoDeTendencia({ delta: 0, sentido: 'igual' })).toBe('Igual que la semana anterior');
  });
  it('redondea los decimales a uno', () => {
    expect(textoDeTendencia({ delta: 1.26, sentido: 'sube' })).toBe('+1,3 vs. la semana anterior');
  });
});

describe('calcularTendencias', () => {
  const iso = (d: Date) => d.toISOString();
  const base = {
    postulaciones: [
      { id: 'a', created_at: iso(hace(1)) },
      { id: 'b', created_at: iso(hace(2)) },
      { id: 'c', created_at: iso(hace(9)) },
    ],
    historial: [
      { estado_anterior: null, estado_nuevo: 'por_aplicar', es_estimado: false, fecha: iso(hace(1)) }, // creación: no cuenta
      { estado_anterior: 'aplicado', estado_nuevo: 'en_proceso', es_estimado: false, fecha: iso(hace(2)) },
      { estado_anterior: 'por_aplicar', estado_nuevo: 'aplicado', es_estimado: false, fecha: iso(hace(2)) }, // no es respuesta
      { estado_anterior: 'aplicado', estado_nuevo: 'rechazado', es_estimado: true, fecha: iso(hace(3)) }, // reconstruida: no cuenta
      { estado_anterior: 'en_proceso', estado_nuevo: 'entrevista', es_estimado: false, fecha: iso(hace(10)) },
    ],
    ofertas: [
      { created_at: iso(hace(1)), puntaje_scoring: 20 },
      { created_at: iso(hace(20)), puntaje_scoring: 10 },
    ],
    interacciones: [
      { postulacion_id: 'a', fecha: iso(hace(1)) },
      { postulacion_id: 'a', fecha: iso(hace(2)) },
      { postulacion_id: 'b', fecha: iso(hace(9)) },
    ],
    abiertas: ['a', 'b'],
  };

  it('arma la tendencia de cada tarjeta con las mismas definiciones', async () => {
    const { calcularTendencias } = await import('./tendencias');
    const t = calcularTendencias(base, AHORA);
    expect(t.enCurso).toEqual({ delta: 1, sentido: 'sube' }); // 2 nuevas contra 1
    expect(t.respuestas).toEqual({ delta: 0, sentido: 'igual' }); // 1 respuesta real contra 1
    expect(t.encaje).toEqual({ delta: 10, sentido: 'sube' }); // 20 contra 10
    expect(t.movimiento).toEqual({ delta: 0, sentido: 'igual' }); // a esta semana, b la anterior
  });
  it('sin datos no hay ninguna tendencia', async () => {
    const { calcularTendencias } = await import('./tendencias');
    const t = calcularTendencias({ postulaciones: [], historial: [], ofertas: [], interacciones: [], abiertas: [] }, AHORA);
    expect(t).toEqual({ enCurso: null, respuestas: null, encaje: null, movimiento: null });
  });
});
