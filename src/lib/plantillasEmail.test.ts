import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderizar } from '../../docs/scripts/plantillas-email.mjs';
import { MARCA } from '@/lib/marca';

// Las plantillas de los mails de Supabase se pegan a mano en el panel (Authentication -> Email Templates).
// Este test cuida que sigan siendo seguras y que conserven lo que Supabase necesita para que el enlace funcione.
const carpeta = path.resolve(import.meta.dirname, '../../docs/plantillas-email');
const archivos = fs.existsSync(carpeta) ? fs.readdirSync(carpeta).filter((f) => f.endsWith('.html')) : [];

describe('plantillas de email', () => {
  it('hay al menos la de recuperación de contraseña', () => {
    expect(archivos).toContain('recuperar-contrasena.html');
  });

  for (const archivo of archivos) {
    describe(archivo, () => {
      const html = fs.readFileSync(path.join(carpeta, archivo), 'utf8');

      it('lleva el enlace de Supabase tanto en el botón como en el texto de respaldo', () => {
        const apariciones = html.split('{{ .ConfirmationURL }}').length - 1;
        expect(apariciones).toBeGreaterThanOrEqual(2);
      });

      it('está en español y declara la codificación', () => {
        expect(html).toMatch(/<html[^>]*lang="es"/);
        expect(html).toMatch(/<meta[^>]*charset="utf-8"/i);
      });

      it('no usa scripts, recursos externos ni imágenes remotas (los clientes de correo los bloquean)', () => {
        expect(html).not.toMatch(/<script/i);
        expect(html).not.toMatch(/<link[^>]*href=/i);
        expect(html).not.toMatch(/<img[^>]*src="https?:/i);
        expect(html).not.toMatch(/url\(\s*['"]?https?:/i);
      });

      it('avisa qué hacer si la persona no pidió el cambio', () => {
        expect(html.toLowerCase()).toContain('si no fuiste vos');
      });
    });
  }

  // El .html que se pega en Supabase sale de la plantilla con el nombre de src/lib/marca.json: si se cambia el nombre y no se
  // vuelve a generar (npm run docs:plantillas), estas pruebas fallan.
  const plantillas = fs.existsSync(carpeta) ? fs.readdirSync(carpeta).filter((f) => f.endsWith('.plantilla.html')) : [];
  for (const plantilla of plantillas) {
    it(`${plantilla}: el mail generado está al día y lleva el nombre de la marca`, () => {
      const generado = fs.readFileSync(path.join(carpeta, plantilla.replace('.plantilla.html', '.html')), 'utf8');
      const origen = fs.readFileSync(path.join(carpeta, plantilla), 'utf8');
      const normalizar = (t: string) => t.replace(/\r\n/g, '\n');
      expect(normalizar(generado)).toBe(normalizar(renderizar(origen)));
      expect(generado).not.toContain('%%');
      expect(generado).toContain(MARCA.nombre);
    });
  }
});
