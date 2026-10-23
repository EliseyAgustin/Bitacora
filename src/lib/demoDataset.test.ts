import { describe, expect, it } from 'vitest';
// El script de la demostración (npm run demo:datos) arma los datos de la cuenta DEMO con esta función pura.
import { construirDataset } from '../../docs/scripts/demo-dataset.mjs';
import { claveDedupeOferta, FUENTES_OFERTA } from '@/lib/fuentes';
import { urlSegura } from '@/lib/ofertaDetalle';
import { armarMensaje, PLANTILLAS_MENSAJE } from '@/lib/plantillasMensaje';
import { calcularMetricas } from '@/services/metricas';
import { calcularRecordatoriosPendientes } from '@/services/recordatorios';
import { calcularScoring } from '@/services/scoring';
import type { CriterioScoring } from '@/types/criterioScoring';
import type { EstadoPostulacion } from '@/types/postulacion';

const AHORA = new Date('2026-10-23T15:00:00Z');
const DIA_MS = 24 * 60 * 60 * 1000;
const dataset = construirDataset(AHORA);

const criterios = dataset.criterios.map((c, i) => ({
  ...c,
  id: String(i),
  user_id: 'demo',
  created_at: AHORA.toISOString(),
  updated_at: AHORA.toISOString(),
})) as CriterioScoring[];

const postulaciones = dataset.postulaciones.map((p, i) => ({
  id: String(i),
  estado: p.estado as EstadoPostulacion,
  fecha_postulacion: p.fecha_postulacion as string | null,
  created_at: p.created_at as string,
}));
const interacciones = dataset.postulaciones.flatMap((p, i) =>
  p.interacciones.map((x) => ({ postulacion_id: String(i), tipo: x.tipo, fecha: x.fecha }))
);
const recordatorios = dataset.recordatorios.map((r) => ({
  postulacion_id: String(r.postulacion),
  estado: r.estado,
  fecha_resuelto: (r.fecha_resuelto ?? null) as string | null,
}));
// El historial lo escribe un trigger de la base a partir de cada cambio de estado: acá se simula el mismo recorrido.
const historial = dataset.postulaciones.flatMap((p, i) =>
  ['por_aplicar', ...p.recorrido].map((estado) => ({ postulacion_id: String(i), estado_nuevo: estado as EstadoPostulacion }))
);

