import { expect, test, type Page } from '@playwright/test';
import { cuentaAdministrador, type Cuenta } from './cuentas';
import { abrirMenuSiHaceFalta, cerrarMenuSiEstaAbierto, cerrarSesion, completarOnboarding, iniciarSesionPorUI, omitirOnboarding, registrarPorUI } from './ui';

// Flujo completo entre un candidato y el administrador. Los candidatos se crean en cada corrida y el teardown les borra
// los datos (y con ellos los mensajes); la cuenta de administrador de pruebas solo inicia sesión.
test.use({ storageState: { cookies: [], origins: [] } });

const unico = () => Math.floor(1000 + Math.random() * 8999);
const TEXTO_BIENVENIDA = 'Tu perfil quedó registrado y vamos a tener en cuenta tu solicitud.';

async function entrarComoAdministrador(page: Page) {
  await iniciarSesionPorUI(page, cuentaAdministrador());
  await expect(page).toHaveURL(/\/candidatos$/);
}

async function entrarComoCandidato(page: Page, cuenta: Cuenta) {
  await iniciarSesionPorUI(page, cuenta);
  await expect(page).toHaveURL(/\/mis-postulaciones$/);
}

async function irAMensajes(page: Page) {
  await abrirMenuSiHaceFalta(page);
  await page.getByRole('link', { name: /^Mensajes/ }).click();
  await expect(page.getByRole('heading', { name: 'Mensajes', level: 1 })).toBeVisible();
}

