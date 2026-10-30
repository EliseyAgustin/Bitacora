import { describe, expect, it } from 'vitest';
import { ETAPAS_EJEMPLO, ETIQUETAS_STACK_EJEMPLO, calcularEjemploPuntaje } from '@/lib/capitulos';

describe('puntaje de ejemplo de la página de inicio', () => {
  it('con React y TypeScript marcados suma lo mismo que la maqueta aprobada: 45 de 75', () => {
    const r = calcularEjemploPuntaje(new Set(['React', 'TypeScript']));
    expect(r.puntaje).toBe(45);
    expect(r.maximo).toBe(75);
    expect(r.banda).toBe('medio');
  });

  it('usa el motor de scoring real: cada tecnología que pide la oferta suma 15, y las que no pide no suman', () => {
    expect(calcularEjemploPuntaje(new Set(ETIQUETAS_STACK_EJEMPLO)).puntaje).toBe(60); // React, TypeScript y Node.js (45) + remoto (10) + ubicación (5)
    expect(calcularEjemploPuntaje(new Set(['PostgreSQL'])).puntaje).toBe(15); // la oferta no lo pide: solo suman remoto y ubicación
    expect(calcularEjemploPuntaje(new Set()).puntaje).toBe(15);
  });

  it('el desglose lista todos los criterios y marca cuáles coinciden', () => {
    const r = calcularEjemploPuntaje(new Set(['React']));
    expect(r.filas.map((f) => f.nombre)).toEqual([
      'Stack: React',
      'Stack: TypeScript',
      'Stack: Node.js',
      'Stack: PostgreSQL',
      'Modalidad: Remoto',
      'Ubicación: Buenos Aires, Argentina',
    ]);
    expect(r.filas.filter((f) => f.coincide).map((f) => f.nombre)).toEqual(['Stack: React', 'Modalidad: Remoto', 'Ubicación: Buenos Aires, Argentina']);
  });

  it('la banda sigue los mismos cortes que la app: 75 % o más alto, 50 % o más medio, el resto bajo', () => {
    expect(calcularEjemploPuntaje(new Set(['React', 'TypeScript', 'Node.js'])).banda).toBe('alto'); // 60 de 75 = 80 %
    expect(calcularEjemploPuntaje(new Set(['React'])).banda).toBe('bajo'); // 30 de 75 = 40 %
  });
});

describe('etapas de ejemplo', () => {
  it('son las cuatro primeras etapas reales, con una frase corta y una explicación cada una', () => {
    expect(ETAPAS_EJEMPLO.map((e) => e.nombre)).toEqual(['Por aplicar', 'Aplicado', 'En proceso', 'Entrevista']);
    for (const etapa of ETAPAS_EJEMPLO) {
      expect(etapa.clausula.length).toBeGreaterThan(10);
      expect(etapa.clausula.length).toBeLessThanOrEqual(32); // entra en dos líneas de un titular grande
      expect(etapa.explicacion.length).toBeGreaterThan(20);
    }
  });
});
