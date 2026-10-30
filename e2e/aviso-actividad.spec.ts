import { expect, test } from './fixtures';

const DIA = 24 * 60 * 60 * 1000;

// Tres movimientos de hace dos semanas y nada desde entonces: hay un ritmo que medir y ya pasaron más de 10 días sin actividad.
async function sembrarActividadVieja(api: Parameters<Parameters<typeof test>[2]>[0]['api']) {
  await api.sembrarOfertas(
    ['Ana', 'Beto', 'Cora'].map((n) => ({ empresa: `${n} SA`, rol: `Dev ${n}`, stack_tecnologico: ['React'], puntaje_scoring: 25 }))
  );
  const { data: ofertas } = await api.sb.from('ofertas').select('id');
  for (const [i, o] of ofertas!.entries()) {
    const id = await api.crearPostulacionDe(o.id);
    const { error } = await api.sb
      .from('postulaciones')
      .update({ created_at: new Date(Date.now() - (14 + i) * DIA).toISOString() })
      .eq('id', id);
    expect(error).toBeNull();
  }
}

test('sin actividad hace más de 10 días: el aviso invita a retomar, se puede cerrar y no vuelve enseguida', async ({ page, api }) => {
  await sembrarActividadVieja(api);
  await page.goto('/mis-postulaciones');

  const aviso = page.getByRole('status', { name: 'Aviso de actividad' });
  await expect(aviso).toContainText('¿Retomamos?');
  await expect(aviso).toContainText('días que no registrás actividad');
  await expect(aviso.getByRole('link', { name: 'Buscar más ofertas' })).toBeVisible();
  // El menú marca la sección con un punto discreto.
  await expect(page.getByRole('img', { name: 'Hay un aviso de actividad' })).toBeVisible();

  // También aparece en Mi progreso, con el botón que lleva a las postulaciones.
  await page.goto('/mi-progreso');
  await expect(page.getByRole('status', { name: 'Aviso de actividad' }).getByRole('link', { name: 'Ver Mis postulaciones' })).toBeVisible();

  await page.getByRole('button', { name: 'Cerrar el aviso' }).click();
  await expect(aviso).toHaveCount(0);
  await expect(page.getByRole('img', { name: 'Hay un aviso de actividad' })).toHaveCount(0);

  await page.goto('/mis-postulaciones');
  await expect(page.getByRole('heading', { name: 'Mis postulaciones', level: 1 })).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(aviso).toHaveCount(0);
});

test('con poca actividad (cuenta nueva) no hay aviso', async ({ page, api }) => {
  void api; // pedirlo deja la cuenta compartida sin datos de otros tests
  await page.goto('/mis-postulaciones');
  await expect(page.getByRole('heading', { name: 'Mis postulaciones', level: 1 })).toBeVisible();
  await page.waitForTimeout(1500);
  await expect(page.getByRole('status', { name: 'Aviso de actividad' })).toHaveCount(0);
});
