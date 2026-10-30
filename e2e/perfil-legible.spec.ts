import { expect, test } from './fixtures';

// Mi perfil de búsqueda a los anchos de una notebook y de una tablet: nada de texto diminuto, controles a la vista
// (sin esperar al mouse) y sin scroll horizontal. Antes las dos tarjetas de arriba quedaban apretadas a 1024 px.
test.skip(({ isMobile }) => isMobile, 'Los anchos de escritorio se prueban en el proyecto desktop');

for (const ancho of [1280, 1024, 853]) {
  test(`legible a ${ancho} px`, async ({ page }) => {
    await page.setViewportSize({ width: ancho, height: 900 });
    await page.goto('/mi-perfil');
    await expect(page.getByRole('heading', { name: '¿Qué estoy buscando?' })).toBeVisible();

    const chicos = await page.evaluate(() => {
      const main = document.getElementById('contenido')!;
      const resultado: string[] = [];
      for (const el of main.querySelectorAll<HTMLElement>('*')) {
        const tieneTexto = [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim().length > 0);
        if (!tieneTexto || el.getClientRects().length === 0) continue;
        const px = parseFloat(getComputedStyle(el).fontSize);
        if (px < 14) resultado.push(`${el.textContent!.trim().slice(0, 40)} (${px}px)`);
      }
      return resultado;
    });
    expect(chicos).toEqual([]);

    // El botón de borrar y el interruptor se ven sin pasar el mouse y miden al menos 44 px.
    const borrar = page.getByRole('button', { name: /^Eliminar criterio/ }).first();
    await expect(borrar).toBeVisible();
    expect(await borrar.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    const caja = (await borrar.boundingBox())!;
    expect(caja.width).toBeGreaterThanOrEqual(44);
    expect(caja.height).toBeGreaterThanOrEqual(44);

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(await page.evaluate(() => document.getElementById('contenido')!.scrollWidth <= document.getElementById('contenido')!.clientWidth)).toBe(true);
  });
}
