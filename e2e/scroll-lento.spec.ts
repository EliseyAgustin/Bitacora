import { expect, test } from '@playwright/test';

// Los enlaces internos de la página de inicio bajan despacio (no saltan) y dejan el foco en la sección.
test.use({ storageState: { cookies: [], origins: [] } });

test('«Tu puntaje» baja despacio hasta su capítulo', async ({ page }) => {
  await page.goto('/');
  const antes = await page.evaluate(() => window.scrollY);
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Tu puntaje' }).click();

  // A los 150 ms todavía no llegó: un salto instantáneo ya estaría en destino.
  await page.waitForTimeout(150);
  const enCamino = await page.evaluate(() => window.scrollY);
  const destino = await page.evaluate(() => window.scrollY + document.getElementById('puntaje')!.getBoundingClientRect().top);
  expect(enCamino).toBeGreaterThan(antes);
  expect(enCamino).toBeLessThan(destino - 50);

  await expect.poll(() => page.evaluate(() => Math.abs(document.getElementById('puntaje')!.getBoundingClientRect().top)), {
    timeout: 5000,
  }).toBeLessThan(4);
  await expect(page).toHaveURL(/#puntaje$/);
});

test('con movimiento reducido salta directo', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Tu puntaje' }).click();
  await expect.poll(() => page.evaluate(() => Math.abs(document.getElementById('puntaje')!.getBoundingClientRect().top))).toBeLessThan(4);
});