test('candidato se registra y recibe la bienvenida; el administrador lo ve, le escribe, y el candidato lo lee', async ({ page }) => {
  const nombre = `Candidata Prueba ${unico()}`;

  // --- El candidato se registra y completa el Onboarding ---
  const cuenta = await registrarPorUI(page);
  await completarOnboarding(page, nombre);
  await expect(page.getByText('Te dejamos un mensaje de bienvenida en Mensajes.')).toBeVisible();
  await page.getByRole('button', { name: 'Ir a Mis postulaciones' }).click();
  await expect(page).toHaveURL(/\/mis-postulaciones$/);

  // Menú de candidato (con Mensajes y un no leído) y sin acceso a Candidatos, ni escribiendo la URL.
  await abrirMenuSiHaceFalta(page);
  await expect(page.getByLabel('1 mensaje sin leer')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Candidatos', exact: true })).toHaveCount(0);
  for (const ruta of ['/candidatos', '/candidatos/00000000-0000-0000-0000-000000000000']) {
    await page.goto(ruta);
    await expect(page).toHaveURL(/\/mis-postulaciones$/);
  }

  // --- La bienvenida está en Mensajes, sin leer ---
  await irAMensajes(page);
  const bienvenida = page.getByRole('listitem').filter({ hasText: TEXTO_BIENVENIDA });
  await expect(bienvenida).toHaveAttribute('data-estado', 'no-leido');
  await expect(bienvenida.getByRole('heading', { name: 'Bienvenida a Laburin' })).toBeVisible();
  await cerrarSesion(page);

  // --- El administrador cae en Candidatos y ve solo lo que corresponde ---
  await entrarComoAdministrador(page);
  await abrirMenuSiHaceFalta(page);
  await expect(page.getByRole('link', { name: 'Candidatos', exact: true })).toBeVisible();
  // El texto bajo el logo es neutro para el administrador (no "busca empleo").
  await expect(page.getByText('Panel de administración')).toBeVisible();
  await expect(page.getByText('Tu búsqueda de empleo')).toHaveCount(0);
  for (const personal of ['Ofertas', 'Mis postulaciones', 'Mi progreso', 'Mi perfil de búsqueda', 'Mensajes']) {
    await expect(page.getByRole('link', { name: personal, exact: true })).toHaveCount(0);
  }
  for (const ruta of ['/ofertas', '/mis-postulaciones', '/mensajes']) {
    await page.goto(ruta);
    await expect(page).toHaveURL(/\/candidatos$/);
  }

  await page.getByLabel('Buscar candidatos').fill(nombre);
  const tarjeta = page.getByRole('link').filter({ hasText: nombre });
  await expect(tarjeta).toHaveCount(1);
  await expect(tarjeta).toContainText('QA Automation');
  await tarjeta.click();

  // --- Detalle: perfil de búsqueda y envío de un mensaje ---
  await expect(page.getByRole('heading', { name: nombre, level: 1 })).toBeVisible();
  await expect(page.getByText('Córdoba, Argentina').first()).toBeVisible();
  await expect(page.getByText('Todavía no le escribiste a esta persona.')).toBeVisible();

  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(page.getByText('Escribí el mensaje antes de enviarlo.')).toBeVisible();

  const texto = `Hola, nos falta tu nivel de experiencia (${unico()}).`;
  await page.getByLabel('Mensaje', { exact: true }).fill(texto);
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(page.getByText('Mensaje enviado.')).toBeVisible();
  const enviado = page.getByRole('listitem').filter({ hasText: texto });
  await expect(enviado).toContainText('Sin leer');
  await cerrarSesion(page);

  // --- El candidato lo ve como no leído y lo marca como leído ---
  await entrarComoCandidato(page, cuenta);
  await abrirMenuSiHaceFalta(page);
  await expect(page.getByLabel('2 mensajes sin leer')).toBeVisible();
  await irAMensajes(page);

  const delEquipo = page.getByRole('listitem').filter({ hasText: texto });
  await expect(delEquipo).toHaveAttribute('data-estado', 'no-leido');
  await expect(delEquipo.getByRole('heading', { name: 'Mensaje del equipo de Laburin' })).toBeVisible();
  await delEquipo.getByRole('button', { name: 'Marcar como leído' }).click();
  await expect(delEquipo).toHaveAttribute('data-estado', 'leido');
  await abrirMenuSiHaceFalta(page);
  await expect(page.getByLabel('1 mensaje sin leer')).toBeVisible();
  await cerrarMenuSiEstaAbierto(page);

  await page.getByRole('button', { name: 'Marcar todos como leídos' }).click();
  await expect(bienvenida).toHaveAttribute('data-estado', 'leido');
  await expect(page.getByLabel(/mensajes? sin leer/)).toHaveCount(0);
  await cerrarSesion(page);

  // --- El administrador ve que el mensaje se leyó ---
  await entrarComoAdministrador(page);
  await page.getByLabel('Buscar candidatos').fill(nombre);
  await page.getByRole('link').filter({ hasText: nombre }).click();
  await expect(page.getByRole('listitem').filter({ hasText: texto })).toContainText('Leído');
});

test('quien omitió el Onboarding no aparece en Candidatos y su bandeja vacía lo guía', async ({ page }) => {
  const nombre = `Omitida Prueba ${unico()}`;

  // Una persona que omite el Onboarding (sin rol buscado) pero que puso su nombre en Mi cuenta.
  await registrarPorUI(page);
  await omitirOnboarding(page);
  await abrirMenuSiHaceFalta(page);
  await page.getByRole('button', { name: 'Mi cuenta' }).click();
  await expect(page.getByText(/los puede ver el equipo de Laburin/)).toBeVisible();
  await page.getByLabel('Nombre para mostrar').fill(nombre);
  await page.getByRole('button', { name: 'Guardar nombre' }).click();
  await expect(page.getByText('Nombre guardado.')).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar', exact: true }).click();

  // No recibió bienvenida (no completó el perfil): su bandeja está vacía y la pantalla guía.
  await irAMensajes(page);
  await expect(page.getByText('Todavía no tenés mensajes.')).toBeVisible();
  await expect(page.getByText('Cuando el equipo de Laburin te escriba, lo vas a ver acá.')).toBeVisible();
  await cerrarSesion(page);

  await entrarComoAdministrador(page);
  await page.getByLabel('Buscar candidatos').fill(nombre);
  await expect(page.getByText(`Ningún candidato coincide con «${nombre}».`)).toBeVisible();
  await expect(page.getByRole('link').filter({ hasText: nombre })).toHaveCount(0);
  await page.getByRole('button', { name: 'Borrar la búsqueda' }).click();
  await expect(page.getByLabel('Buscar candidatos')).toHaveValue('');
});

test('plantillas de mensaje: se aplican con el nombre, se pueden deshacer y no se envían con datos sin completar', async ({ page }) => {
  const primerNombre = `Pruebita${unico()}`;
  const nombre = `${primerNombre} Ejemplo`;

  await registrarPorUI(page);
  await completarOnboarding(page, nombre);
  await page.getByRole('button', { name: 'Ir a Mis postulaciones' }).click();
  await expect(page).toHaveURL(/\/mis-postulaciones$/);
  await cerrarSesion(page);
  await entrarComoAdministrador(page);

  await page.getByLabel('Buscar candidatos').fill(nombre);
  await page.getByRole('link').filter({ hasText: nombre }).click();
  const area = page.getByLabel('Mensaje', { exact: true });
  const grupo = page.getByRole('group', { name: /Usar una plantilla/ });
  for (const titulo of ['Solicitud recibida', 'Falta un dato', 'Pedir la ubicación', 'Sumar tecnologías', 'Datos completos']) {
    await expect(grupo.getByRole('button', { name: titulo })).toBeVisible();
  }

  // La plantilla saluda por el primer nombre y trae el texto que pidió la docente.
  await grupo.getByRole('button', { name: 'Solicitud recibida' }).click();
  await expect(area).toHaveValue(new RegExp(`^Hola ${primerNombre}, tu perfil quedó registrado y vamos a tener en cuenta tu solicitud`));

  // Si ya había texto escrito, se puede volver atrás.
  await area.fill('borrador a mano');
  await grupo.getByRole('button', { name: 'Datos completos' }).click();
  await expect(area).toHaveValue(/gracias por completar tu perfil/);
  await page.getByRole('button', { name: 'Deshacer' }).click();
  await expect(area).toHaveValue('borrador a mano');

  // "Falta un dato" deja el campo pendiente seleccionado para escribir encima, y no se puede enviar sin completarlo.
  await grupo.getByRole('button', { name: 'Falta un dato' }).click();
  await expect(area).toHaveValue(/\[indicá cuál\]/);
  await expect
    .poll(() => area.evaluate((el: HTMLTextAreaElement) => el.value.slice(el.selectionStart, el.selectionEnd)))
    .toBe('[indicá cuál]');
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(page.getByText('Completá lo que está entre corchetes antes de enviar el mensaje.')).toBeVisible();
  await expect(page.getByText('Mensaje enviado.')).toHaveCount(0);

  // Completado el dato, se envía y queda en el historial.
  const completo = (await area.inputValue()).replace('[indicá cuál]', 'tu nivel de experiencia');
  await area.fill(completo);
  await page.getByRole('button', { name: 'Enviar mensaje' }).click();
  await expect(page.getByText('Mensaje enviado.')).toBeVisible();
  await expect(page.getByRole('listitem').filter({ hasText: 'tu nivel de experiencia' })).toContainText('Sin leer');
});
