import { expect, test } from './fixtures';
import { mockearFuentes, remotive } from './mocks';
import type { OfertaFila } from './api';

// 1100 ofertas sembradas con el cliente autenticado (RLS). i = 0 es la más nueva; las 100 últimas (i >= 1000)
// quedan más allá de la fila 1000 y tienen una ubicación propia para poder filtrarlas.
const TOTAL = 1100;
const POR_PAGINA = 30;
const ULTIMA_PAGINA = Math.ceil(TOTAL / POR_PAGINA); // 37

function filas(): OfertaFila[] {
  const base = Date.now() - 24 * 60 * 60 * 1000;
  return Array.from({ length: TOTAL }, (_, i) => {
    const react = i % 2 === 0;
    return {
      empresa: `Seed Co ${i}`,
      rol: `Seed Role ${i}`,
      ubicacion: i >= 1000 ? 'Cordoba Vieja' : 'Remoto LATAM',
      modalidad: 'remoto' as const,
      stack_tecnologico: react ? ['React'] : [],
      fuente: i % 2 === 1 ? 'Remotive' : 'Arbeitnow',
      puntaje_scoring: react ? 25 : 10, // consistente con los criterios base: React 15 + remoto 10
      created_at: new Date(base - i * 1000).toISOString(),
    };
  });
}

test.describe('más de 1000 ofertas', () => {
  test.setTimeout(240_000);

  test.beforeEach(async ({ api }) => {
    await api.sembrarOfertas(filas());
    expect(await api.contarOfertas()).toBe(TOTAL);
  });

  test('se puede paginar hasta el final y filtrar más allá de la fila 1000, con contador total correcto', async ({ page }) => {
    await page.goto('/ofertas');
    await expect(page.getByText(`${TOTAL} ofertas · Página 1 de ${ULTIMA_PAGINA}`)).toBeVisible();
    await expect(page.getByRole('heading', { level: 3 })).toHaveCount(POR_PAGINA);

    // Recorrer todas las páginas con "Siguiente".
    const siguiente = page.getByRole('button', { name: 'Siguiente' });
    for (let pagina = 2; pagina <= ULTIMA_PAGINA; pagina++) {
      await siguiente.click();
      await expect(page.getByText(`Página ${pagina} de ${ULTIMA_PAGINA}`)).toBeVisible();
    }
    await expect(page.getByRole('heading', { level: 3 })).toHaveCount(TOTAL - (ULTIMA_PAGINA - 1) * POR_PAGINA);
    await expect(page.getByRole('heading', { name: 'Seed Role 1099', level: 3 })).toBeVisible();
    await expect(siguiente).toBeDisabled();

    // Filtrar por una ubicación que solo tienen las ofertas pasadas la fila 1000.
    await page.getByLabel('Ubicación').fill('Cordoba Vieja');
    await page.getByRole('button', { name: 'Aplicar' }).click();
    await expect(page.getByText('100 ofertas · Página 1 de 4')).toBeVisible();
  });

  test('"Seleccionar las N que coinciden" y el borrado masivo actúan exactamente sobre lo que dicen', async ({ page, api }) => {
    await page.goto('/ofertas');
    await page.getByLabel('Ubicación').fill('Cordoba Vieja');
    await page.getByRole('button', { name: 'Aplicar' }).click();
    await expect(page.getByText('100 ofertas · Página 1 de 4')).toBeVisible();

    await page.getByRole('checkbox', { name: `Seleccionar esta página (${POR_PAGINA})` }).check();
    await expect(page.getByText(`${POR_PAGINA} seleccionadas`)).toBeVisible();
    await page.getByRole('button', { name: 'Seleccionar las 100 ofertas que coinciden con los filtros' }).click();
    await expect(page.getByText('100 seleccionadas')).toBeVisible();

    await page.getByRole('button', { name: 'Eliminar seleccionadas (100)' }).click();
    await page.getByRole('alertdialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
    await expect(page.getByText('100 ofertas eliminadas')).toBeVisible();

    expect(await api.contarOfertas()).toBe(TOTAL - 100);
    const { count } = await api.sb
      .from('ofertas')
      .select('id', { count: 'exact', head: true })
      .eq('ubicacion', 'Cordoba Vieja');
    expect(count).toBe(0);
    await expect(page.getByText(/Ninguna oferta coincide/)).toBeVisible();
  });

  test('el import deduplica contra ofertas viejas más allá de la fila 1000', async ({ page, api }) => {
    // "Seed Co 1099" / "Seed Role 1099" es la oferta más vieja (fila 1100) y es de Remotive.
    await mockearFuentes(
      page,
      [
        remotive('Seed Co 1099', 'Seed Role 1099', 'Argentina', ['React']),
        remotive('Empresa Nueva', 'Rol Nuevo', 'Argentina', []),
      ],
      []
    );
    await page.goto('/ofertas');
    await page.getByRole('button', { name: 'Importar ofertas remotas' }).first().click(); // el estado vacío repite el botón
    await expect(page.getByText('1 oferta nueva importada · 1 duplicada omitida')).toBeVisible();

    expect(await api.contarOfertas()).toBe(TOTAL + 1);
    const { count } = await api.sb
      .from('ofertas')
      .select('id', { count: 'exact', head: true })
      .eq('empresa', 'Seed Co 1099');
    expect(count).toBe(1);
  });

  test('Analytics cuenta las 1100 ofertas y el score promedio es coherente', async ({ page }) => {
    await page.goto('/mi-progreso');
    // La tarjeta KPI es el div más interno que contiene el título y el párrafo de detalle.
    const tarjeta = (titulo: string) =>
      page
        .locator('div')
        .filter({ has: page.getByText(titulo, { exact: true }) })
        .filter({ has: page.locator('p') })
        .last();

    await expect(tarjeta('Ofertas guardadas')).toContainText(String(TOTAL));
    // 550 ofertas con 25 y 550 con 10 => promedio 17.5
    await expect(tarjeta('Qué tanto encajan tus ofertas')).toContainText('17.5');
  });

  test('cambiar un peso recalcula los scores de todas las ofertas, también las pasadas la fila 1000', async ({ page, api }) => {
    await page.goto('/mi-perfil');
    const pesoReact = page.getByRole('spinbutton', { name: 'Peso de React' });
    await expect(pesoReact).toHaveValue('15');
    await pesoReact.fill('20');
    await pesoReact.press('Tab');

    const conteoDeScore = async (puntaje: number) => {
      const { count } = await api.sb
        .from('ofertas')
        .select('id', { count: 'exact', head: true })
        .eq('puntaje_scoring', puntaje);
      return count;
    };
    // React pasa de 25 a 30 (20 + 10): las 550 con React. Las otras 550 siguen en 10.
    await expect.poll(() => conteoDeScore(30), { timeout: 150_000, intervals: [2_000] }).toBe(550);
    expect(await conteoDeScore(25)).toBe(0);
    expect(await conteoDeScore(10)).toBe(550);

    // Una oferta puntual de la cola (fila 1100, con React, i par => 1098) también se recalculó.
    const { data } = await api.sb.from('ofertas').select('puntaje_scoring').eq('rol', 'Seed Role 1098').single();
    expect(Number(data?.puntaje_scoring)).toBe(30);

    await page.goto('/mi-progreso');
    const tarjeta = page
      .locator('div')
      .filter({ has: page.getByText('Qué tanto encajan tus ofertas', { exact: true }) })
      .filter({ has: page.locator('p') })
      .last();
    await expect(tarjeta).toContainText('20.0'); // (550*30 + 550*10) / 1100
  });
});
