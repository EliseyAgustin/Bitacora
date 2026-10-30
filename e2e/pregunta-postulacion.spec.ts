import { expect, test } from './fixtures';

// Flujo «¿Ya te postulaste?»: Laburín no ve el sitio de la empresa. Al abrir el enlace de una oferta recuerda la oferta y,
// al volver, pregunta. «Sí» la deja en Aplicado; «Todavía no» no la guarda y pospone la pregunta.
const OFERTA = {
  empresa: 'Nubia Labs',
  rol: 'React Engineer',
  ubicacion: 'Argentina',
  modalidad: 'remoto' as const,
  stack_tecnologico: ['React'],
  fuente: 'Remotive',
  url: 'https://remotive.com/remote-jobs/software-dev/react-engineer-1',
  puntaje_scoring: 25,
};

async function abrirEnlaceDeLaOferta(page: import('@playwright/test').Page) {
  await page.route('https://remotive.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>Sitio de origen</body></html>' })
  );
  await page.goto('/ofertas');
  await page.getByText('Nubia Labs', { exact: true }).click();
  const enlace = page.getByRole('dialog', { name: 'React Engineer' }).getByRole('link', { name: /Ver oferta y postularme/ });
  const [origen] = await Promise.all([page.waitForEvent('popup'), enlace.click()]);
  await origen.close();
}

test('al volver de la oferta pregunta si te postulaste y «Sí, ya apliqué» la deja en Aplicado', async ({ page, api }) => {
  await api.sembrarOfertas([OFERTA]);
  await abrirEnlaceDeLaOferta(page);

  const pregunta = page.getByRole('region', { name: 'Confirmar postulación' });
  await expect(pregunta).toContainText('¿Ya te postulaste a React Engineer?');
  await pregunta.getByRole('button', { name: 'Sí, ya apliqué' }).click();
  await expect(pregunta).toHaveCount(0);

  await expect.poll(async () => (await api.sb.from('postulaciones').select('estado').single()).data?.estado).toBe('aplicado');
});

test('«Todavía no» no crea la postulación y no vuelve a preguntar enseguida', async ({ page, api }) => {
  await api.sembrarOfertas([OFERTA]);
  await abrirEnlaceDeLaOferta(page);

  const pregunta = page.getByRole('region', { name: 'Confirmar postulación' });
  await pregunta.getByRole('button', { name: 'Todavía no' }).click();
  await expect(pregunta).toHaveCount(0);

  await page.reload();
  await page.waitForTimeout(3500);
  await expect(pregunta).toHaveCount(0);
  const { data } = await api.sb.from('postulaciones').select('id');
  expect(data).toHaveLength(0);
});
