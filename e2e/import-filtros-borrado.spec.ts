import { expect, test } from './fixtures';
import { arbeitnow, mockearFuentes, remotive } from './mocks';

// Con Remotive, Arbeitnow y RemoteOK interceptados: se prueba la lógica de Laburin, no la disponibilidad de terceros.
// Scores con los criterios base: React +15 y remoto +10 (todo lo importado es remoto).
const REMOTIVE = [
  remotive('Nubia Labs', 'React Engineer', 'Argentina', ['React']), // 25
  remotive('Nubia Labs', 'QA Analyst', 'Argentina', ['Selenium']), // 10
  remotive('Orbita Soft', 'Frontend Dev', 'Worldwide', ['React']), // 25
  remotive('Orbita Soft', 'Backend Dev', 'Argentina', ['Go']), // 10
  remotive('Plano Digital', 'React Native Dev', 'Argentina and LATAM', ['React']), // 25
];
const ARBEITNOW = [
  arbeitnow('Kappa GmbH', 'Data Engineer', 'Berlin', ['Python']),
  arbeitnow('Kappa GmbH', 'React Dev', 'Berlin', ['React']),
  arbeitnow('Lumen AG', 'DevOps', 'Munich', ['AWS']),
];

test('importar remotas, filtrar combinado y borrar exactamente lo seleccionado', async ({ page, api }) => {
  await mockearFuentes(page, REMOTIVE, ARBEITNOW);
  await page.goto('/ofertas');

  // --- Importar ---
  await page.getByRole('button', { name: 'Importar ofertas remotas' }).first().click(); // el estado vacío repite el botón
  await expect(page.getByText('8 ofertas nuevas importadas')).toBeVisible();
  await expect(page.getByText('8 ofertas', { exact: true })).toBeVisible();

  // --- Reimportar: todo se omite por duplicado ---
  await page.getByRole('button', { name: 'Importar ofertas remotas' }).first().click(); // el estado vacío repite el botón
  await expect(page.getByText('0 ofertas nuevas importadas · 8 duplicadas omitidas')).toBeVisible();
  expect(await api.contarOfertas()).toBe(8);

  // --- Filtros combinados: fuente + ubicación + score mínimo ---
  await page.getByLabel('Fuente').selectOption('Remotive');
  await page.getByLabel('Ubicación').fill('argentina');
  await page.getByRole('slider').fill('20');
  await page.getByRole('button', { name: 'Aplicar' }).click();

  await expect(page.getByText('2 ofertas', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'React Engineer', level: 3 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'React Native Dev', level: 3 })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(2);

  // --- Seleccionar todas (2) y borrar ---
  await page.getByRole('checkbox', { name: 'Seleccionar todas (2)' }).check();
  await page.getByRole('button', { name: 'Eliminar seleccionadas (2)' }).click();
  const dialogo = page.getByRole('alertdialog');
  await expect(dialogo.getByRole('heading', { name: 'Eliminar 2 ofertas' })).toBeVisible();
  await dialogo.getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page.getByText('2 ofertas eliminadas')).toBeVisible();

  // --- Se borró exactamente eso, y nada más ---
  const { data } = await api.sb.from('ofertas').select('rol').order('rol');
  expect(data?.map((o) => o.rol)).toEqual(
    ['QA Analyst', 'Frontend Dev', 'Backend Dev', 'Data Engineer', 'React Dev', 'DevOps'].sort()
  );
});

test('la selección masiva respeta los filtros: no toca lo que quedó afuera', async ({ page, api }) => {
  await mockearFuentes(page, REMOTIVE, ARBEITNOW);
  await page.goto('/ofertas');
  await page.getByRole('button', { name: 'Importar ofertas remotas' }).first().click(); // el estado vacío repite el botón
  await expect(page.getByText('8 ofertas nuevas importadas')).toBeVisible();

  await page.getByLabel('Fuente').selectOption('Arbeitnow');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.getByText('3 ofertas', { exact: true })).toBeVisible();

  await page.getByRole('checkbox', { name: 'Seleccionar todas (3)' }).check();
  await expect(page.getByText('3 seleccionadas')).toBeVisible();
  await page.getByRole('button', { name: 'Eliminar seleccionadas (3)' }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(page.getByText('3 ofertas eliminadas')).toBeVisible();

  const { data } = await api.sb.from('ofertas').select('fuente');
  expect(data).toHaveLength(5);
  expect(new Set(data?.map((o) => o.fuente))).toEqual(new Set(['Remotive']));
});
