import { describe, expect, it } from 'vitest';
import { descripcionBusquedaLinkedIn, resumenDeCoincidencias, textoPlano, urlBusquedaLinkedIn, urlSegura } from '@/lib/ofertaDetalle';

describe('urlSegura', () => {
  it('acepta enlaces http y https y los devuelve normalizados', () => {
    expect(urlSegura('https://remotive.com/remote-jobs/dev/frontend-123')).toBe('https://remotive.com/remote-jobs/dev/frontend-123');
    expect(urlSegura('http://empresa.com/empleos')).toBe('http://empresa.com/empleos');
    expect(urlSegura('  https://empresa.com/a?b=1  ')).toBe('https://empresa.com/a?b=1');
    expect(urlSegura('HTTPS://EMPRESA.com/Ruta')).toBe('https://empresa.com/Ruta');
  });

  it('rechaza todo lo que no sea un enlace web seguro para abrir', () => {
    const peligrosos = [
      'javascript:alert(1)',
      ' JaVaScRiPt:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
      'ftp://empresa.com/archivo',
      '//evil.com/x',
      '/ruta/relativa',
      'empresa.com/sin-protocolo',
      'https://',
      'https://usuario:clave@empresa.com/x',
      `https://empresa.com/${'a'.repeat(2100)}`,
      '',
      '   ',
    ];
    for (const url of peligrosos) expect(urlSegura(url), url).toBeNull();
  });

  it('devuelve null si no hay enlace', () => {
    expect(urlSegura(null)).toBeNull();
    expect(urlSegura(undefined)).toBeNull();
  });
});

describe('textoPlano', () => {
  it('convierte el HTML de una descripción en texto con párrafos y listas', () => {
    expect(textoPlano('<p>Hola <strong>mundo</strong></p><p>Chau</p>', 1000)).toBe('Hola mundo\n\nChau');
    expect(textoPlano('<ul><li>React</li><li>SQL</li></ul>', 1000)).toBe('• React\n• SQL');
    expect(textoPlano('Línea uno<br>Línea dos<br/>Línea tres', 1000)).toBe('Línea uno\nLínea dos\nLínea tres');
  });

  it('descarta scripts, estilos y cualquier etiqueta con código', () => {
    expect(textoPlano('<script>alert(1)</script>Texto', 1000)).toBe('Texto');
    expect(textoPlano('<style>body{display:none}</style>Texto', 1000)).toBe('Texto');
    expect(textoPlano('<img src=x onerror=alert(1)>Texto', 1000)).toBe('Texto');
    expect(textoPlano('<a href="javascript:alert(1)" onclick="x()">Postulate</a>', 1000)).toBe('Postulate');
  });

  it('decodifica las entidades comunes y deja lo demás como texto', () => {
    expect(textoPlano('Tom &amp; Jerry &lt;3 &quot;ok&quot; &#39;si&#39; a&nbsp;b &#8211; fin', 1000)).toBe('Tom & Jerry <3 "ok" \'si\' a b – fin');
    expect(textoPlano('&lt;script&gt;alert(1)&lt;/script&gt;', 1000)).toBe('<script>alert(1)</script>');
  });

  it('compacta espacios y líneas en blanco', () => {
    expect(textoPlano('<p>  A   B  </p>\n\n\n<p></p><p>C</p>', 1000)).toBe('A B\n\nC');
    expect(textoPlano('', 1000)).toBe('');
    expect(textoPlano(null, 1000)).toBe('');
  });

  it('corta en el largo pedido y lo indica con puntos suspensivos', () => {
    const largo = textoPlano(`<p>${'palabra '.repeat(500)}</p>`, 100);
    expect(largo.length).toBeLessThanOrEqual(101);
    expect(largo.endsWith('…')).toBe(true);
    expect(textoPlano('corto', 100)).toBe('corto');
  });
});

describe('urlBusquedaLinkedIn', () => {
  const parsear = (url: string) => {
    const u = new URL(url);
    return { origen: u.origin + u.pathname, params: Object.fromEntries(u.searchParams) };
  };

  it('arma la búsqueda con el rol, la ubicación y la modalidad del perfil', () => {
    const { origen, params } = parsear(urlBusquedaLinkedIn({ rol: 'Frontend Developer', ubicacion: 'Buenos Aires, Argentina', modalidad: 'remoto' }));
    expect(origen).toBe('https://www.linkedin.com/jobs/search/');
    expect(params).toEqual({ keywords: 'Frontend Developer', location: 'Buenos Aires, Argentina', f_WT: '2' });
  });

  it('traduce cada modalidad al filtro de LinkedIn', () => {
    const modalidad = (m: 'remoto' | 'hibrido' | 'presencial') => parsear(urlBusquedaLinkedIn({ rol: 'QA', ubicacion: null, modalidad: m })).params.f_WT;
    expect(modalidad('presencial')).toBe('1');
    expect(modalidad('remoto')).toBe('2');
    expect(modalidad('hibrido')).toBe('3');
  });

  it('omite lo que el perfil no tiene y escapa los caracteres especiales', () => {
    expect(parsear(urlBusquedaLinkedIn({ rol: null, ubicacion: null, modalidad: null })).params).toEqual({});
    const { params } = parsear(urlBusquedaLinkedIn({ rol: 'C++ & .NET "dev"', ubicacion: '  ', modalidad: null }));
    expect(params).toEqual({ keywords: 'C++ & .NET "dev"' });
  });
});

describe('descripcionBusquedaLinkedIn', () => {
  it('cuenta, con los datos del perfil, qué va a buscar LinkedIn', () => {
    expect(descripcionBusquedaLinkedIn({ rol: 'Frontend Developer', ubicacion: 'Buenos Aires, Argentina', modalidad: 'remoto' })).toBe(
      'Abre LinkedIn con una búsqueda de «Frontend Developer» en Buenos Aires, Argentina, remoto. Se abre en otra pestaña.'
    );
  });

  it('omite lo que el perfil no tiene y nombra bien cada modalidad', () => {
    expect(descripcionBusquedaLinkedIn({ rol: 'QA', ubicacion: null, modalidad: 'presencial' })).toBe(
      'Abre LinkedIn con una búsqueda de «QA», presencial. Se abre en otra pestaña.'
    );
    expect(descripcionBusquedaLinkedIn({ rol: null, ubicacion: 'Córdoba', modalidad: 'hibrido' })).toBe(
      'Abre LinkedIn con una búsqueda de ofertas en Córdoba, híbrido. Se abre en otra pestaña.'
    );
    expect(descripcionBusquedaLinkedIn({ rol: '  Data Analyst ', ubicacion: '  ', modalidad: null })).toBe(
      'Abre LinkedIn con una búsqueda de «Data Analyst». Se abre en otra pestaña.'
    );
  });
});

describe('resumenDeCoincidencias', () => {
  it('cuenta cuántos criterios del perfil cumple la oferta', () => {
    expect(resumenDeCoincidencias([{ coincide: true }, { coincide: false }, { coincide: true }])).toEqual({ coinciden: 2, total: 3 });
    expect(resumenDeCoincidencias([])).toEqual({ coinciden: 0, total: 0 });
  });
});
