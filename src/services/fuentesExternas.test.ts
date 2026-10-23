import { describe, expect, it } from 'vitest';
import {
  claveDedupeOferta,
  emparejarEnlaces,
  normalizarArbeitnow,
  normalizarRemoteOK,
  normalizarRemotive,
  resumenImportacion,
  separarNuevas,
} from '@/services/fuentesExternas';
import type { Oferta } from '@/types/oferta';

describe('normalizarRemotive', () => {
  it('mapea un job de Remotive al shape de OfertaInput', () => {
    const job = {
      id: 2091129,
      url: 'https://remotive.com/remote-jobs/data/senior-data-scientist-2091129',
      title: 'Senior Data Scientist',
      company_name: 'Lemon.io',
      tags: ['python', 'AI/ML', 'react'],
      job_type: 'full_time',
      publication_date: '2026-09-16T12:35:28',
      candidate_required_location: 'Northern America, LATAM, Europe, APAC',
      salary: '',
      description: '<p>Buscamos <strong>perfil de datos</strong></p><ul><li>Python</li></ul>',
    };

    expect(normalizarRemotive(job)).toEqual({
      empresa: 'Lemon.io',
      rol: 'Senior Data Scientist',
      ubicacion: 'Northern America, LATAM, Europe, APAC',
      modalidad: 'remoto',
      stack_tecnologico: ['python', 'AI/ML', 'react'],
      fuente: 'Remotive',
      fecha_publicacion: '2026-09-16',
      url: 'https://remotive.com/remote-jobs/data/senior-data-scientist-2091129',
      descripcion: 'Buscamos perfil de datos\n\n• Python',
    });
  });

  it('descarta un enlace que no sea http(s) y deja la descripción como texto plano', () => {
    const job = {
      id: 3,
      url: 'javascript:alert(1)',
      title: 'Dev',
      company_name: 'Acme',
      tags: [],
      job_type: 'full_time',
      publication_date: '2026-09-16T12:35:28',
      candidate_required_location: '',
      salary: '',
      description: '<script>alert(1)</script><img src=x onerror=alert(1)>Texto',
    };

    const oferta = normalizarRemotive(job);
    expect(oferta.url).toBeNull();
    expect(oferta.descripcion).toBe('Texto');
  });

  it('usa null en ubicacion y fecha_publicacion cuando el job no los trae', () => {
    const job = {
      id: 1,
      url: 'https://remotive.com/x',
      title: 'Dev',
      company_name: 'Acme',
      tags: [],
      job_type: 'full_time',
      publication_date: '',
      candidate_required_location: '',
      salary: '',
    };

    const resultado = normalizarRemotive(job);
    expect(resultado.ubicacion).toBeNull();
    expect(resultado.fecha_publicacion).toBeNull();
  });
});

describe('normalizarArbeitnow', () => {
  it('mapea un job de Arbeitnow al shape de OfertaInput, incluyendo la fecha unix a ISO', () => {
    const job = {
      slug: 'motion-designer-berlin-209101',
      company_name: 'Paintgun',
      title: 'Motion Designer',
      remote: true,
      url: 'https://www.arbeitnow.com/jobs/companies/paintgun/motion-designer-berlin-209101',
      tags: ['Remote', 'Graphic Arts and Communication Design'],
      job_types: ['Freelance'],
      location: 'Berlin',
      created_at: 1789732849,
      description: '<p>Diseñá <em>animaciones</em> &amp; piezas</p>',
    };

    expect(normalizarArbeitnow(job)).toEqual({
      empresa: 'Paintgun',
      rol: 'Motion Designer',
      ubicacion: 'Berlin',
      modalidad: 'remoto',
      stack_tecnologico: ['Remote', 'Graphic Arts and Communication Design'],
      fuente: 'Arbeitnow',
      fecha_publicacion: '2026-09-18',
      url: 'https://www.arbeitnow.com/jobs/companies/paintgun/motion-designer-berlin-209101',
      descripcion: 'Diseñá animaciones & piezas',
    });
  });

  it('usa null en ubicacion cuando el job no trae location', () => {
    const job = {
      slug: 'x',
      company_name: 'Acme',
      title: 'Dev',
      remote: true,
      url: 'https://www.arbeitnow.com/x',
      tags: [],
      job_types: [],
      location: '',
      created_at: 1789732849,
    };

    expect(normalizarArbeitnow(job).ubicacion).toBeNull();
  });
});

