import { expect, test } from './fixtures';
import { omitirOnboarding, registrarPorUI } from './ui';

// Con los criterios base de la cuenta compartida (React 15 + remoto 10) el máximo posible es 25.
const OFERTAS = [
  { empresa: 'Nubia Labs', rol: 'React Engineer', ubicacion: 'Argentina', stack_tecnologico: ['React'], puntaje_scoring: 25 },
  { empresa: 'Orbita Soft', rol: 'Backend Dev', ubicacion: 'Worldwide', stack_tecnologico: ['Go'], puntaje_scoring: 10 },
  { empresa: 'Plano Digital', rol: 'QA Analyst', ubicacion: 'argentina', stack_tecnologico: ['Selenium'], puntaje_scoring: 10 },
];

test('"Puntaje mínimo": explica qué es, su tope es el máximo del perfil y filtra', async ({ page, api }) => {
  await api.sembrarOfertas(OFERTAS);
  await page.goto('/ofertas');

  await expect(page.getByText('Puntaje mínimo', { exact: true })).toBeVisible();
  await expect(page.getByText(/score/i)).toHaveCount(0);
  await expect(page.getByText(/Muestra solo las ofertas con este puntaje o más/)).toBeVisible();

  // Tope = suma de los pesos activos del perfil: 15 + 10.
  const control = page.getByRole('slider');
  await expect(page.getByText('Máximo posible con tu perfil: 25 puntos')).toBeVisible();
  await expect(control).toHaveAttribute('max', '25');

  await control.fill('25');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.getByRole('heading', { name: 'React Engineer', level: 3 })).toBeVisible();
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(1);

  // Sumar un criterio de 20 puntos sube el tope a 45.
  const { error } = await api.sb
    .from('criterios_scoring')
    .insert({
      user_id: api.userId,
      nombre: 'Stack: Docker',
      campo_objetivo: 'stack_tecnologico',
      valor_comparacion: 'Docker',
      tipo_coincidencia: 'contiene',
      peso: 20,
    });
  expect(error).toBeNull();
  await page.reload();
  await expect(page.getByText('Máximo posible con tu perfil: 45 puntos')).toBeVisible();
  await expect(control).toHaveAttribute('max', '45');

  // Sin criterios no hay máximo que calcular: escala de 100.
  await api.sb.from('criterios_scoring').delete().eq('user_id', api.userId);
  await page.reload();
  await expect(page.getByText('Máximo posible con tu perfil: 100 puntos')).toBeVisible();
  await expect(control).toHaveAttribute('max', '100');
});

test('Ubicación: explica qué escribir, sugiere las que hay y, sin resultados, ayuda a aflojar el filtro', async ({ page, api }) => {
  await api.sembrarOfertas(OFERTAS);
  await page.goto('/ofertas');
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3);

  const ubicacion = page.getByLabel('Ubicación');
  await expect(ubicacion).toHaveAttribute('placeholder', 'Ej: Argentina, Madrid');
  await expect(page.getByText(/Escribí una ciudad o un país/)).toBeVisible();
  await expect(page.getByText(/«Remoto» o «Worldwide»/)).toBeVisible();

  // Sugerencias: las ubicaciones de las ofertas cargadas, sin repetir "Argentina" y "argentina".
  const sugeridas = await page.locator('#ubicaciones-sugeridas option').evaluateAll((opciones) =>
    opciones.map((o) => (o as HTMLOptionElement).value.toLowerCase()).sort()
  );
  expect(sugeridas).toEqual(['argentina', 'worldwide']);

  // "CABA" no figura en ninguna: el mensaje sugiere aflojar un filtro y el botón los limpia.
  await ubicacion.fill('CABA');
  await page.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page.getByText('Ninguna oferta coincide con los filtros aplicados.')).toBeVisible();
  await expect(page.getByText(/Probá aflojar un filtro/)).toBeVisible();
  // Con un filtro aplicado, la tarjeta ofrece también "Quitar filtros" (y sin filtros no aparece).
  await expect(page.getByRole('button', { name: 'Quitar filtros', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Quitar todos los filtros' }).click();
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3);
  await expect(ubicacion).toHaveValue('');
  await expect(page.getByRole('button', { name: 'Quitar filtros', exact: true })).toHaveCount(0);
});

