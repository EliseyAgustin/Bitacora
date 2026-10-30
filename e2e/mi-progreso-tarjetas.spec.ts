import { expect, test } from './fixtures';

// Mi progreso: cada tarjeta dice qué mide en palabras simples y tiene una ayuda (ⓘ) que se abre con un toque, sin depender del mouse.
const TARJETAS = [
  'Postulaciones en curso',
  'Postulaciones con respuesta',
  'Ofertas guardadas',
  'Qué tanto encajan tus ofertas',
  'Postulaciones con movimiento',
  'Días hasta tu primera entrevista',
  'Postulaciones sin novedades',
];

test('las tarjetas tienen nombres claros y una ayuda que se abre y se cierra', async ({ page }) => {
  await page.goto('/mi-progreso');
  for (const nombre of TARJETAS) {
    await expect(page.getByRole('heading', { name: nombre, level: 3 })).toBeVisible();
  }
  // Los nombres viejos ya no están.
  for (const viejo of ['Tasa de respuesta', 'Postulaciones activas', 'Puntaje promedio', 'Actividad reciente']) {
    await expect(page.getByRole('heading', { name: viejo })).toHaveCount(0);
  }

  const ayuda = page.getByRole('button', { name: 'Qué mide «Postulaciones con respuesta»' });
  await expect(ayuda).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByText('incluidos los rechazos')).toBeHidden();
  await ayuda.focus();
  await page.keyboard.press('Enter');
  await expect(ayuda).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('incluidos los rechazos')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByText('incluidos los rechazos')).toBeHidden();
});

test('con una postulación nueva, «en curso» muestra la tendencia contra la semana anterior', async ({ page, api }) => {
  await api.sembrarOfertas([{ empresa: 'Nubia Labs', rol: 'React Engineer', modalidad: 'remoto', stack_tecnologico: ['React'], puntaje_scoring: 25 }]);
  await page.goto('/ofertas');
  await page.getByRole('button', { name: 'Postularme' }).click();
  await expect(page.getByRole('button', { name: 'Por aplicar' })).toBeVisible();

  await page.goto('/mi-progreso');
  const tarjeta = page.getByRole('heading', { name: 'Postulaciones en curso', level: 3 }).locator('xpath=ancestor::div[contains(@class,"rounded-xl")][1]');
  await expect(tarjeta).toContainText('+1 vs. la semana anterior');
});
