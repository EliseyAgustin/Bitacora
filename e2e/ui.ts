import { expect, type Page, type TestInfo } from '@playwright/test';
import { crearApi, type Api } from './api';
import { registrarCuentaTemporal, emailNuevo, passwordDePrueba, type Cuenta } from './cuentas';

export const esMobile = (info: Pick<TestInfo, 'project'>) => info.project.name.includes('mobile');

// El campo "Contraseña" comparte <label> con el botón de mostrar/ocultar: se matchea por prefijo.
export const campoPassword = (page: Page) => page.getByLabel(/^Contraseña/);

export async function iniciarSesionPorUI(page: Page, { email, password }: Cuenta) {
  await page.goto('/');
  await page.getByLabel('Email').fill(email);
  await campoPassword(page).fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
}

export async function registrarPorUI(page: Page, cuenta?: Cuenta): Promise<Cuenta> {
  const datos = cuenta ?? { email: emailNuevo(), password: passwordDePrueba() };
  await page.goto('/');
  await page.getByRole('button', { name: '¿No tenés cuenta? Registrate' }).click();
  await page.getByLabel('Email').fill(datos.email);
  await campoPassword(page).fill(datos.password);
  await page.getByRole('button', { name: 'Registrarme' }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  registrarCuentaTemporal(datos);
  return datos;
}

export async function omitirOnboarding(page: Page) {
  await page.getByRole('button', { name: 'Omitir por ahora' }).click();
  await expect(page).toHaveURL(/\/mis-postulaciones$/);
}

// En mobile el menú lateral está cerrado: hay que abrirlo antes de usar la navegación o "Mi cuenta".
export async function abrirMenuSiHaceFalta(page: Page) {
  // Con el menú ya abierto (mobile) el botón sigue en pantalla pero tapado por el menú: no hay que volver a tocarlo.
  if ((await page.locator('aside.translate-x-0').count()) > 0) return;
  // Desde 768 px el menú es fijo y no hay botón. En pantallas más angostas el botón aparece apenas se pinta el layout:
  // se lo espera (click espera solo) en lugar de mirar una sola vez, que fallaba si el layout todavía no se había montado.
  const ancho = page.viewportSize()?.width ?? 1280;
  if (ancho >= 768) return;
  await page.getByRole('button', { name: 'Abrir menú' }).click();
}

// En mobile, con el menú abierto el contenido queda tapado: se cierra antes de seguir usando la pantalla.
export async function cerrarMenuSiEstaAbierto(page: Page) {
  if ((await page.locator('aside.translate-x-0').count()) === 0) return;
  await page.getByRole('button', { name: 'Cerrar menú' }).click();
  await expect(page.locator('aside.translate-x-0')).toHaveCount(0);
}

export async function irA(page: Page, seccion: 'Ofertas' | 'Mis postulaciones' | 'Mi progreso' | 'Mi perfil de búsqueda') {
  await abrirMenuSiHaceFalta(page);
  await page.getByRole('link', { name: seccion, exact: true }).click();
}

export async function conApiDe(cuenta: Cuenta): Promise<Api> {
  return crearApi(cuenta);
}

export function aceptarDialogos(page: Page) {
  page.on('dialog', (dialog) => dialog.accept());
}

export async function cerrarSesion(page: Page) {
  await abrirMenuSiHaceFalta(page);
  await page.getByRole('button', { name: 'Cerrar Sesión' }).click();
  await expect(page.getByRole('button', { name: 'Ingresar' })).toBeVisible();
}

// Recorre los 5 pasos del Onboarding con datos mínimos y llega a la pantalla "Tu perfil quedó listo".
export async function completarOnboarding(page: Page, nombre: string) {
  const continuar = page.getByRole('button', { name: 'Continuar' });
  await page.getByLabel('¿Cómo te llamás?').fill(nombre);
  await page.getByLabel('Rol que buscás').fill('QA Automation');
  await continuar.click();
  await page.getByRole('button', { name: 'SQL', exact: true }).click();
  await continuar.click();
  await page.getByRole('button', { name: 'Remoto', exact: true }).click();
  await page.getByPlaceholder('Ej: Buenos Aires, Argentina').fill('Córdoba, Argentina');
  await continuar.click();
  await continuar.click(); // nivel de experiencia: opcional
  await page.getByRole('button', { name: 'Confirmar y terminar' }).click();
  await expect(page.getByRole('heading', { name: 'Tu perfil quedó listo' })).toBeVisible();
}