test.describe('Sin perfil de búsqueda (el usuario omitió el Onboarding)', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('"Primeros pasos" destaca el paso 1 y Ofertas avisa; al armar el perfil desaparece el aviso', async ({ page }) => {
    await registrarPorUI(page);
    await omitirOnboarding(page);

    // Primeros pasos: el paso 1 queda pendiente y destacado.
    const paso1 = page.getByRole('listitem').filter({ hasText: 'Revisá tu perfil de búsqueda' });
    await expect(paso1).toHaveAttribute('data-estado', 'pendiente');
    await expect(paso1.getByText('Pendiente')).toBeVisible();

    // Ofertas: aviso corto con botón a Mi perfil de búsqueda.
    await page.goto('/ofertas');
    await expect(
      page.getByText('Todavía no armaste tu perfil de búsqueda. Completalo para ver qué ofertas te convienen más.')
    ).toBeVisible();
    await expect(page.getByText('Máximo posible con tu perfil: 100 puntos')).toBeVisible();
    await page.getByRole('link', { name: 'Completar mi perfil de búsqueda' }).click();
    await expect(page).toHaveURL(/\/mi-perfil$/);

    // Con una tecnología cargada el perfil existe: el aviso se va y el paso 1 figura hecho.
    await page.getByPlaceholder('Ej: React, Python, SQL').fill('React');
    await page.getByRole('button', { name: 'Agregar tecnología' }).click();
    await expect(page.getByText('React', { exact: true })).toBeVisible();

    await page.goto('/ofertas');
    await expect(page.getByText('Máximo posible con tu perfil: 15 puntos')).toBeVisible();
    await expect(page.getByText(/Todavía no armaste tu perfil de búsqueda/)).toHaveCount(0);
    await page.goto('/mis-postulaciones');
    await expect(page.getByRole('listitem').filter({ hasText: 'Revisá tu perfil de búsqueda' })).toHaveAttribute(
      'data-estado',
      'hecho'
    );
  });
});

test('la tarjeta de filtros se acomoda en pantallas angostas: sin desborde y con controles táctiles', async ({ page, api }) => {
  await api.sembrarOfertas(OFERTAS);
  await page.goto('/ofertas');
  await expect(page.getByRole('heading', { level: 3 })).toHaveCount(3);

  for (const ancho of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width: ancho, height: 800 });
    const tarjeta = page.locator('form', { has: page.locator('#filtro-ubicacion') });
    await expect(tarjeta).toBeVisible();

    const caja = (await tarjeta.boundingBox())!;
    // La tarjeta no se sale de la pantalla ni tiene scroll horizontal propio.
    expect(caja.x, `${ancho}px: la tarjeta empieza dentro de la pantalla`).toBeGreaterThanOrEqual(0);
    expect(caja.x + caja.width, `${ancho}px: la tarjeta termina dentro de la pantalla`).toBeLessThanOrEqual(ancho + 0.5);
    expect(await tarjeta.evaluate((el) => el.scrollWidth <= el.clientWidth), `${ancho}px: sin scroll horizontal`).toBe(true);

    // Cada control queda completo dentro de la tarjeta.
    const controles = ['#filtro-fuente', '#filtro-ubicacion', '#filtro-score'];
    const cajas = [];
    for (const selector of controles) {
      const c = (await page.locator(selector).boundingBox())!;
      cajas.push(c);
      expect(c.x, `${ancho}px ${selector}: borde izquierdo`).toBeGreaterThanOrEqual(caja.x);
      expect(c.x + c.width, `${ancho}px ${selector}: borde derecho`).toBeLessThanOrEqual(caja.x + caja.width + 0.5);
    }
    const aplicar = (await page.getByRole('button', { name: 'Aplicar' }).boundingBox())!;
    expect(aplicar.x + aplicar.width, `${ancho}px Aplicar: borde derecho`).toBeLessThanOrEqual(caja.x + caja.width + 0.5);

    if (ancho < 768) {
      // En mobile: un control debajo del otro, a todo el ancho, y con al menos 44 px de alto para el dedo.
      expect(cajas[1].y, `${ancho}px: Ubicación va debajo de Fuente`).toBeGreaterThan(cajas[0].y + cajas[0].height - 1);
      expect(cajas[1].width, `${ancho}px: Ubicación ocupa todo el ancho`).toBeGreaterThan(caja.width * 0.85);
      expect(cajas[0].height, `${ancho}px: Fuente con altura táctil`).toBeGreaterThanOrEqual(44);
      expect(cajas[1].height, `${ancho}px: Ubicación con altura táctil`).toBeGreaterThanOrEqual(44);
      expect(aplicar.height, `${ancho}px: Aplicar con altura táctil`).toBeGreaterThanOrEqual(44);
    }
  }
});
