import { expect, test } from './fixtures';

// Smoke contra los servicios reales de Remotive, Arbeitnow y RemoteOK. Depende de terceros: si ninguno responde,
// se saltea de forma explícita (no se da por bueno ni por malo). El resto de la suite usa mocks.
test('smoke: importar desde las fuentes reales', async ({ page, api }) => {
  test.slow();
  await page.goto('/ofertas');
  await page.getByRole('button', { name: 'Importar ofertas remotas' }).first().click(); // el estado vacío repite el botón

  const resultado = page.getByText(/ofertas nuevas importadas/);
  await expect(resultado).toBeVisible({ timeout: 90_000 });
  const texto = (await resultado.textContent()) ?? '';

  test.skip(
    /no se pudo consultar: Remotive, Arbeitnow, RemoteOK/.test(texto),
    'Ninguna de las fuentes externas respondió: no se puede validar el import real.'
  );

  const importadas = Number(/^(\d+) ofertas nuevas/.exec(texto)?.[1] ?? 0);
  expect(importadas).toBeGreaterThan(0);
  expect(await api.contarOfertas()).toBe(importadas);
});
