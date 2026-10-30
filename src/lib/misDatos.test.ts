import { describe, expect, it } from 'vitest';
import { armarExportacion, nombreDeArchivo } from './misDatos';

const AHORA = new Date('2026-10-30T14:05:00Z');
const base = {
  usuario: { email: 'ana@ejemplo.com', nombre: 'Ana', creado: '2026-09-01T10:00:00Z' },
  perfil: { rol_buscado: 'Frontend', stack_interes: ['React'] },
  criterios: [{ nombre: 'React', peso: 15 }],
  ofertas: [{ id: 'o1', empresa: 'Acme', rol: 'Dev', user_id: 'u1' }],
  postulaciones: [{ id: 'p1', oferta_id: 'o1', estado: 'aplicado', user_id: 'u1' }],
  interacciones: [{ id: 'i1', postulacion_id: 'p1', tipo: 'mail', user_id: 'u1' }],
  historial: [{ id: 'h1', postulacion_id: 'p1', estado_nuevo: 'aplicado', user_id: 'u1' }],
  mensajes: [{ id: 'm1', texto: 'Hola', tipo: 'bienvenida', remitente_id: null, destinatario_id: 'u1' }],
};

describe('armarExportacion', () => {
  it('incluye todo lo que la persona tiene, con fecha de exportación y una versión del formato', () => {
    const r = armarExportacion(base, AHORA);
    expect(r.exportado_el).toBe('2026-10-30T14:05:00.000Z');
    expect(r.version).toBe(1);
    expect(r.cuenta).toEqual({ email: 'ana@ejemplo.com', nombre: 'Ana', registrada_el: '2026-09-01T10:00:00Z' });
    expect(r.ofertas).toHaveLength(1);
    expect(r.postulaciones).toHaveLength(1);
    expect(r.interacciones).toHaveLength(1);
    expect(r.historial_de_estados).toHaveLength(1);
    expect(r.mensajes).toHaveLength(1);
    expect(r.criterios_de_puntaje).toHaveLength(1);
    expect(r.perfil_de_busqueda).toEqual(base.perfil);
  });
  it('no repite identificadores internos de la cuenta en cada fila', () => {
    const texto = JSON.stringify(armarExportacion(base, AHORA));
    expect(texto).not.toContain('"user_id"');
    expect(texto).not.toContain('"destinatario_id"');
  });
  it('tampoco en el perfil de búsqueda', () => {
    const r = armarExportacion({ ...base, perfil: { id: 'x', user_id: 'u1', rol_buscado: 'Frontend' } }, AHORA);
    expect(r.perfil_de_busqueda).toEqual({ id: 'x', rol_buscado: 'Frontend' });
  });
  it('sin perfil ni datos devuelve listas vacías y perfil null', () => {
    const r = armarExportacion({ ...base, perfil: null, criterios: [], ofertas: [], postulaciones: [], interacciones: [], historial: [], mensajes: [] }, AHORA);
    expect(r.perfil_de_busqueda).toBeNull();
    expect(r.ofertas).toEqual([]);
  });
});

describe('nombreDeArchivo', () => {
  it('lleva la fecha, sin caracteres raros', () => {
    expect(nombreDeArchivo(AHORA)).toBe('laburin-mis-datos-2026-10-30.json');
  });
});
