import { expect, test } from '@playwright/test';
import { irA } from './ui';

// Sesión compartida (storageState del proyecto).

const REDIRECCIONES = [
  { vieja: '/tablero', nueva: /\/mis-postulaciones$/ },
  { vieja: '/analytics', nueva: /\/mi-progreso$/ },
  { vieja: '/configuracion', nueva: /\/mi-perfil$/ },
];

for (const { vieja, nueva } of REDIRECCIONES) {
  test(`la URL anterior ${vieja} redirige a la pantalla nueva`, async ({ page }) => {
    await page.goto(vieja);
    await expect(page).toHaveURL(nueva);
  });
}

test('el menú usa los nombres nuevos y cada pantalla explica qué se hace ahí', async ({ page }) => {
  await page.goto('/ofertas');
  await expect(page.getByRole('heading', { name: 'Ofertas', level: 1 })).toBeVisible();

  await irA(page, 'Mis postulaciones');
  await expect(page).toHaveURL(/\/mis-postulaciones$/);
  await expect(page.getByRole('heading', { name: 'Mis postulaciones', level: 1 })).toBeVisible();
  await expect(page.getByText(/Seguí en qué etapa está cada postulación/)).toBeVisible();

  await irA(page, 'Mi progreso');
  await expect(page.getByRole('heading', { name: 'Mi progreso', level: 1 })).toBeVisible();

  await irA(page, 'Mi perfil de búsqueda');
  await expect(page.getByRole('heading', { name: 'Mi perfil de búsqueda', level: 1 })).toBeVisible();
  for (const bloque of ['¿Qué estoy buscando?', 'Mis tecnologías y cuánto pesan', 'Avisos de seguimiento']) {
    await expect(page.getByRole('heading', { name: bloque, level: 2 })).toBeVisible();
  }
});

test('textos aclarados: sin siglas ni jerga en el menú, en Mi progreso y en Mi perfil de búsqueda', async ({ page }) => {
  await page.goto('/mi-perfil');
  await expect(page.getByText('Tu búsqueda de empleo')).toBeVisible();
  await expect(page.getByText('Gestión de Empleos')).toHaveCount(0);
  await expect(page.getByText('Más peso, más puntos')).toBeVisible();
  await expect(page.getByText('Pesa mucho en el puntaje')).toHaveCount(0);
  await expect(
    page.getByText('Ojo: con ofertas remotas la ubicación casi nunca suma puntos, porque muchas dicen «Worldwide» o solo un país.')
  ).toBeVisible();
  await expect(page.getByText('pts', { exact: true })).toHaveCount(0);

  await page.goto('/mi-progreso');
  await expect(page.getByText(/pts/)).toHaveCount(0);
});

test('una dirección que no existe muestra "No encontramos esa página" y lleva al inicio del candidato', async ({ page }) => {
  await page.goto('/ruta-que-no-existe');
  await expect(page.getByRole('heading', { name: 'No encontramos esa página', level: 1 })).toBeVisible();
  await page.getByRole('link', { name: 'Ir a mi inicio' }).click();
  await expect(page).toHaveURL(/\/mis-postulaciones$/);
});

test.describe('sin sesión', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('una dirección que no existe lleva a iniciar sesión', async ({ page }) => {
    await page.goto('/otra/ruta/inexistente');
    await expect(page.getByRole('heading', { name: 'No encontramos esa página', level: 1 })).toBeVisible();
    await page.getByRole('link', { name: 'Ir a iniciar sesión' }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
  });
});
