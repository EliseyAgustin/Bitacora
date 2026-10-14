import { expect, test, type Page } from '@playwright/test';
import { cuentaAdministrador } from './cuentas';
import { arbeitnow, mockearFuentes, remotive } from './mocks';
import { abrirMenuSiHaceFalta, cerrarSesion, iniciarSesionPorUI, registrarPorUI } from './ui';

// Prueba de XSS (inyección de código en la página) con navegador real. Lo que se carga como dato (nombre, rol, ubicación,
// tecnologías, texto de un mensaje, ofertas importadas) tiene que verse como texto y nunca ejecutarse.
// El caso más delicado es el almacenado: lo que escribe un candidato lo ve después el administrador.
// Cada carga intenta marcar window.__pwned; si alguna se ejecuta, la prueba falla.
test.use({ storageState: { cookies: [], origins: [] } });

const unico = () => Math.floor(1000 + Math.random() * 8999);
const IMG = '<img src=x onerror="window.__pwned=1">';
const SVG = '"><svg onload=window.__pwned=1>';
const SCRIPT = '<script>window.__pwned=1</script>';
const TECNOLOGIA = '<img src=x onerror=window.__pwned=1>'; // entra en los 50 caracteres que acepta el campo

async function sinEjecucion(page: Page, donde: string) {
  expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned), `${donde}: se ejecutó código inyectado`).toBeUndefined();
}

test('el código inyectado en datos del candidato, mensajes y ofertas se muestra como texto y no se ejecuta', async ({ page }) => {
  const id = unico();
  const nombre = `${IMG} ${id}`;
  const rol = `${SCRIPT} ${id}`;
  const ubicacion = `${SVG} ${id}`;

  // Cualquier cuadro de diálogo (alert, confirm, prompt) significaría que se ejecutó algo.
  page.on('dialog', async (dialogo) => {
    await dialogo.dismiss();
    throw new Error(`Se abrió un diálogo inesperado: ${dialogo.message()}`);
  });
  await page.addInitScript(() => {
    (window as unknown as { __pwned?: number }).__pwned = undefined;
  });

  // --- El candidato carga los datos maliciosos por la propia configuración inicial ---
  const cuenta = await registrarPorUI(page);
  const continuar = page.getByRole('button', { name: 'Continuar' });
  await page.getByLabel('¿Cómo te llamás?').fill(nombre);
  await page.getByLabel('Rol que buscás').fill(rol);
  await continuar.click();
  await page.getByLabel('Otra tecnología').fill(TECNOLOGIA);
  await page.getByRole('button', { name: 'Agregar' }).click();
  await continuar.click();
  await page.getByRole('button', { name: 'Remoto', exact: true }).click();
  await page.getByPlaceholder('Ej: Buenos Aires, Argentina').fill(ubicacion);
  await continuar.click();
  await continuar.click();
  await expect(page.getByLabel('Tu nombre')).toHaveValue(nombre);
  await page.getByRole('button', { name: 'Confirmar y terminar' }).click();
  await expect(page.getByRole('heading', { name: 'Tu perfil quedó listo' })).toBeVisible();
  await sinEjecucion(page, 'configuración inicial');
  await page.getByRole('button', { name: 'Ir a Mis postulaciones' }).click();

  // --- Sus propias pantallas: Mi perfil de búsqueda y Mi cuenta ---
  await abrirMenuSiHaceFalta(page);
  await page.getByRole('link', { name: 'Mi perfil de búsqueda', exact: true }).click();
  await expect(page.getByText(TECNOLOGIA, { exact: true })).toBeVisible(); // se ve como texto, no como imagen
  await sinEjecucion(page, 'Mi perfil de búsqueda');
  await abrirMenuSiHaceFalta(page);
  await page.getByRole('button', { name: 'Mi cuenta' }).click();
  await expect(page.getByLabel('Nombre para mostrar')).toHaveValue(nombre);
  await sinEjecucion(page, 'Mi cuenta');
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();

  // --- Ofertas importadas con cargas maliciosas en título, empresa y ubicación ---
  await mockearFuentes(page, [remotive(`${IMG} Empresa ${id}`, `${SCRIPT} Puesto ${id}`, `${SVG} ${id}`, ['React'])], [arbeitnow('Kappa GmbH', 'QA Analyst', 'Berlin', ['Selenium'])]);
  await abrirMenuSiHaceFalta(page);
  await page.getByRole('link', { name: 'Ofertas', exact: true }).click();
  await page.getByRole('button', { name: 'Importar ofertas remotas' }).first().click();
  await expect(page.getByText('2 ofertas nuevas importadas')).toBeVisible();
  await expect(page.getByRole('heading', { level: 3 }).filter({ hasText: `Puesto ${id}` })).toContainText('<script>window.__pwned=1</script>');
  await sinEjecucion(page, 'Ofertas importadas');
  await cerrarSesion(page);

  // --- El administrador ve los datos del candidato: acá se jugaría el XSS almacenado ---
  await iniciarSesionPorUI(page, cuentaAdministrador());
  await expect(page).toHaveURL(/\/candidatos$/);
  await page.getByLabel('Buscar candidatos').fill(String(id));
  const tarjeta = page.getByRole('link').filter({ hasText: String(id) });
  await expect(tarjeta).toHaveCount(1);
  await expect(tarjeta).toContainText('<img src=x onerror="window.__pwned=1">'); // el texto literal, visible
  await expect(tarjeta).toContainText('<script>window.__pwned=1</script>');
  await expect(tarjeta.locator('img[src="x"]')).toHaveCount(0); // y ninguna imagen inyectada
  await sinEjecucion(page, 'listado de Candidatos');
  await tarjeta.click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('<img src=x');
  await sinEjecucion(page, 'detalle del candidato');

  // --- El administrador le escribe un mensaje con código: el candidato lo ve como texto ---
  const mensaje = `${IMG} ${SVG} ${SCRIPT} ${id}`;
  await page.getByLabel('Mensaje', { exact: true }).fill(mensaje);
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(page.getByText('Mensaje enviado.')).toBeVisible();
  await sinEjecucion(page, 'historial de mensajes enviados');
  await cerrarSesion(page);

  await iniciarSesionPorUI(page, cuenta);
  await expect(page).toHaveURL(/\/mis-postulaciones$/);
  await abrirMenuSiHaceFalta(page);
  await page.getByRole('link', { name: /^Mensajes/ }).click();
  const recibido = page.getByRole('listitem').filter({ hasText: String(id) });
  await expect(recibido).toContainText('<script>window.__pwned=1</script>');
  await expect(recibido.locator('img[src="x"], svg')).toHaveCount(0);
  await sinEjecucion(page, 'Mensajes del candidato');
});
