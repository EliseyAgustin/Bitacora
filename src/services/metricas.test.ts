import { describe, expect, it } from 'vitest';
import {
  actividadReciente,
  diasAplicadoAPrimeraEntrevista,
  distribucionScore,
  embudo,
  interaccionesPorSemana,
  ofertasCargadas,
  ofertasPorFuente,
  recordatoriosResumen,
  resumenPostulaciones,
  tasaDeRespuesta,
} from '@/services/metricas';
import type { TipoInteraccion } from '@/types/interaccion';
import type { EstadoPostulacion } from '@/types/postulacion';

const AHORA = new Date('2026-09-25T12:00:00Z');
const DIA = 24 * 60 * 60 * 1000;

function haceDias(dias: number) {
  return new Date(AHORA.getTime() - dias * DIA).toISOString();
}

function p(id: string, estado: EstadoPostulacion, fecha_postulacion: string | null = null) {
  return { id, estado, fecha_postulacion };
}

function inter(postulacion_id: string, tipo: TipoInteraccion, fecha: string) {
  return { postulacion_id, tipo, fecha };
}

describe('resumenPostulaciones', () => {
  it('cuenta las activas (sin oferta ni rechazado) y el desglose por estado con ceros', () => {
    const r = resumenPostulaciones([
      p('1', 'por_aplicar'),
      p('2', 'aplicado'),
      p('3', 'aplicado'),
      p('4', 'oferta'),
      p('5', 'rechazado'),
    ]);
    expect(r.activas).toBe(3);
    expect(r.porEstado).toEqual({
      por_aplicar: 1,
      aplicado: 2,
      en_proceso: 0,
      entrevista: 0,
      oferta: 1,
      rechazado: 1,
    });
  });
});

describe('tasaDeRespuesta', () => {
  it('respondidas (en proceso, entrevista, oferta, rechazado) sobre las que salieron de por aplicar', () => {
    const r = tasaDeRespuesta([
      p('1', 'por_aplicar'),
      p('2', 'por_aplicar'),
      p('3', 'aplicado'),
      p('4', 'en_proceso'),
      p('5', 'entrevista'),
      p('6', 'rechazado'),
    ]);
    expect(r).toEqual({ respondidas: 3, aplicadas: 4, tasa: 0.75 });
  });

  it('devuelve tasa null si ninguna salió de por aplicar', () => {
    expect(tasaDeRespuesta([p('1', 'por_aplicar')]).tasa).toBeNull();
    expect(tasaDeRespuesta([]).tasa).toBeNull();
  });
});

describe('embudo', () => {
  const postulaciones = [
    p('1', 'por_aplicar'),
    p('2', 'aplicado'),
    p('3', 'entrevista'),
    p('4', 'oferta'),
    p('5', 'rechazado'),
  ];

  it('cuenta cuántas postulaciones alcanzaron al menos cada etapa, según su estado actual', () => {
    const r = embudo(postulaciones, []);
    expect(r.etapas.map((e) => [e.estado, e.alcanzadas])).toEqual([
      ['por_aplicar', 5],
      ['aplicado', 4],
      ['en_proceso', 2],
      ['entrevista', 2],
      ['oferta', 1],
    ]);
    expect(r.rechazadas).toBe(1);
  });

  it('calcula la conversión de cada etapa respecto de la anterior', () => {
    const r = embudo(postulaciones, []);
    expect(r.etapas.map((e) => e.conversionDesdeAnterior)).toEqual([null, 0.8, 0.5, 1, 0.5]);
  });

  it('usa el historial: una rechazada que pasó por entrevista cuenta como que llegó a entrevista', () => {
    const r = embudo(postulaciones, [{ postulacion_id: '5', estado_nuevo: 'entrevista' }]);
    const entrevista = r.etapas.find((e) => e.estado === 'entrevista');
    expect(entrevista?.alcanzadas).toBe(3);
  });

  it('devuelve conversión null cuando la etapa anterior no tiene postulaciones', () => {
    const r = embudo([p('1', 'por_aplicar')], []);
    expect(r.etapas.map((e) => e.conversionDesdeAnterior)).toEqual([null, 0, null, null, null]);
  });
});

