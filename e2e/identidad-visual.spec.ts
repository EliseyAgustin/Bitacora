import { expect, test } from './fixtures';

// La identidad del Login y el Registro llega a toda la app: cada pantalla abre con una banda de su color, el menú es azul
// noche y las pantallas de acceso muestran una frase grande con los pasos al costado de la tarjeta.
const BANDAS = [
  ['/ofertas', 'Ofertas', '1'],
  ['/mis-postulaciones', 'Mis postulaciones', '2'],
  ['/mi-progreso', 'Mi progreso', '3'],
  ['/mi-perfil', 'Mi perfil de búsqueda', '1'],
  ['/mensajes', 'Mensajes', '2'],
] as const;

for (const [ruta, titulo, campo] of BANDAS) {
  test(`${titulo}: abre con su banda de color`, async ({ page, api }) => {
    void api;
    await page.goto(ruta);
    const banda = page.locator('[data-campo]').filter({ has: page.getByRole('heading', { name: titulo, level: 1 }) });
    await expect(banda).toHaveAttribute('data-campo', campo);
    // El fondo es el campo de color de la paleta, no el fondo claro de la pantalla.
    const fondo = await banda.evaluate((el) => getComputedStyle(el).backgroundColor);
    const pantalla = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    expect(fondo).not.toBe(pantalla);
  });
}

test('el menú lateral marca la pantalla activa con el color de su capítulo', async ({ page, api, isMobile }) => {
  void api;
  test.skip(isMobile, 'En el celular el menú está cerrado');
  const COLORES: Record<string, RegExp> = {
    Ofertas: /^rgb\((27, 70, 201|20, 48, 143)\)$/, // azul
    'Mis postulaciones': /^rgb\((255, 122, 69|242, 107, 51)\)$/, // naranja
  };
  for (const [ruta, nombre] of [['/ofertas', 'Ofertas'], ['/mis-postulaciones', 'Mis postulaciones']] as const) {
    await page.goto(ruta);
    const activo = page.locator('aside').getByRole('link', { name: nombre, exact: true });
    expect(await activo.evaluate((el) => getComputedStyle(el).backgroundColor)).toMatch(COLORES[nombre]);
  }
  // Un ítem inactivo no lleva color de fondo.
  const inactivo = page.locator('aside').getByRole('link', { name: 'Mensajes', exact: true });
  expect(await inactivo.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgba(0, 0, 0, 0)');
});

test.describe('pantallas de acceso', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('recuperar contraseña muestra la frase grande y los tres pasos a la vista', async ({ page }) => {
    await page.goto('/recuperar');
    await expect(page.getByText('Te mandamos un enlace y volvés a entrar.')).toBeVisible();
    const pasos = page.getByRole('list', { name: 'Pasos para recuperar tu contraseña' });
    await expect(pasos.getByRole('listitem')).toHaveCount(3);
    await expect(pasos.locator('[aria-current="step"]')).toContainText('Pedí el enlace');

    await page.getByLabel('Email').fill('alguien@ejemplo.com');
    await page.route('**/auth/v1/recover**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.getByRole('button', { name: 'Enviar enlace' }).click();
    await expect(page.getByText('Revisá tu correo: ya salió el enlace.')).toBeVisible();
    await expect(pasos.locator('[aria-current="step"]')).toContainText('Revisá tu correo');
  });

  test('«No encontrada» usa el campo naranja con su frase', async ({ page }) => {
    await page.goto('/ruta-que-no-existe');
    await expect(page.getByText('Acá no hay nada, ni cavando.')).toBeVisible();
    await expect(page.locator('.pub-marco')).toHaveAttribute('data-campo', '2');
  });
});
