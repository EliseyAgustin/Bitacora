import { expect, test as base, type Page } from '@playwright/test';
import { cuentaAdministrador } from './cuentas';
import { test } from './fixtures';
import { cerrarSesion, completarOnboarding, iniciarSesionPorUI, registrarPorUI } from './ui';

// Ninguna pantalla puede salirse del ancho de un celular: ni scroll horizontal de la página ni elementos que queden fuera.
// Se prueba a 320 px (el celular más angosto que todavía se usa) y a 375 px. Lo que tiene su propio scroll horizontal a
// propósito (el tablero Kanban) y el menú lateral cerrado no cuentan.
const ANCHOS = [320, 375];

async function sinDesborde(page: Page, donde: string) {
  for (const ancho of ANCHOS) {
    await page.setViewportSize({ width: ancho, height: 800 });
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => {
      const ancho = window.innerWidth;
      const fuera: string[] = [];
      for (const el of Array.from(document.querySelectorAll('body *'))) {
        if (el.closest('aside')) continue; // el menú lateral cerrado vive fuera de la pantalla a propósito
        const caja = el.getBoundingClientRect();
        if (caja.width === 0 || caja.height === 0) continue;
        if (caja.left >= -1 && caja.right <= ancho + 1) continue;
        let ancestro = el.parentElement;
        let conScroll = false;
        while (ancestro && ancestro !== document.body) {
          const overflow = getComputedStyle(ancestro).overflowX;
          if (overflow === 'auto' || overflow === 'scroll' || overflow === 'hidden' || overflow === 'clip') {
            conScroll = true;
            break;
          }
          ancestro = ancestro.parentElement;
        }
        if (!conScroll) fuera.push(`${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 3).join('.')} (${Math.round(caja.left)}→${Math.round(caja.right)})`);
      }
      return { ancho, paginaAncho: document.documentElement.scrollWidth, fuera: fuera.slice(0, 5) };
    });
    expect(r.paginaAncho, `${donde} a ${ancho}px: la página tiene scroll horizontal`).toBeLessThanOrEqual(r.ancho);
    expect(r.fuera, `${donde} a ${ancho}px: elementos fuera de la pantalla`).toEqual([]);
  }
}

test.describe('candidato (cuenta compartida)', () => {
  test('todas las pantallas del candidato entran en el ancho de un celular', async ({ page, api }) => {
    await api.sembrarOfertas(
      Array.from({ length: 4 }, (_, i) => ({
        empresa: `Empresa con un nombre bastante largo número ${i}`,
        rol: `Desarrollador Full Stack Senior con experiencia en múltiples tecnologías ${i}`,
        ubicacion: 'Buenos Aires, Argentina',
        stack_tecnologico: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'AWS'],
        puntaje_scoring: 25,
      }))
    );
    const { data } = await api.sb.from('ofertas').select('id').limit(1).single();
    await api.crearPostulacionDe(data!.id);

    for (const [ruta, titulo] of [
      ['/ofertas', 'Ofertas'],
      ['/mis-postulaciones', 'Mis postulaciones'],
      ['/mi-perfil', 'Mi perfil de búsqueda'],
      ['/mi-progreso', 'Mi progreso'],
      ['/mensajes', 'Mensajes'],
    ]) {
      await page.setViewportSize({ width: 375, height: 800 });
      await page.goto(ruta);
      await expect(page.getByRole('heading', { name: titulo, level: 1 })).toBeVisible();
      await page.waitForTimeout(700);
      await sinDesborde(page, titulo);
    }

    // Ofertas con el formulario de carga abierto y la ficha de una postulación.
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/ofertas');
    await page.getByRole('button', { name: 'Nueva oferta' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await sinDesborde(page, 'Formulario Nueva oferta');
  });
});

base.describe('sin sesión y administrador', () => {
  base.use({ storageState: { cookies: [], origins: [] } });

  base('ingreso, registro, recuperación, onboarding y Candidatos entran en el ancho de un celular', async ({ page }) => {
    for (const ruta of ['/', '/recuperar', '/nueva-contrasena', '/ruta-que-no-existe']) {
      await page.goto(ruta);
      await page.waitForTimeout(400);
      await sinDesborde(page, `Pantalla ${ruta}`);
    }
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/');
    await page.getByRole('button', { name: '¿No tenés cuenta? Registrate' }).click();
    await sinDesborde(page, 'Registro');

    // Onboarding con un nombre largo, y después el listado y el detalle que ve el administrador.
    await registrarPorUI(page);
    await sinDesborde(page, 'Onboarding paso 1');
    await completarOnboarding(page, 'Camila Ejemplo con un apellido muy pero muy largo para probar');
    await sinDesborde(page, 'Onboarding: perfil listo');
    await page.getByRole('button', { name: 'Ir a Mis postulaciones' }).click();
    await cerrarSesion(page);

    await iniciarSesionPorUI(page, cuentaAdministrador());
    await expect(page).toHaveURL(/\/candidatos$/);
    await page.getByLabel('Buscar candidatos').fill('apellido muy pero muy largo');
    await expect(page.getByRole('link').filter({ hasText: 'apellido muy pero muy largo' }).first()).toBeVisible();
    await sinDesborde(page, 'Candidatos');
    await page.getByRole('link').filter({ hasText: 'apellido muy pero muy largo' }).first().click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Camila Ejemplo');
    await sinDesborde(page, 'Detalle del candidato');
  });
});
