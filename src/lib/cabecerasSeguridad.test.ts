import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Guarda de las cabeceras de seguridad que Vercel agrega a cada respuesta (vercel.json). Si alguien las afloja o las borra,
// esto falla. La política se verificó además contra la aplicación real (ver docs: revisión de seguridad).
const raiz = path.resolve(import.meta.dirname, '../..');
const config = JSON.parse(fs.readFileSync(path.join(raiz, 'vercel.json'), 'utf8')) as {
  rewrites?: { source: string; destination: string }[];
  headers?: { source: string; headers: { key: string; value: string }[] }[];
};

const reglaGlobal = config.headers?.find((h) => h.source === '/(.*)');
const cabeceras = Object.fromEntries((reglaGlobal?.headers ?? []).map((h) => [h.key.toLowerCase(), h.value]));

function directivas(csp: string): Record<string, string[]> {
  return Object.fromEntries(
    csp
      .split(';')
      .map((d) => d.trim())
      .filter(Boolean)
      .map((d) => {
        const [nombre, ...valores] = d.split(/\s+/);
        return [nombre, valores];
      })
  );
}

describe('vercel.json: cabeceras de seguridad', () => {
  it('aplica las cabeceras a todas las rutas', () => {
    expect(reglaGlobal, 'falta la regla headers para "/(.*)"').toBeDefined();
  });

  it('evita el clickjacking, el sniffing de tipos y la fuga del referer', () => {
    expect(cabeceras['x-frame-options']).toBe('DENY');
    expect(cabeceras['x-content-type-options']).toBe('nosniff');
    expect(cabeceras['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  it('desactiva las funciones del navegador que la aplicación no usa', () => {
    const permisos = cabeceras['permissions-policy'] ?? '';
    for (const funcion of ['camera', 'microphone', 'geolocation', 'payment']) {
      expect(permisos, funcion).toContain(`${funcion}=()`);
    }
  });

  describe('Content-Security-Policy', () => {
    const csp = directivas(cabeceras['content-security-policy'] ?? '');

    it('existe y arranca cerrada: todo solo desde el propio sitio', () => {
      expect(cabeceras['content-security-policy']).toBeTruthy();
      expect(csp['default-src']).toEqual(["'self'"]);
    });

    it('los scripts solo vienen del propio sitio: sin inline, sin eval y sin comodines', () => {
      expect(csp['script-src']).toEqual(["'self'"]);
    });

    it('bloquea plugins, iframes ajenos, <base> y formularios hacia afuera', () => {
      expect(csp['object-src']).toEqual(["'none'"]);
      expect(csp['frame-ancestors']).toEqual(["'none'"]);
      expect(csp['base-uri']).toEqual(["'self'"]);
      expect(csp['form-action']).toEqual(["'self'"]);
    });

    it('las conexiones salen solo hacia Supabase y las dos fuentes de ofertas', () => {
      expect(csp['connect-src']).toEqual(
        expect.arrayContaining(["'self'", 'https://*.supabase.co', 'wss://*.supabase.co', 'https://remotive.com', 'https://www.arbeitnow.com', 'https://remoteok.com'])
      );
      expect(csp['connect-src']).not.toContain('*');
    });

    it('no usa comodines abiertos ni unsafe-eval en ninguna directiva', () => {
      for (const [nombre, valores] of Object.entries(csp)) {
        expect(valores, nombre).not.toContain('*');
        expect(valores, nombre).not.toContain("'unsafe-eval'");
        expect(valores, nombre).not.toContain('http:');
      }
    });

    it('permite solo lo que la interfaz necesita: Google Fonts, imágenes propias y data:', () => {
      expect(csp['font-src']).toEqual(expect.arrayContaining(["'self'", 'https://fonts.gstatic.com']));
      expect(csp['style-src']).toEqual(expect.arrayContaining(["'self'", 'https://fonts.googleapis.com']));
      expect(csp['img-src']).toEqual(expect.arrayContaining(["'self'", 'data:']));
    });
  });

  it('conserva la redirección que hace funcionar las rutas internas de la SPA', () => {
    expect(config.rewrites).toEqual([{ source: '/(.*)', destination: '/index.html' }]);
  });
});