describe('ofertasCargadas', () => {
  it('cuenta el total y compara los últimos 7 días contra los 7 anteriores', () => {
    const r = ofertasCargadas(
      [
        { created_at: haceDias(1) },
        { created_at: haceDias(6) },
        { created_at: haceDias(8) },
        { created_at: haceDias(13) },
        { created_at: haceDias(30) },
      ],
      AHORA
    );
    expect(r).toEqual({ total: 5, ultimos7: 2, previos7: 2 });
  });
});

describe('distribucionScore', () => {
  const criterios = [
    { peso: 20, activo: true },
    { peso: 30, activo: true },
    { peso: 99, activo: false },
  ];

  it('toma como máximo la suma de los pesos activos y reparte en franjas relativas', () => {
    const r = distribucionScore(
      [
        { puntaje_scoring: 45 },
        { puntaje_scoring: 25 },
        { puntaje_scoring: 24 },
        { puntaje_scoring: 0 },
        { puntaje_scoring: null },
      ],
      criterios
    );
    expect(r.maximo).toBe(50);
    expect(r.bandas).toEqual({ alto: 1, medio: 1, bajo: 2, sinScore: 1 });
  });

  it('los bordes 75% y 50% del máximo caen en la franja superior', () => {
    const r = distribucionScore([{ puntaje_scoring: 37.5 }, { puntaje_scoring: 25 }], criterios);
    expect(r.bandas).toEqual({ alto: 1, medio: 1, bajo: 0, sinScore: 0 });
  });

  it('calcula el promedio ignorando las ofertas sin score, en absoluto y como % del máximo', () => {
    const r = distribucionScore(
      [{ puntaje_scoring: 45 }, { puntaje_scoring: 25 }, { puntaje_scoring: 24 }, { puntaje_scoring: 0 }, { puntaje_scoring: null }],
      criterios
    );
    expect(r.promedio).toBe(23.5);
    expect(r.promedioPct).toBeCloseTo(0.47);
  });

  it('sin criterios activos no hay franjas y el promedio en % es null', () => {
    const r = distribucionScore([{ puntaje_scoring: 10 }], [{ peso: 5, activo: false }]);
    expect(r.maximo).toBe(0);
    expect(r.bandas).toBeNull();
    expect(r.promedio).toBe(10);
    expect(r.promedioPct).toBeNull();
  });

  it('sin ofertas con score el promedio es null', () => {
    expect(distribucionScore([{ puntaje_scoring: null }], criterios).promedio).toBeNull();
    expect(distribucionScore([], criterios).promedio).toBeNull();
  });
});

describe('ofertasPorFuente', () => {
  it('cuenta las fuentes reales, incluye sin fuente en Carga manual y agrega Otras solo si hay', () => {
    const r = ofertasPorFuente([
      { fuente: 'Remotive' },
      { fuente: 'Arbeitnow' },
      { fuente: 'Arbeitnow' },
      { fuente: 'RemoteOK' },
      { fuente: null },
      { fuente: 'Carga manual' },
      { fuente: 'LinkedIn' },
    ]);
    expect(r).toEqual([
      { fuente: 'Remotive', cantidad: 1 },
      { fuente: 'Arbeitnow', cantidad: 2 },
      { fuente: 'RemoteOK', cantidad: 1 },
      { fuente: 'Carga manual', cantidad: 2 },
      { fuente: 'Otras', cantidad: 1 },
    ]);
  });

  it('omite Otras cuando no hay ninguna', () => {
    const r = ofertasPorFuente([{ fuente: 'Remotive' }]);
    expect(r.map((x) => x.fuente)).toEqual(['Remotive', 'Arbeitnow', 'RemoteOK', 'Carga manual']);
  });
});

