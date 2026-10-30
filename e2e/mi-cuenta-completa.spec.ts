import { readFileSync } from 'node:fs';
import { expect, test } from './fixtures';
import { abrirMenuSiHaceFalta, omitirOnboarding, registrarPorUI } from './ui';

// Mi cuenta: preferencias de avisos, descarga y borrado de los propios datos, y cierre de sesión en todos los dispositivos.
const OFERTAS = [
  { empresa: 'Nubia Labs', rol: 'React Engineer', stack_tecnologico: ['React'], puntaje_scoring: 25 },
  { empresa: 'Orion Tech', rol: 'QA Engineer', stack_tecnologico: ['React'], puntaje_scoring: 25 },
];

async function abrirCuenta(page: import('@playwright/test').Page) {
  await abrirMenuSiHaceFalta(page);
  await page.getByRole('button', { name: 'Mi cuenta', exact: true }).click();
  return page.getByRole('dialog', { name: 'Mi cuenta' });
}

test('las preferencias de avisos se guardan y se respetan', async ({ page, api }) => {
  await api.sembrarOfertas(OFERTAS);
  await page.goto('/ofertas');
  const cuenta = await abrirCuenta(page);
  await expect(cuenta.getByText('Candidato', { exact: true })).toBeVisible();

  const aviso = cuenta.getByRole('switch', { name: 'Aviso de ritmo de búsqueda' });
  const pregunta = cuenta.getByRole('switch', { name: 'Preguntarme si me postulé' });
  await expect(aviso).toHaveAttribute('aria-checked', 'true');
  await expect(pregunta).toHaveAttribute('aria-checked', 'true');
  await aviso.click();
  await pregunta.click();
  await expect(aviso).toHaveAttribute('aria-checked', 'false');
  await expect(pregunta).toHaveAttribute('aria-checked', 'false');

  // Persisten al recargar.
  await page.reload();
  const otra = await abrirCuenta(page);
  await expect(otra.getByRole('switch', { name: 'Aviso de ritmo de búsqueda' })).toHaveAttribute('aria-checked', 'false');
  await expect(otra.getByRole('switch', { name: 'Preguntarme si me postulé' })).toHaveAttribute('aria-checked', 'false');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Mi cuenta' })).toHaveCount(0);

});

test('descargar mis datos entrega un archivo con lo que tengo, y borrar pide confirmar escribiendo BORRAR', async ({ page, api }) => {
  await api.sembrarOfertas(OFERTAS);
  await page.goto('/ofertas');
  const cuenta = await abrirCuenta(page);

  const [descarga] = await Promise.all([page.waitForEvent('download'), cuenta.getByRole('button', { name: 'Descargar mis datos' }).click()]);
  expect(descarga.suggestedFilename()).toMatch(/^laburin-mis-datos-\d{4}-\d{2}-\d{2}\.json$/);
  const contenido = JSON.parse(readFileSync((await descarga.path())!, 'utf8'));
  expect(contenido.version).toBe(1);
  expect(contenido.ofertas.map((o: { rol: string }) => o.rol).sort()).toEqual(['QA Engineer', 'React Engineer']);
  expect(JSON.stringify(contenido)).not.toContain('"user_id"');
  await expect(cuenta.getByText('Listo: se descargó el archivo.')).toBeVisible();

  // Borrar: el botón definitivo queda bloqueado hasta escribir la palabra.
  await cuenta.getByRole('button', { name: 'Borrar mis ofertas y postulaciones' }).click();
  const definitivo = cuenta.getByRole('button', { name: 'Borrar definitivamente' });
  await expect(definitivo).toBeDisabled();
  await cuenta.getByLabel('Para confirmar, escribí BORRAR').fill('borra');
  await expect(definitivo).toBeDisabled();
  await cuenta.getByLabel('Para confirmar, escribí BORRAR').fill('BORRAR');
  await definitivo.click();
  await expect(cuenta.getByText('Listo: borramos tus ofertas y postulaciones.')).toBeVisible();

  const { count } = await api.sb.from('ofertas').select('id', { count: 'exact', head: true });
  expect(count).toBe(0);
});

test.describe('sin la sesión compartida', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('cerrar sesión en todos los dispositivos pide confirmación y vuelve al inicio', async ({ page }) => {
    // Cuenta propia: cerrar todas las sesiones no puede romper la sesión compartida de las demás specs.
    await registrarPorUI(page);
    await omitirOnboarding(page);
    const cuenta = await abrirCuenta(page);

    await cuenta.getByRole('button', { name: 'Cerrar sesión en todos los dispositivos' }).click();
    await cuenta.getByRole('button', { name: 'Cancelar' }).click();
    await expect(cuenta.getByRole('button', { name: 'Cerrar sesión en todos los dispositivos' })).toBeVisible();

    await cuenta.getByRole('button', { name: 'Cerrar sesión en todos los dispositivos' }).click();
    await cuenta.getByRole('button', { name: 'Sí, cerrar todas' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/ofertas');
    await expect(page).toHaveURL(/\/$/);
  });
});
