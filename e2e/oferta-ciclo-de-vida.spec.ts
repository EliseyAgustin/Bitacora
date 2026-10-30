import { expect, test } from './fixtures';
import { aceptarDialogos, esMobile, irA } from './ui';

const ROL = 'Frontend Developer';
const RECORRIDO = [
  { label: 'Aplicado', estado: 'aplicado' },
  { label: 'En proceso', estado: 'en_proceso' },
  { label: 'Entrevista', estado: 'entrevista' },
  { label: 'Oferta', estado: 'oferta' },
  { label: 'Rechazado', estado: 'rechazado' },
];

test('ciclo de vida de una oferta: crear, score, postular, mover por las 6 columnas, ficha y persistencia', async ({
  page,
  api,
}, testInfo) => {
  aceptarDialogos(page);

  // --- Crear manualmente ---
  await page.goto('/ofertas');
  await page.getByRole('button', { name: 'Nueva oferta' }).click();
  const formulario = page.getByRole('dialog', { name: 'Nueva oferta' });
  await formulario.getByLabel('Empresa *').fill('Acme Labs');
  await formulario.getByLabel('Rol *').fill(ROL);
  await formulario.getByLabel('Ubicación').fill('Rosario, Argentina');
  await formulario.getByLabel('Modalidad').selectOption('remoto');
  await formulario.getByPlaceholder(/React, SQL/).fill('React');
  await formulario.getByPlaceholder(/React, SQL/).press('Enter');
  // "react " (minúscula, con espacio) no agrega un segundo tag igual al primero.
  // (el placeholder desaparece con el primer tag: el campo de stack es el último textbox del formulario)
  const campoStack = formulario.getByRole('textbox').last();
  await campoStack.fill(' react ');
  await campoStack.press('Enter');
  await expect(formulario.getByRole('button', { name: /^Quitar/ })).toHaveCount(1);
  await formulario.getByRole('button', { name: 'Crear oferta' }).click();
  await expect(formulario).toHaveCount(0);

  // --- Score: React (15) + remoto (10) con los criterios base ---
  await expect(page.getByRole('heading', { name: ROL, level: 3 })).toBeVisible();
  // La tarjeta lee el puntaje como «25 puntos» (el «puntos» es solo para lectores de pantalla).
  await expect(page.getByRole('article').filter({ has: page.getByRole('heading', { name: ROL }) }).getByText('25 puntos')).toBeVisible();
  await expect(page.getByText('1 oferta', { exact: true })).toBeVisible();

  // --- Postularme ---
  await page.getByRole('button', { name: 'Postularme' }).click();
  await expect(page.getByRole('button', { name: 'Por aplicar' })).toBeVisible();

  // --- Tablero: moverla por las 6 columnas ---
  await irA(page, 'Mis postulaciones');
  const tarjeta = page.getByRole('heading', { name: ROL, level: 4 });
  await expect(tarjeta).toBeVisible();
  // HALLAZGO H-1 (ver tanda 5): un refetch inicial tardío pisa el primer movimiento. Acá se espera a que
  // termine la carga para no mezclar ese bug con el resto del ciclo; tablero-carrera.spec.ts lo cubre aparte.
  await page.waitForLoadState('networkidle');

  const encabezado = (label: string) =>
    page.locator('div').filter({ has: page.getByRole('heading', { name: label, level: 3, exact: true }) }).last();
  const estadoEnBase = async () => {
    const { data } = await api.sb.from('postulaciones').select('estado').single();
    return data?.estado;
  };

  await expect(encabezado('Por aplicar')).toContainText('1');

  for (const { label, estado } of RECORRIDO) {
    if (esMobile(testInfo)) {
      // Sin drag táctil: el selector "Mover a..." de la tarjeta.
      await page.getByLabel(`Mover "${ROL}" a otro estado`).selectOption({ label });
    } else {
      // Drag-and-drop nativo real: arrastrar la tarjeta sobre el encabezado de la columna destino.
      // A 1280 px solo entran ~3 de las 6 columnas: se desplaza el tablero para que origen y destino queden a la vista.
      await encabezado(label).scrollIntoViewIfNeeded();
      await tarjeta.dragTo(encabezado(label));
    }
    await expect.poll(estadoEnBase).toBe(estado);
    await expect(encabezado(label)).toContainText('1');
  }

  // --- Ficha: agregar y borrar interacciones ---
  await tarjeta.click();
  await expect(page.getByRole('heading', { name: ROL, level: 2 })).toBeVisible();
  await expect(page.getByLabel('Estado de la postulación')).toHaveValue('rechazado');

  await page.getByRole('button', { name: 'Agregar interacción' }).click();
  await page.getByLabel('Tipo').selectOption('nota');
  await page.getByLabel('Notas').fill('Mandé el CV por mail a RRHH');
  await page.getByRole('button', { name: 'Guardar' }).click();
  // Se espera a que la interacción esté en la línea de tiempo (no solo el texto escrito en el formulario).
  const eliminarInteraccion = page.getByRole('button', { name: 'Eliminar interacción' });
  await expect(eliminarInteraccion).toHaveCount(1);
  await expect(page.getByText('Mandé el CV por mail a RRHH')).toBeVisible();

  await page.getByRole('button', { name: 'Agregar interacción' }).click();
  await page.getByLabel('Tipo').selectOption('llamada');
  await page.getByLabel('Notas').fill('Llamada con la recruiter');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(eliminarInteraccion).toHaveCount(2);
  await expect(page.getByText('Llamada con la recruiter')).toBeVisible();

  const borrado = page.waitForResponse((r) => r.request().method() === 'DELETE' && r.url().includes('/interacciones'));
  await eliminarInteraccion.first().click();
  expect((await borrado).status()).toBe(204);
  await expect(eliminarInteraccion).toHaveCount(1);

  // --- Recargar: todo persiste ---
  await page.reload();
  await expect(encabezado('Rechazado')).toContainText('1');
  await page.getByRole('heading', { name: ROL, level: 4 }).click();
  await expect(page.getByLabel('Estado de la postulación')).toHaveValue('rechazado');
  await expect(page.getByRole('button', { name: 'Eliminar interacción' })).toHaveCount(1);

  const { data: interacciones } = await api.sb.from('interacciones').select('tipo, notas');
  expect(interacciones).toHaveLength(1);
  const { data: historial } = await api.sb
    .from('postulacion_historial_estados')
    .select('estado_nuevo')
    .order('fecha');
  expect(historial?.map((h) => h.estado_nuevo)).toEqual([
    'por_aplicar',
    'aplicado',
    'en_proceso',
    'entrevista',
    'oferta',
    'rechazado',
  ]);
});
