import { expect, test } from './fixtures';
import { arbeitnow, mockearFuentes, remoteok, remotive } from './mocks';
import { MARCA } from '../src/lib/marca';

// Detalle de una oferta: un clic en la tarjeta abre un panel con el puntaje explicado, la descripción y el enlace para
// postularse en el sitio de origen. Con los criterios base de la cuenta compartida (React 15 + remoto 10) el máximo es 25.
const URL_ORIGEN = 'https://remotive.com/remote-jobs/software-dev/react-engineer-1';
const OFERTA = {
  empresa: 'Nubia Labs',
  rol: 'React Engineer',
  ubicacion: 'Argentina',
  modalidad: 'remoto' as const,
  stack_tecnologico: ['React', 'TypeScript'],
  fuente: 'Remotive',
  url: URL_ORIGEN,
  descripcion: 'Buscamos una persona para sumarse al equipo de producto.\n\n• Experiencia con React\n• Buena comunicación',
  puntaje_scoring: 25,
};

const panel = (page: import('@playwright/test').Page, rol = 'React Engineer') => page.getByRole('dialog', { name: rol });

test('un clic en la tarjeta abre el detalle: puntaje explicado, descripción y enlace al sitio de origen', async ({ page, api }) => {
  await api.sembrarOfertas([OFERTA]);
  await page.goto('/ofertas');

  await page.getByText('Nubia Labs', { exact: true }).click();
  const detalle = panel(page);
  await expect(detalle).toBeVisible();
  await expect(detalle.getByText('Fuente: Remotive')).toBeVisible();

  // Por qué tiene ese puntaje: un resumen y cada criterio activo, si coincide y cuánto suma.
  await expect(detalle.getByText('Coincide con 2 de 2 criterios de tu perfil.')).toBeVisible();
  await expect(detalle.getByText('Suma los pesos de tu perfil que esta oferta cumple, sobre un máximo posible de 25 puntos.')).toBeVisible();
  await expect(detalle.getByRole('listitem').filter({ hasText: 'Stack: React' })).toContainText('Coincide · suma 15');
  await expect(detalle.getByRole('listitem').filter({ hasText: 'Modalidad: remoto' })).toContainText('Coincide · suma 10');

  // La descripción es texto plano.
  await expect(detalle.getByText('Buscamos una persona para sumarse al equipo de producto.')).toBeVisible();
  await expect(detalle.getByText('• Experiencia con React')).toBeVisible();

  // El enlace abre el sitio de origen en otra pestaña, sin darle acceso a la ventana de la aplicación.
  const enlace = detalle.getByRole('link', { name: /Ver oferta y postularme/ });
  await expect(enlace).toHaveAttribute('href', URL_ORIGEN);
  await expect(enlace).toHaveAttribute('target', '_blank');
  await expect(enlace).toHaveAttribute('rel', /noopener/);
  await expect(enlace).toHaveAttribute('rel', /noreferrer/);

  await page.route('https://remotive.com/remote-jobs/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<html><body>Sitio de origen</body></html>' })
  );
  const [origen] = await Promise.all([page.waitForEvent('popup'), enlace.click()]);
  await origen.waitForLoadState();
  expect(origen.url()).toBe(URL_ORIGEN);
  expect(await origen.evaluate(() => window.opener)).toBeNull();
});

