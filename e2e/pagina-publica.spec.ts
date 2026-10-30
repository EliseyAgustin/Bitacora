import { expect, test } from '@playwright/test';

// La página de inicio (Login y Registro) tiene un capítulo de color por cada cosa que hace la aplicación: se prueba lo que la
// persona puede mover (el puntaje de ejemplo y el deslizador de etapas) y que respete el tema y "reducir movimiento".
test.use({ storageState: { cookies: [], origins: [] } });

test('un solo título principal, y cambia al pasar al registro', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1, name: 'Tu búsqueda de empleo, ordenada' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Ingresá a tu cuenta' })).toBeVisible();

  await page.getByRole('button', { name: '¿No tenés cuenta? Registrate' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Empezá a ordenar tu búsqueda' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Creá tu cuenta' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Registrarme' })).toBeVisible();

  await page.getByRole('button', { name: '¿Ya tenés cuenta? Iniciá sesión' }).click();
  await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
});

test('el puntaje de ejemplo se recalcula con las tecnologías que marcás, con las reglas reales de la app', async ({ page }) => {
  await page.goto('/');
  const puntaje = page.getByRole('img', { name: /^Puntaje \d+$/ });
  await puntaje.scrollIntoViewIfNeeded();
  await expect(puntaje).toHaveAttribute('aria-label', 'Puntaje 45'); // React + TypeScript + remoto + ubicación
  await expect(puntaje).toHaveText('45');

  await page.getByRole('button', { name: 'Node.js' }).click();
  await expect(puntaje).toHaveAttribute('aria-label', 'Puntaje 60');
  await expect(puntaje).toHaveText('60'); // el número termina de contar
  await expect(page.getByText('Stack: Node.js').locator('..')).toContainText('Coincide · suma 15');

  // PostgreSQL no lo pide la oferta de ejemplo: marcarla no suma.
  await page.getByRole('button', { name: 'PostgreSQL' }).click();
  await expect(puntaje).toHaveAttribute('aria-label', 'Puntaje 60');
  await expect(page.getByText('Stack: PostgreSQL').locator('..')).toContainText('No coincide');

  await page.getByRole('button', { name: 'React' }).click();
  await expect(puntaje).toHaveAttribute('aria-label', 'Puntaje 45');
  await expect(page.getByText('Máximo posible con tu perfil: 75 puntos.')).toBeVisible();
});

test('el deslizador de etapas explica cada una y se maneja con el teclado', async ({ page }) => {
  await page.goto('/');
  const deslizador = page.getByRole('slider', { name: 'Etapa de la postulación' });
  await deslizador.scrollIntoViewIfNeeded();
  await expect(page.getByRole('heading', { level: 2, name: 'Primero guardás la oferta' })).toBeVisible();
  await expect(page.getByText('Las guardaste, todavía no te postulaste.')).toBeVisible();

  await deslizador.focus();
  await page.keyboard.press('ArrowRight');
  await expect(deslizador).toHaveAttribute('aria-valuetext', 'Aplicado');
  await expect(page.getByText('Ya te postulaste. Esperá una respuesta.')).toBeVisible();

  await page.keyboard.press('End');
  await expect(deslizador).toHaveAttribute('aria-valuetext', 'Entrevista');
  await expect(page.getByRole('heading', { level: 2, name: 'Y llegás a la entrevista' })).toBeVisible();

  await page.getByRole('button', { name: 'Por aplicar', exact: true }).click();
  await expect(deslizador).toHaveAttribute('aria-valuetext', 'Por aplicar');
});

test('«Crear mi cuenta», al final de la página, lleva al registro', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Empezá a ordenar tu búsqueda' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Creá tu cuenta' })).toBeInViewport();
});

test('el modo oscuro cambia el color de los campos y todo sigue a la vista', async ({ page }) => {
  await page.goto('/');
  const primero = page.locator('section').first();
  await expect(primero).toHaveCSS('background-color', 'rgb(27, 70, 201)'); // azul de la marca, modo claro
  await page.getByRole('switch', { name: 'Cambiar a modo oscuro' }).click();
  await expect(primero).toHaveCSS('background-color', 'rgb(20, 48, 143)');
  await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
});

test('con «reducir movimiento» no hay entradas animadas: todo se ve desde el principio', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const titulo = page.getByRole('heading', { level: 2, name: 'Si bajás el ritmo, el topo te avisa' });
  await expect(titulo).toBeAttached();
  await expect(titulo.locator('xpath=ancestor-or-self::*[contains(@class,"pub-aparece")]').first()).toHaveCSS('opacity', '1');
  await expect(page.getByRole('heading', { level: 1 })).toHaveCSS('opacity', '1');
});
