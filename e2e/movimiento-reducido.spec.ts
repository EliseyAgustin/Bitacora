import { expect, test } from './fixtures';

// Con «reducir movimiento» activado en el sistema no corre ninguna animación de la aplicación (entradas, mascota, scroll).
// Sin esa preferencia sí hay animaciones: la prueba comprueba las dos cosas para que no pase por no estar buscando bien.
const animadas = () =>
  [...document.querySelectorAll<HTMLElement>('body *')]
    .filter((el) => {
      const e = getComputedStyle(el);
      return e.animationName !== 'none' && parseFloat(e.animationDuration) > 0.001;
    })
    .map((el) => el.className.toString().slice(0, 40));

for (const [pantalla, ruta] of [['Mis postulaciones', '/mis-postulaciones'], ['Mi progreso', '/mi-progreso'], ['Ofertas', '/ofertas']] as const) {
  test(`${pantalla}: con movimiento reducido no hay animaciones`, async ({ page, api }) => {
    void api;
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(ruta);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(animadas)).toEqual([]);
  });
}

test('sin la preferencia, la pantalla sí tiene animaciones de entrada (la prueba detecta)', async ({ page, api }) => {
  void api;
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/mis-postulaciones');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect.poll(() => page.evaluate(animadas).then((r) => r.length)).toBeGreaterThan(0);
});

test.describe('página de inicio', () => {
  test.use({ storageState: { cookies: [], origins: [] } });
  test('con movimiento reducido tampoco anima la mascota ni las entradas', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(animadas)).toEqual([]);
  });
});