describe('datos de la cuenta DEMO', () => {
  it('el puntaje de cada oferta es el que calcula el motor de scoring de la aplicación', () => {
    for (const oferta of dataset.ofertas) {
      expect(oferta.puntaje_scoring, `${oferta.empresa} - ${oferta.rol}`).toBe(calcularScoring(oferta, criterios));
    }
  });

  it('muestra todos los casos: seis estados, cuatro tipos de interacción, tres modalidades y todas las fuentes', () => {
    expect(new Set(dataset.postulaciones.map((p) => p.estado))).toEqual(
      new Set(['por_aplicar', 'aplicado', 'en_proceso', 'entrevista', 'oferta', 'rechazado'])
    );
    expect(new Set(interacciones.map((i) => i.tipo))).toEqual(new Set(['mail', 'llamada', 'entrevista', 'nota']));
    expect(new Set(dataset.ofertas.map((o) => o.modalidad))).toEqual(new Set(['remoto', 'hibrido', 'presencial']));
    expect(new Set(dataset.ofertas.map((o) => o.fuente))).toEqual(new Set(FUENTES_OFERTA));
    expect(dataset.ofertas.length).toBeGreaterThanOrEqual(30);
    expect(criterios.some((c) => !c.activo)).toBe(true);
  });

  it('las ofertas traen enlace y descripción seguros, y alguna carga manual no tiene enlace', () => {
    for (const o of dataset.ofertas) {
      if (o.url !== null) expect(urlSegura(o.url), o.url).toBe(o.url);
      expect(o.descripcion.length).toBeGreaterThan(40);
      expect(o.descripcion.length).toBeLessThanOrEqual(5000);
      expect(o.descripcion).not.toMatch(/<\/?[a-z]/i);
    }
    expect(dataset.ofertas.filter((o) => o.url === null).length).toBeGreaterThan(0);
    expect(dataset.ofertas.filter((o) => o.url !== null).length).toBeGreaterThan(20);
    expect(dataset.ofertas.filter((o) => o.fuente !== 'Carga manual').every((o) => o.url !== null)).toBe(true);
  });

  it('no repite ofertas (la importación las descartaría por la misma clave)', () => {
    const claves = dataset.ofertas.map(claveDedupeOferta);
    expect(new Set(claves).size).toBe(claves.length);
  });

  it('cada postulación apunta a una oferta distinta y la recorrió en orden hasta su estado actual', () => {
    const ofertas = dataset.postulaciones.map((p) => p.oferta);
    expect(new Set(ofertas).size).toBe(ofertas.length);
    for (const p of dataset.postulaciones) {
      expect(dataset.ofertas[p.oferta]).toBeDefined();
      expect(p.recorrido.at(-1) ?? 'por_aplicar').toBe(p.estado);
    }
  });

  it('todas las fechas son pasadas, de las últimas 8 semanas, y nada ocurre antes de crearse la postulación', () => {
    const limite = AHORA.getTime() - 60 * DIA_MS;
    const fechas = [
      ...dataset.ofertas.map((o) => o.created_at),
      ...postulaciones.map((p) => p.created_at),
      ...interacciones.map((i) => i.fecha),
      ...dataset.mensajes.map((m) => m.created_at),
    ];
    for (const f of fechas) {
      expect(new Date(f).getTime()).toBeLessThanOrEqual(AHORA.getTime());
      expect(new Date(f).getTime()).toBeGreaterThanOrEqual(limite);
    }
    for (const x of interacciones) {
      const creada = postulaciones[Number(x.postulacion_id)].created_at;
      expect(new Date(x.fecha).getTime()).toBeGreaterThanOrEqual(new Date(creada).getTime());
    }
    for (const p of dataset.postulaciones) {
      expect(new Date(dataset.ofertas[p.oferta].created_at).getTime()).toBeLessThanOrEqual(new Date(p.created_at).getTime());
    }
  });

  it('los avisos de seguimiento ya están cargados: abrir Mis postulaciones no genera ninguno más', () => {
    const nuevos = calcularRecordatoriosPendientes({
      postulaciones,
      interacciones,
      recordatorios,
      ahora: AHORA,
      dias: dataset.perfil.dias_inactividad_recordatorio,
    });
    expect(nuevos).toEqual([]);
    expect(dataset.recordatorios.filter((r) => r.estado === 'activo')).toHaveLength(2);
    expect(dataset.recordatorios.filter((r) => r.estado === 'resuelto')).toHaveLength(2);
  });

  it('Mi progreso queda con datos en todas sus secciones', () => {
    const m = calcularMetricas(
      {
        ofertas: dataset.ofertas.map((o) => ({ created_at: o.created_at, fuente: o.fuente, puntaje_scoring: o.puntaje_scoring })),
        postulaciones,
        interacciones,
        recordatorios,
        historial,
        criterios,
      },
      AHORA
    );

    expect(m.tasaRespuesta.tasa).toBeGreaterThan(0);
    expect(m.embudo.rechazadas).toBeGreaterThanOrEqual(3);
    const alcanzadas = m.embudo.etapas.map((e) => e.alcanzadas);
    expect(alcanzadas.every((n) => n > 0)).toBe(true);
    expect([...alcanzadas].sort((a, b) => b - a)).toEqual(alcanzadas);
    expect(m.ofertas.ultimos7).toBeGreaterThan(0);
    expect(m.ofertas.previos7).toBeGreaterThan(0);
    expect(m.score.bandas?.alto).toBeGreaterThan(0);
    expect(m.score.bandas?.medio).toBeGreaterThan(0);
    expect(m.score.bandas?.bajo).toBeGreaterThan(0);
    expect(m.fuentes.every((f) => f.cantidad > 0)).toBe(true);
    expect(m.semanas.filter((s) => s.mail + s.llamada + s.entrevista + s.nota > 0).length).toBeGreaterThanOrEqual(7);
    expect(m.recordatorios).toEqual({ activos: 2, resueltos: 2 });
    expect(m.diasHastaEntrevista.n).toBeGreaterThanOrEqual(3);
    expect(m.actividad.conActividad).toBeGreaterThan(0);
  });

  it('hay mensajes del administrador, leídos y sin leer, escritos con las plantillas', () => {
    expect(dataset.mensajes.length).toBeGreaterThanOrEqual(3);
    expect(dataset.mensajes.some((m) => m.leido)).toBe(true);
    expect(dataset.mensajes.some((m) => !m.leido)).toBe(true);
    const textosValidos = PLANTILLAS_MENSAJE.map((p) => armarMensaje(p, dataset.perfil.nombre));
    for (const m of dataset.mensajes) {
      expect(textosValidos).toContain(m.texto);
      expect(m.texto).not.toMatch(/\[[^\]]+\]/);
    }
  });

  it('el perfil es completo y se registró hace tiempo', () => {
    expect(dataset.perfil.onboarding_completado).toBe(true);
    expect(dataset.perfil.stack_interes.length).toBeGreaterThanOrEqual(3);
    expect(new Date(dataset.perfil.registrado_el).getTime()).toBeLessThan(AHORA.getTime() - 50 * DIA_MS);
  });
});
