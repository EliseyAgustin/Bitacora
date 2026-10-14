import { describe, expect, it } from 'vitest';
import { MENSAJE_MAX, validarMensaje } from '@/lib/mensajes';
import { armarMensaje, hayCamposSinCompletar, PLANTILLAS_MENSAJE, primerNombre, primerCampoPendiente } from '@/lib/plantillasMensaje';

describe('primerNombre', () => {
  it('toma la primera palabra del nombre', () => {
    expect(primerNombre('Camila Ejemplo')).toBe('Camila');
    expect(primerNombre('  Tomás   Ejemplo Pérez ')).toBe('Tomás');
  });
  it('sin nombre (o con el texto "Sin nombre") devuelve vacío', () => {
    expect(primerNombre(null)).toBe('');
    expect(primerNombre('')).toBe('');
    expect(primerNombre('   ')).toBe('');
    expect(primerNombre('Sin nombre')).toBe('');
  });
});

describe('PLANTILLAS_MENSAJE', () => {
  it('tiene al menos tres plantillas, con ids y títulos únicos', () => {
    expect(PLANTILLAS_MENSAJE.length).toBeGreaterThanOrEqual(3);
    expect(new Set(PLANTILLAS_MENSAJE.map((p) => p.id)).size).toBe(PLANTILLAS_MENSAJE.length);
    expect(new Set(PLANTILLAS_MENSAJE.map((p) => p.titulo)).size).toBe(PLANTILLAS_MENSAJE.length);
  });

  it('incluye "Solicitud recibida" y "Falta un dato", los dos casos que pidió la docente', () => {
    const titulos = PLANTILLAS_MENSAJE.map((p) => p.titulo);
    expect(titulos).toContain('Solicitud recibida');
    expect(titulos).toContain('Falta un dato');
    const recibida = PLANTILLAS_MENSAJE.find((p) => p.titulo === 'Solicitud recibida')!;
    expect(armarMensaje(recibida, 'Camila Ejemplo')).toContain('vamos a tener en cuenta tu solicitud');
  });

  it('todas producen un mensaje que pasa la validación de largo, con y sin nombre', () => {
    for (const p of PLANTILLAS_MENSAJE) {
      for (const nombre of ['Camila Ejemplo', null]) {
        const texto = armarMensaje(p, nombre);
        expect(validarMensaje(texto), `${p.titulo} (${nombre})`).toBeNull();
        expect(texto.length).toBeLessThanOrEqual(MENSAJE_MAX);
      }
    }
  });

  it('saludan por el primer nombre y, sin nombre, saludan sin él', () => {
    for (const p of PLANTILLAS_MENSAJE) {
      expect(armarMensaje(p, 'Camila Ejemplo').startsWith('Hola Camila,'), p.titulo).toBe(true);
      expect(armarMensaje(p, null).startsWith('Hola,'), p.titulo).toBe(true);
      expect(armarMensaje(p, 'Sin nombre').startsWith('Hola,'), p.titulo).toBe(true);
    }
  });

  it('no usan el género de la persona (sin formas como "bienvenido/a")', () => {
    for (const p of PLANTILLAS_MENSAJE) {
      const texto = armarMensaje(p, 'Camila');
      expect(texto, p.titulo).not.toMatch(/\w[oa]\/[oa]\b/);
      expect(texto, p.titulo).not.toMatch(/bienvenid[oa]/i);
    }
  });
});

describe('campos sin completar', () => {
  it('detecta lo que quedó entre corchetes', () => {
    expect(hayCamposSinCompletar('Hola, nos falta [indicá el dato].')).toBe(true);
    expect(hayCamposSinCompletar('Hola [a] y [b]')).toBe(true);
  });
  it('no se queja de un mensaje sin corchetes ni de corchetes vacíos o sueltos', () => {
    expect(hayCamposSinCompletar('Hola, todo en orden.')).toBe(false);
    expect(hayCamposSinCompletar('Mirá esto [] ahora')).toBe(false);
    expect(hayCamposSinCompletar('Un corchete suelto ] o [ así')).toBe(false);
  });
  it('las plantillas de "Solicitud recibida" y similares no dejan corchetes; "Falta un dato" sí, para que se complete', () => {
    const falta = PLANTILLAS_MENSAJE.find((p) => p.titulo === 'Falta un dato')!;
    expect(hayCamposSinCompletar(armarMensaje(falta, 'Camila'))).toBe(true);
    const recibida = PLANTILLAS_MENSAJE.find((p) => p.titulo === 'Solicitud recibida')!;
    expect(hayCamposSinCompletar(armarMensaje(recibida, 'Camila'))).toBe(false);
  });
  it('primerCampoPendiente da la posición para seleccionarlo y poder escribir encima', () => {
    const texto = 'Hola, falta [tu ciudad] y [tu país].';
    expect(primerCampoPendiente(texto)).toEqual({ inicio: 12, fin: 23 });
    expect(texto.slice(12, 23)).toBe('[tu ciudad]');
    expect(primerCampoPendiente('Sin campos')).toBeNull();
  });
});