function ofertaFixture(overrides: Partial<Oferta> = {}): Oferta {
  return {
    id: '1',
    user_id: 'u1',
    empresa: 'Acme',
    rol: 'QA Analyst',
    ubicacion: null,
    modalidad: 'remoto',
    stack_tecnologico: [],
    fuente: 'Remotive',
    fecha_publicacion: null,
    url: null,
    descripcion: null,
    puntaje_scoring: null,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('normalizarRemoteOK', () => {
  it('mapea un job de RemoteOK al shape de OfertaInput', () => {
    const job = {
      slug: 'remote-senior-devops-engineer-lemon-io-1137557',
      company: 'Lemon.io',
      position: 'Senior DevOps Engineer',
      location: 'Worldwide',
      tags: ['devops', 'aws', 'python'],
      date: '2026-10-22T12:58:28+00:00',
      url: 'https://remoteOK.com/remote-jobs/remote-senior-devops-engineer-lemon-io-1137557',
      description: '<p>Operá la <b>infraestructura</b></p>',
    };

    expect(normalizarRemoteOK(job)).toEqual({
      empresa: 'Lemon.io',
      rol: 'Senior DevOps Engineer',
      ubicacion: 'Worldwide',
      modalidad: 'remoto',
      stack_tecnologico: ['devops', 'aws', 'python'],
      fuente: 'RemoteOK',
      fecha_publicacion: '2026-10-22',
      url: 'https://remoteok.com/remote-jobs/remote-senior-devops-engineer-lemon-io-1137557',
      descripcion: 'Operá la infraestructura',
    });
  });

  it('usa null en lo que el job no trae y tolera etiquetas ausentes', () => {
    const oferta = normalizarRemoteOK({ company: 'Acme', position: 'Dev', location: '', date: '', url: '' } as never);
    expect(oferta.ubicacion).toBeNull();
    expect(oferta.fecha_publicacion).toBeNull();
    expect(oferta.stack_tecnologico).toEqual([]);
    expect(oferta.url).toBeNull();
    expect(oferta.descripcion).toBeNull();
  });
});

describe('emparejarEnlaces', () => {
  const candidata = (overrides: Record<string, unknown> = {}) => ({
    empresa: 'Acme',
    rol: 'QA Analyst',
    ubicacion: null,
    modalidad: 'remoto' as const,
    stack_tecnologico: [],
    fuente: 'Remotive',
    fecha_publicacion: null,
    url: 'https://remotive.com/acme-qa',
    descripcion: 'Descripción',
    ...overrides,
  });

  it('completa el enlace y la descripción de las ofertas ya guardadas que no los tenían', () => {
    const sinEnlace = [{ id: 'o1', empresa: ' acme ', rol: 'QA ANALYST', fuente: 'remotive' }];
    expect(emparejarEnlaces([candidata()], sinEnlace)).toEqual([
      { id: 'o1', url: 'https://remotive.com/acme-qa', descripcion: 'Descripción' },
    ]);
  });

  it('ignora lo que no coincide por empresa, rol y fuente y a las candidatas sin enlace', () => {
    const sinEnlace = [
      { id: 'o1', empresa: 'Acme', rol: 'QA Analyst', fuente: 'Arbeitnow' },
      { id: 'o2', empresa: 'Otra', rol: 'QA Analyst', fuente: 'Remotive' },
      { id: 'o3', empresa: 'Sin', rol: 'Enlace', fuente: 'Remotive' },
    ];
    const candidatas = [candidata(), candidata({ empresa: 'Sin', rol: 'Enlace', url: null })];
    expect(emparejarEnlaces(candidatas, sinEnlace)).toEqual([]);
  });

  it('no repite una oferta aunque la fuente la traiga dos veces', () => {
    const sinEnlace = [{ id: 'o1', empresa: 'Acme', rol: 'QA Analyst', fuente: 'Remotive' }];
    expect(emparejarEnlaces([candidata(), candidata()], sinEnlace)).toHaveLength(1);
  });
});

describe('claveDedupeOferta', () => {
  it('genera la misma clave para empresa+rol+fuente iguales ignorando mayúsculas y espacios', () => {
    const a = claveDedupeOferta(ofertaFixture({ empresa: 'Acme', rol: 'QA Analyst', fuente: 'Remotive' }));
    const b = claveDedupeOferta(ofertaFixture({ empresa: '  acme ', rol: 'qa analyst', fuente: 'REMOTIVE' }));
    expect(a).toBe(b);
  });

  it('genera claves distintas si cambia la fuente', () => {
    const a = claveDedupeOferta(ofertaFixture({ fuente: 'Remotive' }));
    const b = claveDedupeOferta(ofertaFixture({ fuente: 'Arbeitnow' }));
    expect(a).not.toBe(b);
  });

  it('genera claves distintas si cambia el rol', () => {
    const a = claveDedupeOferta(ofertaFixture({ rol: 'QA Analyst' }));
    const b = claveDedupeOferta(ofertaFixture({ rol: 'QA Engineer' }));
    expect(a).not.toBe(b);
  });
});

describe('separarNuevas', () => {
  const cand = (empresa: string, rol: string, fuente = 'Remotive') => ({
    empresa,
    rol,
    fuente,
    ubicacion: null,
    modalidad: 'remoto' as const,
    stack_tecnologico: [],
    fecha_publicacion: null,
  });

  it('omite las que ya existen, sin importar mayúsculas ni espacios', () => {
    const existentes = new Set([claveDedupeOferta({ empresa: 'acme', rol: 'dev', fuente: 'remotive' })]);
    const r = separarNuevas([cand(' ACME ', 'Dev'), cand('Otra', 'Dev')], existentes);
    expect(r.nuevas.map((o) => o.empresa)).toEqual(['Otra']);
    expect(r.omitidasPorDuplicado).toBe(1);
  });

  it('deduplica repetidas dentro del propio lote de candidatas', () => {
    const r = separarNuevas([cand('Acme', 'Dev'), cand('Acme', 'Dev')], new Set());
    expect(r.nuevas).toHaveLength(1);
    expect(r.omitidasPorDuplicado).toBe(1);
  });

  it('la misma empresa y rol en otra fuente no es duplicado', () => {
    const existentes = new Set([claveDedupeOferta({ empresa: 'Acme', rol: 'Dev', fuente: 'Arbeitnow' })]);
    expect(separarNuevas([cand('Acme', 'Dev', 'Remotive')], existentes).nuevas).toHaveLength(1);
  });
});

describe('resumenImportacion', () => {
  const base = { insertadas: [], omitidasPorDuplicado: 0, erroresInsercion: 0, fuentesFallidas: [] as string[], enlacesCompletados: 0 };
  const nuevas = (n: number) => Array.from({ length: n }, () => ({}) as Oferta);

  it('concuerda en plural con cero y con varias', () => {
    expect(resumenImportacion({ ...base, insertadas: nuevas(0) })).toBe('0 ofertas nuevas importadas');
    expect(resumenImportacion({ ...base, insertadas: nuevas(8) })).toBe('8 ofertas nuevas importadas');
  });

  it('concuerda en singular con una', () => {
    expect(resumenImportacion({ ...base, insertadas: nuevas(1) })).toBe('1 oferta nueva importada');
    expect(resumenImportacion({ ...base, omitidasPorDuplicado: 1 })).toBe(
      '0 ofertas nuevas importadas · 1 duplicada omitida'
    );
  });

  it('incluye duplicadas, errores y fuentes caídas', () => {
    expect(
      resumenImportacion({
        insertadas: nuevas(2),
        omitidasPorDuplicado: 3,
        erroresInsercion: 1,
        fuentesFallidas: ['Remotive'],
        enlacesCompletados: 0,
      })
    ).toBe('2 ofertas nuevas importadas · 3 duplicadas omitidas · 1 falló al guardar · no se pudo consultar: Remotive');
  });

  it('avisa cuántas ofertas ya guardadas recibieron su enlace', () => {
    expect(resumenImportacion({ ...base, omitidasPorDuplicado: 5, enlacesCompletados: 1 })).toBe(
      '0 ofertas nuevas importadas · 5 duplicadas omitidas · 1 con enlace agregado'
    );
    expect(resumenImportacion({ ...base, enlacesCompletados: 12 })).toBe(
      '0 ofertas nuevas importadas · 12 con enlace agregado'
    );
  });
});