describe('interaccionesPorSemana', () => {
  it('arma 8 ventanas de 7 días terminando ahora, de la más vieja a la más nueva', () => {
    const r = interaccionesPorSemana([], AHORA);
    expect(r).toHaveLength(8);
    expect(r[7].inicio.getTime()).toBe(AHORA.getTime() - 7 * DIA);
    expect(r[0].inicio.getTime()).toBe(AHORA.getTime() - 56 * DIA);
  });

  it('ubica cada interacción en su ventana y separa por tipo', () => {
    const r = interaccionesPorSemana(
      [
        inter('1', 'mail', haceDias(1)),
        inter('1', 'mail', haceDias(2)),
        inter('1', 'llamada', haceDias(3)),
        inter('2', 'entrevista', haceDias(8)),
      ],
      AHORA
    );
    expect(r[7]).toMatchObject({ mail: 2, llamada: 1, entrevista: 0, nota: 0 });
    expect(r[6]).toMatchObject({ mail: 0, llamada: 0, entrevista: 1, nota: 0 });
  });

  it('ignora interacciones fuera de las 8 semanas o con fecha futura', () => {
    const r = interaccionesPorSemana(
      [inter('1', 'nota', haceDias(60)), inter('1', 'nota', new Date(AHORA.getTime() + DIA).toISOString())],
      AHORA
    );
    expect(r.every((s) => s.mail + s.llamada + s.entrevista + s.nota === 0)).toBe(true);
  });
});

describe('recordatoriosResumen', () => {
  it('cuenta activos (sin los de postulaciones en estado final) y resueltos', () => {
    const r = recordatoriosResumen(
      [
        { postulacion_id: '1', estado: 'activo' },
        { postulacion_id: '2', estado: 'activo' },
        { postulacion_id: '1', estado: 'resuelto' },
      ],
      [p('1', 'aplicado'), p('2', 'rechazado')]
    );
    expect(r).toEqual({ activos: 1, resueltos: 1 });
  });
});

describe('diasAplicadoAPrimeraEntrevista', () => {
  const entrevistaEl = (postulacion_id: string, anio: number, mes: number, dia: number) =>
    inter(postulacion_id, 'entrevista', new Date(anio, mes - 1, dia, 15, 0).toISOString());

  it('promedia los días entre fecha_postulacion y la primera entrevista posterior', () => {
    const r = diasAplicadoAPrimeraEntrevista(
      [p('1', 'entrevista', '2026-09-10'), p('2', 'en_proceso', '2026-09-01')],
      [entrevistaEl('1', 2026, 9, 20), entrevistaEl('1', 2026, 9, 15), entrevistaEl('2', 2026, 9, 4)]
    );
    expect(r).toEqual({ promedio: 4, n: 2 });
  });

  it('excluye postulaciones sin fecha, sin entrevista o con entrevista anterior a la fecha', () => {
    const r = diasAplicadoAPrimeraEntrevista(
      [p('1', 'aplicado', null), p('2', 'aplicado', '2026-09-01'), p('3', 'aplicado', '2026-09-10')],
      [entrevistaEl('1', 2026, 9, 12), entrevistaEl('3', 2026, 9, 5)]
    );
    expect(r).toEqual({ promedio: null, n: 0 });
  });

  it('ignora interacciones que no son de tipo entrevista', () => {
    const r = diasAplicadoAPrimeraEntrevista(
      [p('1', 'aplicado', '2026-09-10')],
      [inter('1', 'mail', new Date(2026, 8, 12, 15, 0).toISOString())]
    );
    expect(r.n).toBe(0);
  });
});

describe('actividadReciente', () => {
  it('mide qué % de las postulaciones activas tuvo alguna interacción en los últimos 7 días', () => {
    const r = actividadReciente(
      [p('1', 'aplicado'), p('2', 'en_proceso'), p('3', 'por_aplicar'), p('4', 'rechazado')],
      [inter('1', 'mail', haceDias(3)), inter('2', 'mail', haceDias(10)), inter('4', 'mail', haceDias(1))],
      AHORA
    );
    expect(r.activas).toBe(3);
    expect(r.conActividad).toBe(1);
    expect(r.porcentaje).toBeCloseTo(1 / 3);
  });

  it('devuelve porcentaje null si no hay postulaciones activas', () => {
    expect(actividadReciente([p('1', 'oferta')], [], AHORA).porcentaje).toBeNull();
  });
});
