import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import { abrirMenuSiHaceFalta } from './ui';

const DIA = 24 * 60 * 60 * 1000;
type Api = Parameters<Parameters<typeof test>[2]>[0]['api'];

// Siembra una postulación por cada «hace N días» (se le retrasa la fecha de creación sobre la propia fila, como el usuario).
async function sembrarMovimientos(api: Api, ...diasAtras: number[]) {
  await api.sembrarOfertas(diasAtras.map((_, i) => ({ empresa: `Empresa ${i + 1}`, rol: `Dev ${i + 1}`, stack_tecnologico: ['React'], puntaje_scoring: 25 })));
  const { data: ofertas } = await api.sb.from('ofertas').select('id').order('created_at').order('id');
  for (const [i, o] of ofertas!.entries()) {
    const id = await api.crearPostulacionDe(o.id);
    const { error } = await api.sb
      .from('postulaciones')
      .update({ created_at: new Date(Date.now() - diasAtras[i] * DIA).toISOString() })
      .eq('id', id);
    expect(error).toBeNull();
  }
}

const aviso = (page: Page) => page.getByRole('status', { name: 'Aviso de actividad' });

test('sin actividad hace más de 10 días: «¿Retomamos?», se puede cerrar y no vuelve enseguida', async ({ page, api }) => {
  await sembrarMovimientos(api, 14, 15, 16);
  await page.goto('/mis-postulaciones');

  await expect(aviso(page)).toContainText('¿Retomamos?');
  await expect(aviso(page)).toContainText('días que no registrás actividad');
  await expect(aviso(page).getByRole('link', { name: 'Buscar más ofertas' })).toBeVisible();
  // Ya no hay punto en el menú: el aviso vive solo en las dos pantallas.
  await expect(page.getByRole('img', { name: 'Hay un aviso de actividad' })).toHaveCount(0);

  // También aparece en Mi progreso, con el botón que lleva a las postulaciones.
  await page.goto('/mi-progreso');
  await expect(aviso(page).getByRole('link', { name: 'Ver Mis postulaciones' })).toBeVisible();

  await page.getByRole('button', { name: 'Cerrar el aviso' }).click();
  await expect(aviso(page)).toHaveCount(0);

  await page.goto('/mis-postulaciones');
  await expect(page.getByRole('heading', { name: 'Mis postulaciones', level: 1 })).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(aviso(page)).toHaveCount(0);
});

test('una semana más tranquila: avisa con buen tono si la anterior tuvo al menos 4 movimientos', async ({ page, api }) => {
  // Semana anterior (7 a 14 días atrás): 4 postulaciones. Esta semana: 1.
  await sembrarMovimientos(api, 11, 10, 9, 8, 1);
  await page.goto('/mis-postulaciones');

  await expect(aviso(page)).toContainText('Esta semana fue más tranquila');
  await expect(aviso(page)).toContainText('Hiciste 1 movimiento y la semana anterior 4.');
  await expect(aviso(page)).toContainText('Cuando quieras');
  await expect(aviso(page)).not.toContainText(/Vas muy bien|Bajó tu ritmo/);
});

test('con solo 3 movimientos la semana anterior no hay aviso: es poco para comparar', async ({ page, api }) => {
  await sembrarMovimientos(api, 10, 9, 8, 1);
  await page.goto('/mis-postulaciones');
  await expect(page.getByRole('heading', { name: 'Mis postulaciones', level: 1 })).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(aviso(page)).toHaveCount(0);
});

test('si la actividad sube, no hay felicitación ni aviso', async ({ page, api }) => {
  await sembrarMovimientos(api, 12, 11, 5, 4, 3, 2, 1);
  await page.goto('/mis-postulaciones');
  await expect(page.getByRole('heading', { name: 'Mis postulaciones', level: 1 })).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(aviso(page)).toHaveCount(0);
  await expect(page.getByText('Vas muy bien')).toHaveCount(0);
});

test('con el interruptor de Mi cuenta apagado, el aviso no aparece', async ({ page, api }) => {
  await sembrarMovimientos(api, 14, 15, 16);
  await page.goto('/mis-postulaciones');
  await expect(aviso(page)).toBeVisible();

  await abrirMenuSiHaceFalta(page);
  await page.getByRole('button', { name: 'Mi cuenta', exact: true }).click();
  await page.getByRole('switch', { name: 'Aviso de ritmo de búsqueda' }).click();
  await page.keyboard.press('Escape');
  await expect(aviso(page)).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mis postulaciones', level: 1 })).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(aviso(page)).toHaveCount(0);
});

test('el cálculo se hace solo al abrir Mis postulaciones y Mi progreso', async ({ page, api }) => {
  await sembrarMovimientos(api, 14, 15, 16);
  const lecturas: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/rest/v1/postulacion_historial_estados')) lecturas.push(new URL(r.url()).pathname + ' @' + new URL(page.url()).pathname);
  });

  await page.goto('/ofertas');
  await expect(page.getByRole('heading', { name: 'Ofertas', level: 1 })).toBeVisible();
  await page.waitForTimeout(1500);
  expect(lecturas).toEqual([]); // en Ofertas no se lee el historial para el aviso

  await page.goto('/mis-postulaciones');
  await expect(aviso(page)).toBeVisible();
  expect(lecturas.length).toBeGreaterThan(0);
});

test('con poca actividad (cuenta nueva) no hay aviso', async ({ page, api }) => {
  void api; // pedirlo deja la cuenta compartida sin datos de otros tests
  await page.goto('/mis-postulaciones');
  await expect(page.getByRole('heading', { name: 'Mis postulaciones', level: 1 })).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(aviso(page)).toHaveCount(0);
});