test('Escape cierra el detalle y el foco vuelve a la tarjeta', async ({ page, api }) => {
  await api.sembrarOfertas([OFERTA]);
  await page.goto('/ofertas');

  const titulo = page.getByRole('button', { name: 'React Engineer', exact: true });
  await titulo.focus();
  await titulo.press('Enter');
  await expect(panel(page)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cerrar detalle de la oferta' })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(panel(page)).toHaveCount(0);
  await expect(titulo).toBeFocused();
});

test('guardar desde el detalle crea la postulación y el panel pasa a mostrar su estado', async ({ page, api }) => {
  await api.sembrarOfertas([OFERTA]);
  await page.goto('/ofertas');

  await page.getByRole('button', { name: 'Ver detalle de React Engineer en Nubia Labs' }).click();
  await panel(page).getByRole('button', { name: 'Guardar para después' }).click();
  const verFicha = panel(page).getByRole('button', { name: /En seguimiento: Por aplicar · Ver ficha/ });
  await expect(verFicha).toBeVisible();

  await verFicha.click();
  await expect(panel(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cerrar ficha' })).toBeVisible();
  // La tarjeta de la lista ahora muestra el estado en lugar de "Postularme".
  await expect(page.getByRole('button', { name: 'Por aplicar', exact: true })).toBeVisible();
});

test('una oferta sin enlace lo avisa y deja agregarlo desde Editar, validando que sea una dirección web', async ({ page, api }) => {
  await api.sembrarOfertas([{ ...OFERTA, url: null, descripcion: null, fuente: 'Carga manual' }]);
  await page.goto('/ofertas');

  await page.getByText('Nubia Labs', { exact: true }).click();
  const detalle = panel(page);
  await expect(detalle.getByRole('link', { name: /Ver oferta y postularme/ })).toHaveCount(0);
  await expect(detalle.getByText('Esta oferta no tiene enlace para postularse.')).toBeVisible();
  await expect(detalle.getByText(/Esta oferta no tiene descripción guardada/)).toBeVisible();

  await detalle.getByRole('button', { name: 'Agregar enlace' }).click();
  await expect(panel(page)).toHaveCount(0);
  const enlace = page.getByLabel('Enlace a la oferta');

  await enlace.fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText(/El enlace tiene que empezar con http:\/\/ o https:\/\//)).toBeVisible();

  await enlace.fill('https://empresa.com/empleos/123');
  await page.getByLabel('Descripción').fill('Una descripción cargada a mano.');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByRole('dialog', { name: 'Editar oferta' })).toHaveCount(0);

  await page.getByText('Nubia Labs', { exact: true }).click();
  await expect(panel(page).getByRole('link', { name: /Ver oferta y postularme/ })).toHaveAttribute('href', 'https://empresa.com/empleos/123');
  await expect(panel(page).getByText('Una descripción cargada a mano.')).toBeVisible();
});

test(`"Buscar en LinkedIn" abre la búsqueda con los datos del perfil, en otra pestaña y sin acceso a ${MARCA.nombre}`, async ({ page, api }) => {
  await api.sb
    .from('perfil_usuario')
    .update({ rol_buscado: 'Frontend Developer', ubicacion: 'Buenos Aires, Argentina', modalidad_preferida: 'remoto' })
    .eq('user_id', api.userId);
  await api.sembrarOfertas([OFERTA]);
  await page.goto('/ofertas');

  const boton = page.getByRole('link', { name: /Buscar en LinkedIn/ });
  const href = (await boton.getAttribute('href')) ?? '';
  const url = new URL(href);
  expect(url.origin + url.pathname).toBe('https://www.linkedin.com/jobs/search/');
  expect(Object.fromEntries(url.searchParams)).toEqual({ keywords: 'Frontend Developer', location: 'Buenos Aires, Argentina', f_WT: '2' });
  await expect(boton).toHaveAttribute('target', '_blank');
  await expect(boton).toHaveAttribute('rel', /noopener/);

  // Y dice, con los datos del perfil, qué búsqueda va a abrir.
  const frase = page.getByText('Abre LinkedIn con una búsqueda de «Frontend Developer» en Buenos Aires, Argentina, remoto. Se abre en otra pestaña.');
  await expect(frase).toBeVisible();
  await expect(boton).toHaveAttribute('aria-describedby', (await frase.getAttribute('id')) ?? '');
});

test('la tarjeta muestra hasta cinco tecnologías y cuenta el resto', async ({ page, api }) => {
  await api.sembrarOfertas([{ ...OFERTA, stack_tecnologico: ['React', 'TypeScript', 'Node.js', 'SQL', 'Docker', 'AWS', 'Redis'] }]);
  await page.goto('/ofertas');
  const tecnologias = page.getByRole('list', { name: 'Tecnologías de la oferta' });
  await expect(tecnologias.getByRole('listitem')).toHaveCount(6); // cinco tecnologías y el «+2»
  await expect(tecnologias.getByText('+2')).toBeVisible();
  await expect(tecnologias.getByText('AWS')).toHaveCount(0);

  // El detalle sí las muestra todas.
  await page.getByText('Nubia Labs', { exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'React Engineer' }).getByText('Redis')).toBeVisible();
});

test('sin datos en el perfil no se ofrece la búsqueda en LinkedIn', async ({ page, api }) => {
  await api.sembrarOfertas([OFERTA]);
  await page.goto('/ofertas');
  await expect(page.getByRole('heading', { name: 'React Engineer', level: 3 })).toBeVisible();
  await expect(page.getByRole('link', { name: /Buscar en LinkedIn/ })).toHaveCount(0);
});

test('al importar se guarda el enlace de cada fuente y las ofertas ya guardadas sin enlace lo reciben', async ({ page, api }) => {
  // Una oferta importada antes de que se guardara el enlace.
  await api.sembrarOfertas([{ empresa: 'Vieja SA', rol: 'Dev Antiguo', fuente: 'Remotive', puntaje_scoring: 0 }]);
  await mockearFuentes(
    page,
    [
      remotive('Vieja SA', 'Dev Antiguo', 'Worldwide', ['React'], { url: 'https://remotive.com/remote-jobs/vieja-1', description: '<p>Descripción <b>actualizada</b></p>' }),
      remotive('Nueva SA', 'Dev Nuevo', 'LATAM', ['React'], { url: 'https://remotive.com/remote-jobs/nueva-2', description: '<p>Hola</p>' }),
    ],
    [arbeitnow('Berlin GmbH', 'QA Berlin', 'Berlin', ['Selenium'], { url: 'https://www.arbeitnow.com/jobs/berlin-3' })],
    [remoteok('Ok Inc', 'SRE Ok', 'Worldwide', ['aws'], { url: 'https://remoteOK.com/remote-jobs/ok-4', description: '<p>Infra</p>' })]
  );
  await page.goto('/ofertas');
  await page.getByRole('button', { name: 'Importar ofertas remotas' }).first().click();
  await expect(page.getByText('3 ofertas nuevas importadas · 1 duplicada omitida · 1 con enlace agregado')).toBeVisible();

  const { data } = await api.sb.from('ofertas').select('rol, fuente, url, descripcion').order('rol');
  const porRol = Object.fromEntries((data ?? []).map((o) => [o.rol, o]));
  expect(porRol['Dev Antiguo']).toMatchObject({ url: 'https://remotive.com/remote-jobs/vieja-1', descripcion: 'Descripción actualizada' });
  expect(porRol['Dev Nuevo'].url).toBe('https://remotive.com/remote-jobs/nueva-2');
  expect(porRol['QA Berlin'].url).toBe('https://www.arbeitnow.com/jobs/berlin-3');
  expect(porRol['SRE Ok']).toMatchObject({ fuente: 'RemoteOK', url: 'https://remoteok.com/remote-jobs/ok-4', descripcion: 'Infra' });

  await page.getByText('Ok Inc', { exact: true }).click();
  await expect(panel(page, 'SRE Ok').getByText('Fuente: RemoteOK')).toBeVisible();
  await expect(panel(page, 'SRE Ok').getByRole('link', { name: /Ver oferta y postularme/ })).toHaveAttribute('href', 'https://remoteok.com/remote-jobs/ok-4');
});

test('un enlace o una descripción maliciosos de una fuente externa no se abren ni se ejecutan', async ({ page, api }) => {
  page.on('dialog', async (dialogo) => {
    await dialogo.dismiss();
  });
  await mockearFuentes(
    page,
    [
      remotive('Mala SA', 'Puesto Malo', 'Worldwide', ['React'], {
        url: 'javascript:window.__pwned=1',
        description: '<img src=x onerror="window.__pwned=1"><script>window.__pwned=1</script><a href="javascript:window.__pwned=1">Postulate</a>Texto visible',
      }),
    ],
    []
  );
  await page.goto('/ofertas');
  await page.getByRole('button', { name: 'Importar ofertas remotas' }).first().click();
  await expect(page.getByText('1 oferta nueva importada')).toBeVisible();

  const { data } = await api.sb.from('ofertas').select('url, descripcion').eq('rol', 'Puesto Malo').single();
  expect(data?.url).toBeNull(); // el enlace peligroso ni siquiera se guarda
  expect(data?.descripcion).toBe('PostulateTexto visible');

  await page.getByText('Mala SA', { exact: true }).click();
  const detalle = panel(page, 'Puesto Malo');
  await expect(detalle.getByText('PostulateTexto visible')).toBeVisible();
  await expect(detalle.locator('img, script, a[href^="javascript"]')).toHaveCount(0);
  await expect(detalle.getByRole('link', { name: /Ver oferta y postularme/ })).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
});
